"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, MapPin, CheckCircle2, XCircle, Loader2, Building2, AlertOctagon, ScanFace, Play, SquareSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getNearbyProjectAndFaceData, processFaceAttendance } from '@/lib/action/attendanceActions';

interface FaceIDCheckInProps {
    supervisorId?: string;
    onScanSuccess?: () => void;
}

export default function FaceIDCheckIn({ supervisorId, onScanSuccess }: FaceIDCheckInProps) {
    const videoRef = useRef<HTMLVideoElement>(null);

    const isProcessingRef = useRef(false);

    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
    const [isScanningStatus, setIsScanningStatus] = useState(false);
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [cameraError, setCameraError] = useState<boolean>(false);
    const [isCameraActive, setIsCameraActive] = useState(false);

    // ✅ STATE MỚI: Tạm ngưng AI sau khi có kết quả và trạng thái Dừng thủ công
    const [isPaused, setIsPaused] = useState(false);
    const [isStopped, setIsStopped] = useState(false);

    const [activeProject, setActiveProject] = useState<{ id: string, name: string, distance: number } | null>(null);
    const [statusMsg, setStatusMsg] = useState("Đang định vị GPS...");
    const [scanResult, setScanResult] = useState<{ name: string, code: string, message: string, type: 'CHECK_IN' | 'CHECK_OUT' | 'ERROR' } | null>(null);

    const startVideo = () => {
        setCameraError(false);
        setIsCameraActive(false);
        setIsStopped(false);

        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => {
                setCameraError(true);
                toast.error("Không thể mở Camera. Vui lòng kiểm tra quyền truy cập.");
            });
    };

    // 1. Tự động Khởi tạo hệ thống
    useEffect(() => {
        let isMounted = true;

        const initSystem = async () => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    if (!isMounted) return;
                    setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
                    setStatusMsg("Đang quét dự án trong bán kính 50m...");

                    const res = await getNearbyProjectAndFaceData(pos.coords.latitude, pos.coords.longitude);
                    if (!isMounted) return;

                    if (!res.success || !res.project) {
                        toast.error(res.error);
                        setStatusMsg(res.error || "Không tìm thấy dự án hợp lệ.");
                        return;
                    }

                    setActiveProject(res.project);
                    setStatusMsg("Đã thấy dự án! Đang tải AI Model...");

                    try {
                        await Promise.all([
                            faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                            faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                            faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                        ]);

                        if (!isMounted) return;
                        setIsModelLoaded(true);

                        if (res.members && res.members.length > 0) {
                            const labeledDescriptors = res.members.map((member: any) => {
                                const floatArray = new Float32Array(member.descriptor);
                                return new faceapi.LabeledFaceDescriptors(`${member.id}|${member.code}|${member.name}`, [floatArray]);
                            });
                            setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.55));
                            setStatusMsg("Sẵn sàng quét tự động!");

                            startVideo();
                        } else {
                            setStatusMsg("Dự án chưa có data khuôn mặt.");
                        }
                    } catch (err) {
                        if (isMounted) setStatusMsg("Lỗi tải tệp tin AI Model.");
                    }
                },
                () => { if (isMounted) setStatusMsg("Lỗi GPS: Bị từ chối quyền."); },
                { enableHighAccuracy: true }
            );
        };
        initSystem();

        return () => {
            isMounted = false;
            if (videoRef.current?.srcObject) {
                (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 2. VÒNG LẶP QUÉT TỰ ĐỘNG (DỪNG KHI isPaused = true)
    const stopCamera = () => {
        setIsCameraActive(false);
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    };
    useEffect(() => {
        let scanInterval: NodeJS.Timeout;

        // ✅ Chỉ chạy Interval khi Camera đang bật, AI sẵn sàng và KHÔNG BỊ TẠM NGƯNG
        if (isCameraActive && faceMatcher && activeProject && location && !isPaused && !isStopped) {
            scanInterval = setInterval(async () => {
                if (isProcessingRef.current || !videoRef.current) return;

                try {
                    const detection = await faceapi.detectSingleFace(videoRef.current).withFaceLandmarks().withFaceDescriptor();

                    if (detection) {
                        isProcessingRef.current = true;
                        setIsScanningStatus(true);

                        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

                        if (bestMatch.label === 'unknown') {
                            toast.error("⚠️ KHÔNG KHỚP: Nhân công lạ hoặc góc sáng xấu!");
                            // Tự động nhả luồng sau 2.5s nếu quét xịt để quét tiếp (Không hiện nút bấm)
                            setTimeout(() => {
                                isProcessingRef.current = false;
                                setIsScanningStatus(false);
                            }, 2500);
                        } else {
                            const [id, code, name] = bestMatch.label.split('|');

                            // GỌI API CHẤM CÔNG VÀO/RA CA
                            const res = await processFaceAttendance(id, activeProject.id, location, supervisorId);

                            if (res.success) {
                                setScanResult({ name, code, message: res.message!, type: res.type as any });

                                // ✅ THÊM DÒNG NÀY: Báo cho Component cha biết để load lại bảng
                                if (onScanSuccess) onScanSuccess();

                            } else {
                                setScanResult({ name, code, message: res.error!, type: 'ERROR' });
                            }

                            // ✅ TẠM NGƯNG AI (Đợi người dùng bấm nút)
                            setIsPaused(true);
                            stopCamera();
                        }
                    }
                } catch (error) {
                    console.error("Lỗi Auto-scan:", error);
                }
            }, 1000);
        }

        // Cleanup function tự dọn dẹp interval khi state thay đổi
        return () => { if (scanInterval) clearInterval(scanInterval); };
    }, [isCameraActive, faceMatcher, activeProject, location, supervisorId, isPaused, isStopped]);

    // ✅ CÁC HÀM XỬ LÝ NÚT BẤM SAU KHI QUÉT XONG
    const handleContinue = () => {
        setScanResult(null);
        setIsPaused(false); // Mở khóa vòng lặp AI
        isProcessingRef.current = false;
        setIsScanningStatus(false);
        startVideo();
    };

    const handleStop = () => {
        handleContinue();
        setIsStopped(true); // Ghi nhận trạng thái dừng thủ công
        setIsCameraActive(false);
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
            stopCamera();
        }
    };

    return (
        <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl max-w-md mx-auto">
            {/* Thông tin Dự án */}
            <div className={`w-full p-3 rounded-lg border mb-4 flex items-start gap-3 ${activeProject ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-100 border-slate-200'}`}>
                <div className={`p-2 rounded-full ${activeProject ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-200 text-slate-500'}`}>
                    <Building2 className="w-5 h-5" />
                </div>
                <div>
                    <p className={`text-xs font-semibold uppercase ${activeProject ? 'text-indigo-500' : 'text-slate-500'}`}>Khu vực thi công</p>
                    {activeProject ? (
                        <h4 className="font-bold text-indigo-900 text-sm leading-tight">{activeProject.name}</h4>
                    ) : (
                        <p className="text-sm font-medium text-slate-600 mt-1">{statusMsg}</p>
                    )}
                </div>
            </div>

            {/* Trạng thái hệ thống */}
            <div className="flex w-full justify-between mb-3 text-xs font-semibold px-2">
                <span className={`flex items-center ${isModelLoaded ? 'text-green-600' : 'text-slate-400'}`}>
                    {isModelLoaded ? <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> : <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                    AI Model
                </span>
                <span className={`flex items-center ${activeProject ? 'text-green-600' : 'text-slate-400'}`}>
                    {activeProject ? <MapPin className="w-3.5 h-3.5 mr-1" /> : <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />}
                    GPS
                </span>
            </div>

            {/* Khung Camera */}
            <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-4 shadow-xl border-[5px] border-slate-800">
                {!isCameraActive && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center text-slate-400 p-6 text-center bg-slate-900">
                        <ScanFace className="w-16 h-16 mb-4 opacity-50" />

                        {/* Xử lý UI linh hoạt khi Camera tắt */}
                        {!activeProject ? (
                            <p className="text-sm text-red-400 opacity-80">Camera bị khóa vì không tìm thấy dự án gần đây.</p>
                        ) : !isModelLoaded ? (
                            <p className="text-sm opacity-60 flex items-center animate-pulse">Đang tải AI...</p>
                        ) : cameraError ? (
                            <div className="space-y-3">
                                <p className="text-sm text-orange-400">Không có quyền truy cập máy ảnh!</p>
                                <Button onClick={startVideo} variant="secondary" size="sm">Thử lại</Button>
                            </div>
                        ) : isStopped ? (
                            <div className="space-y-4">
                                <p className="text-sm text-slate-300">Camera đã được tạm dừng.</p>
                                <Button onClick={startVideo} className="bg-indigo-600 hover:bg-indigo-700">Mở lại Camera</Button>
                            </div>
                        ) : (
                            <p className="text-sm opacity-60 flex items-center animate-pulse">Khởi động Camera...</p>
                        )}
                    </div>
                )}

                <video
                    ref={videoRef} autoPlay muted playsInline
                    onPlaying={() => setIsCameraActive(true)}
                    className={`object-cover w-full h-full transform scale-x-[-1] transition-opacity duration-300 ${isPaused ? 'opacity-50 grayscale' : 'opacity-100'}`}
                />

                {/* Lưới Quét */}
                {isCameraActive && !isPaused && (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center">
                        <div className={`w-2/3 aspect-square border-[3px] border-dashed rounded-full transition-colors duration-300 ${isScanningStatus ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.5)]' : 'border-white/30'}`}></div>
                        {!scanResult && !isScanningStatus && (
                            <p className="absolute bottom-10 bg-black/50 text-white/80 text-xs px-4 py-1.5 rounded-full backdrop-blur-sm">
                                Đưa khuôn mặt vào khung viền
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* ✅ VÙNG HIỂN THỊ KẾT QUẢ & NÚT BẤM */}
            <div className="min-h-[140px] w-full flex flex-col justify-end">
                {isScanningStatus && !scanResult && (
                    <div className="flex items-center justify-center h-[90px] text-indigo-600 font-semibold bg-indigo-50 rounded-xl animate-in zoom-in-95">
                        <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang nhận diện và chấm công...
                    </div>
                )}

                {scanResult && (
                    <div className={`flex flex-col w-full p-4 rounded-xl border animate-in slide-in-from-bottom-4 shadow-sm ${scanResult.type === 'CHECK_IN' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
                            scanResult.type === 'CHECK_OUT' ? 'bg-blue-50 border-blue-200 text-blue-800' :
                                'bg-red-50 border-red-200 text-red-800'
                        }`}>
                        <div className="mb-3">
                            <p className="text-[11px] font-bold uppercase tracking-widest opacity-70 mb-0.5">{scanResult.type === 'ERROR' ? 'THẤT BẠI' : scanResult.type}</p>
                            <p className="font-bold text-lg leading-tight truncate">{scanResult.name}</p>
                            <p className="text-sm opacity-90 mt-1 line-clamp-2">{scanResult.message}</p>
                        </div>

                        {/* HAI NÚT HÀNH ĐỘNG */}
                        <div className="flex gap-2 mt-auto">
                            <Button onClick={handleContinue} className={`flex-1 h-11 shadow-sm ${scanResult.type === 'CHECK_IN' ? 'bg-emerald-600 hover:bg-emerald-700 text-white' :
                                    scanResult.type === 'CHECK_OUT' ? 'bg-blue-600 hover:bg-blue-700 text-white' :
                                        'bg-red-600 hover:bg-red-700 text-white'
                                }`}>
                                <Play className="w-4 h-4 mr-2" /> Tiếp tục quét
                            </Button>
                            <Button onClick={handleStop} variant="outline" className={`flex-1 h-11 bg-white hover:bg-slate-50 ${scanResult.type === 'CHECK_IN' ? 'border-emerald-200 text-emerald-700' :
                                    scanResult.type === 'CHECK_OUT' ? 'border-blue-200 text-blue-700' :
                                        'border-red-200 text-red-700'
                                }`}>
                                <SquareSquare className="w-4 h-4 mr-2" /> Dừng
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}