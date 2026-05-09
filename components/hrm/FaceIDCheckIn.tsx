"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { CheckCircle2, XCircle, Loader2, Play, Users, UserSquare, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { getNearbyProjectAndFaceData, processFaceAttendance } from '@/lib/action/attendanceActions';

interface FaceIDCheckInProps {
    userRole?: string;
    onScanSuccess?: () => void;
    onClose?: () => void;
}

type ScanMode = "self" | "proxy";

export default function FaceIDCheckIn({ userRole = 'staff', onScanSuccess, onClose }: FaceIDCheckInProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isProcessingRef = useRef(false);

    const [mode, setMode] = useState<ScanMode>("self");
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [cameraError, setCameraError] = useState<boolean>(false);
    const [isScanningStatus, setIsScanningStatus] = useState(false);

    // Giao diện và Phân quyền động
    const [isProxyAuthorized, setIsProxyAuthorized] = useState(false); // ✅ Đã thêm State mở khóa Tab
    const [detectedLocationName, setDetectedLocationName] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [instruction, setInstruction] = useState("Đang tìm khuôn mặt...");
    const [scanProgress, setScanProgress] = useState(0);
    const [scanResult, setScanResult] = useState<{ success: boolean, type?: string, message: string, name?: string } | null>(null);

    // =======================================================================
    // 0. HÀM QUẢN LÝ PHẦN CỨNG CAMERA
    // =======================================================================
    const stopCamera = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsScanningStatus(false);
    };

    const startCamera = async (currentMode: ScanMode) => {
        try {
            setCameraError(false);
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                toast.error("Trình duyệt chặn Camera.");
                setCameraError(true);
                return;
            }

            const stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: currentMode === "self" ? "user" : "environment",
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                }
            });

            streamRef.current = stream;

            if (!videoRef.current) await new Promise(resolve => setTimeout(resolve, 300));
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsScanningStatus(true); // Bật cờ cho phép AI quét
            }

        } catch (err) {
            console.error("Camera Error:", err);
            setCameraError(true);
            toast.error("Không thể mở Camera.");
        }
    };

    // =======================================================================
    // 1. TẢI MODEL AI
    // =======================================================================
    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setIsModelLoaded(true);
            } catch (error) {
                toast.error("Không thể tải AI model.");
            }
        };
        loadModels();
        return () => stopCamera();
    }, []);

    // =======================================================================
    // 2. LẤY ĐỊA ĐIỂM & TẢI DATA KHUÔN MẶT
    // =======================================================================
    useEffect(() => {
        if (!isModelLoaded) return;

        const initializeData = async () => {
            stopCamera();
            setFaceMatcher(null);
            setScanResult(null);
            setIsProcessing(false);
            isProcessingRef.current = false;
            setScanProgress(0);
            setDetectedLocationName("");

            startCamera(mode);
            setInstruction("Đang kiểm tra vị trí...");

            if (!navigator.geolocation) {
                setInstruction("Thiết bị không hỗ trợ GPS");
                return;
            }

            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const coords = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setLocation(coords);

                    try {
                        // ✅ Đã thêm thuộc tính canProxy hứng từ Backend
                        const { success, project, members, error, canProxy } = await getNearbyProjectAndFaceData(coords, mode === "proxy");

                        // Luôn hiển thị tên Dự án/Văn phòng dù có thành công hay lỗi
                        if (project) {
                            setDetectedLocationName(`${project.name} (${project.distance}m)`);
                        }

                        // ✅ Mở khóa Tab Chấm Đội nếu có quyền tại địa điểm này (Lấy 100% từ backend)
                        if (canProxy) {
                            setIsProxyAuthorized(true);
                        }

                        if (!success || !members || members.length === 0) {
                            setInstruction(error || "Không tìm thấy dữ liệu khuôn mặt.");
                            toast.error(error || "Lỗi tải dữ liệu");
                            return;
                        }

                        const labeledDescriptors = members.map((member: any) => {
                            const floatArray = new Float32Array(Object.values(member.descriptor));
                            return new faceapi.LabeledFaceDescriptors(`${member.id}::${member.name}`, [floatArray]);
                        });

                        setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.45));
                        setInstruction("Đang tìm khuôn mặt...");

                    } catch (err) {
                        setInstruction("Lỗi kết nối máy chủ.");
                    }
                },
                (error) => setInstruction("Vui lòng bật định vị (GPS)."),
                { enableHighAccuracy: true, timeout: 10000 }
            );
        };

        initializeData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mode, isModelLoaded]);

    // =======================================================================
    // 3. LOGIC CĂN CHỈNH VÀ NHẬN DIỆN (CHỐNG STALE CLOSURE)
    // =======================================================================
    const scanResultRef = useRef(scanResult);
    useEffect(() => { scanResultRef.current = scanResult; }, [scanResult]);

    useEffect(() => {
        if (!isScanningStatus || !faceMatcher || !location || !videoRef.current) return;

        let stableCount = 0;
        const STABLE_THRESHOLD = 4;
        isProcessingRef.current = false;

        const scanInterval = setInterval(async () => {
            if (isProcessingRef.current || scanResultRef.current) return;

            try {
                const detection = await faceapi.detectSingleFace(videoRef.current!, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.5 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection) {
                    setInstruction("Đang tìm khuôn mặt...");
                    setScanProgress(0);
                    stableCount = 0;
                    return;
                }

                const box = detection.detection.box;
                const videoW = videoRef.current!.videoWidth;
                const videoH = videoRef.current!.videoHeight;

                const isLargeEnough = box.width > (videoW * 0.25);
                const faceCenterX = box.x + box.width / 2;
                const faceCenterY = box.y + box.height / 2;
                const isCentered = Math.abs(faceCenterX - (videoW / 2)) < (videoW * 0.2) && Math.abs(faceCenterY - (videoH / 2)) < (videoH * 0.2);

                if (!isLargeEnough) {
                    setInstruction("Hãy đưa mặt lại gần hơn");
                    setScanProgress(0);
                    stableCount = 0;
                } else if (!isCentered) {
                    setInstruction("Di chuyển khuôn mặt vào giữa");
                    setScanProgress(0);
                    stableCount = 0;
                } else {
                    setInstruction("Giữ nguyên...");
                    stableCount += 1;
                    setScanProgress((stableCount / STABLE_THRESHOLD) * 100);

                    // --- KHUÔN MẶT ĐÃ CHUẨN -> GỌI API CHẤM CÔNG ---
                    if (stableCount >= STABLE_THRESHOLD) {
                        isProcessingRef.current = true;
                        setIsProcessing(true);

                        const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

                        if (bestMatch.label !== 'unknown' && bestMatch.distance < 0.45) {
                            stopCamera();
                            const [empId, empName] = bestMatch.label.split('::');
                            setInstruction(`Đang ghi nhận: ${empName}...`);

                            const result = await processFaceAttendance(empId, location, mode === "proxy");

                            if (!result) {
                                toast.error("Lỗi mất kết nối với máy chủ.");
                                setScanResult({ success: false, message: "Server không phản hồi", name: empName });
                            } else if (result.success) {
                                toast.success(result.message);
                                setScanResult({ success: true, type: result.type, message: result.message!, name: empName });
                                if (onScanSuccess) onScanSuccess();
                            } else {
                                toast.error(result.error);
                                setScanResult({ success: false, message: result.error!, name: empName });
                            }
                        } else {
                            toast.error("Khuôn mặt không có trong hệ thống.");
                            setIsProcessing(false);
                            isProcessingRef.current = false;
                            setInstruction("Thử lại...");
                            setScanProgress(0);
                            stableCount = 0;
                        }
                    }
                }
            } catch (error) {
                console.error("Scan error:", error);
            }
        }, 300);

        intervalRef.current = scanInterval;

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isScanningStatus, faceMatcher, location]);

    // =======================================================================
    // 4. CÁC HÀM ĐIỀU KHIỂN UI
    // =======================================================================
    const handleContinue = () => {
        setScanResult(null);
        setIsProcessing(false);
        isProcessingRef.current = false;
        setScanProgress(0);
        setInstruction("Đang khởi động lại...");
        startCamera(mode);
    };

    const handleClose = () => {
        stopCamera();
        if (onClose) onClose();
    };

    // ✅ Logic phân quyền: Nếu userRole là UUID (f105...) thì includes() sẽ tự động bỏ qua. 
    // Khi đó, UI phụ thuộc 100% vào biến isProxyAuthorized được API Backend trả về!
    const globalCanProxy = ['admin', 'manager', 'project_manager', 'team_leader', 'hr_manager', 'hr_staff'].includes((userRole || '').toLowerCase());
    const showProxyTab = globalCanProxy || isProxyAuthorized;

    return (
        <div className="flex flex-col h-full w-full bg-slate-900 text-white overflow-hidden relative rounded-xl border border-slate-800">
            <div className="p-3 bg-slate-950 border-b border-slate-800 z-10 shadow-md">
                <Tabs value={mode} onValueChange={(v) => setMode(v as ScanMode)} className="w-full">
                    <TabsList className="grid w-full grid-cols-2 bg-slate-800">
                        <TabsTrigger value="self" className="font-medium data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
                            <UserSquare className="w-4 h-4 mr-2" /> Cá nhân
                        </TabsTrigger>
                        {showProxyTab && (
                            <TabsTrigger value="proxy" className="font-medium data-[state=active]:bg-blue-600 data-[state=active]:text-white animate-in zoom-in duration-300">
                                <Users className="w-4 h-4 mr-2" /> Chấm Đội
                            </TabsTrigger>
                        )}
                    </TabsList>
                </Tabs>
            </div>

            <div className="relative flex-1 flex flex-col items-center justify-center p-4">
                {/* HIỂN THỊ TÊN ĐỊA ĐIỂM (OVERLAY) */}
                {detectedLocationName && !scanResult && (
                    <div className="absolute top-4 left-0 right-0 z-20 flex justify-center">
                        <div className="bg-black/60 text-white text-xs px-3 py-1.5 rounded-full flex items-center backdrop-blur-sm border border-white/10 animate-in slide-in-from-top-2">
                            <MapPin className="w-3 h-3 mr-1.5 text-emerald-400" />
                            {detectedLocationName}
                        </div>
                    </div>
                )}

                <div className="relative w-full max-w-[320px] aspect-square bg-slate-950 rounded-full overflow-hidden shadow-[0_0_40px_rgba(0,0,0,0.6)] flex items-center justify-center mt-2">
                    {!isModelLoaded ? (
                        <div className="flex flex-col items-center text-slate-400">
                            <Loader2 className="w-8 h-8 animate-spin mb-3 text-emerald-500" />
                            <span className="text-sm">Đang tải AI...</span>
                        </div>
                    ) : cameraError ? (
                        <div className="flex flex-col items-center text-red-400 text-center p-4">
                            <XCircle className="w-10 h-10 mb-2 opacity-60" />
                            <span className="text-sm">Lỗi Camera</span>
                            <Button onClick={() => startCamera(mode)} variant="outline" className="mt-4 border-red-500 text-red-400">Thử lại</Button>
                        </div>
                    ) : scanResult ? (
                        <div className={`flex flex-col items-center justify-center w-full h-full p-4 animate-in zoom-in duration-300 ${scanResult.success ? 'bg-emerald-900/30' : 'bg-red-900/30'}`}>
                            {scanResult.success ? (
                                <CheckCircle2 className="w-20 h-20 text-emerald-400 mb-2" />
                            ) : (
                                <XCircle className="w-20 h-20 text-red-400 mb-2" />
                            )}
                            <h3 className="font-bold text-lg text-center truncate w-full px-4">{scanResult.name}</h3>
                            <p className={`text-sm text-center line-clamp-2 px-2 mt-1 ${scanResult.success ? 'text-emerald-300' : 'text-red-300'}`}>
                                {scanResult.message}
                            </p>
                        </div>
                    ) : (
                        <>
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className={`object-cover w-full h-full transform ${mode === 'self' ? 'scale-x-[-1]' : ''} transition-opacity duration-300 ${isProcessing ? 'opacity-30' : 'opacity-100'}`}
                            />
                            {!isProcessing && (
                                <div className={`absolute inset-0 border-[6px] m-6 rounded-full pointer-events-none transition-colors duration-300 ${scanProgress > 0 ? 'border-emerald-500/80 shadow-[0_0_20px_rgba(16,185,129,0.4)_inset]' : 'border-dashed border-white/20'}`}>
                                </div>
                            )}
                            {scanProgress > 0 && scanProgress < 100 && !isProcessing && (
                                <div className="absolute inset-0 m-6 rounded-full pointer-events-none" style={{
                                    background: `conic-gradient(#10b981 ${scanProgress}%, transparent 0)`,
                                    WebkitMask: "radial-gradient(transparent 68%, black 68%)",
                                    mask: "radial-gradient(transparent 68%, black 68%)"
                                }}></div>
                            )}
                            {isProcessing && (
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                                    <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-3" />
                                </div>
                            )}
                        </>
                    )}
                </div>

                <div className={`mt-8 h-12 flex items-center justify-center w-full max-w-[320px] px-4 rounded-lg font-medium transition-colors duration-300 ${scanResult?.success ? 'bg-emerald-900/50 text-emerald-400 border border-emerald-500/40' :
                    scanResult && !scanResult.success ? 'bg-red-900/50 text-red-400 border border-red-500/40' :
                        isProcessing ? 'bg-blue-900/50 text-blue-400 border border-blue-500/40' :
                            scanProgress > 0 ? 'bg-amber-900/50 text-amber-400 border border-amber-500/40' :
                                'bg-slate-800 text-slate-300'
                    }`}>
                    {scanResult ? (scanResult.success ? "Chấm công hoàn tất!" : "Không hợp lệ") : instruction}
                </div>

                {scanResult && (
                    <div className="flex gap-4 mt-6 w-full max-w-[320px]">
                        <Button className="flex-1 bg-blue-600 hover:bg-blue-700" onClick={handleContinue}>
                            <Play className="w-4 h-4 mr-2" /> Tiếp tục
                        </Button>
                        {onClose && (
                            <Button variant="outline" className="flex-1 border-slate-700 hover:bg-slate-800 text-slate-300" onClick={handleClose}>
                                Đóng
                            </Button>
                        )}
                    </div>
                )}
                {!scanResult && onClose && (
                    <Button variant="ghost" className="mt-4 text-slate-500 hover:text-slate-300" onClick={handleClose}>
                        Hủy bỏ
                    </Button>
                )}
            </div>
        </div>
    );
}