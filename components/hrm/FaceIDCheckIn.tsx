"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, MapPin, CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { getProjectMembersFaceData, recordFaceAttendance } from '@/lib/action/attendanceActions';

interface FaceIDCheckInProps {
    projectId: string;
    supervisorId?: string;
}

export default function FaceIDCheckIn({ projectId, supervisorId }: FaceIDCheckInProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [faceMatcher, setFaceMatcher] = useState<faceapi.FaceMatcher | null>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [location, setLocation] = useState<{lat: number, lng: number} | null>(null);
    const [scanResult, setScanResult] = useState<{name: string, code: string, id: string, distance: number} | null>(null);

    // 1. Khởi tạo: Load AI Models & Lấy Location & Lấy Data Nhân viên
    useEffect(() => {
        const initSystem = async () => {
            try {
                // Tải Models từ thư mục public/models
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setIsModelLoaded(true);

                // Lấy vị trí GPS
                navigator.geolocation.getCurrentPosition(
                    (pos) => setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
                    (err) => toast.error("Vui lòng cấp quyền định vị GPS để chấm công")
                );

                // Lấy Face Descriptors từ Server
                const membersData = await getProjectMembersFaceData(projectId);
                
                if (membersData.length > 0) {
                    // Chuyển đổi dữ liệu thô thành LabeledFaceDescriptors của face-api
                    const labeledDescriptors = membersData.map((member: any) => {
                        const floatArray = new Float32Array(member.descriptor);
                        return new faceapi.LabeledFaceDescriptors(
                            `${member.id}|${member.code}|${member.name}`, // Lưu gộp info vào Label
                            [floatArray]
                        );
                    });
                    
                    // Tạo FaceMatcher với độ chính xác 0.6 (60%)
                    setFaceMatcher(new faceapi.FaceMatcher(labeledDescriptors, 0.6));
                } else {
                    toast.warning("Dự án chưa có dữ liệu khuôn mặt nhân công.");
                }
            } catch (err) {
                console.error("Lỗi khởi tạo AI:", err);
                toast.error("Không thể khởi tạo hệ thống nhận diện.");
            }
        };

        initSystem();
    }, [projectId]);

    // 2. Bật Camera
    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => toast.error("Không thể mở Camera"));
    };

    // 3. Hàm Quét Khuôn mặt (Khi giám sát bấm nút Quét)
    const handleScanFace = async () => {
        if (!videoRef.current || !faceMatcher || !location) {
            toast.error("Hệ thống chưa sẵn sàng (Kiểm tra lại Camera, GPS hoặc Dữ liệu nhân viên)");
            return;
        }

        setIsScanning(true);
        setScanResult(null);

        try {
            // Nhận diện khuôn mặt trong khung hình
            const detection = await faceapi.detectSingleFace(videoRef.current)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                toast.error("Không tìm thấy khuôn mặt nào trong khung hình. Thử lại ngoài sáng.");
                setIsScanning(false);
                return;
            }

            // Đối chiếu với Database dự án
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);

            if (bestMatch.label === 'unknown') {
                // Người này không có trong danh sách Project Members
                toast.error("⚠️ TỪ CHỐI: Nhân công không thuộc dự án này hoặc chưa đăng ký khuôn mặt!");
            } else {
                // Thành công: Cắt chuỗi label ra lấy thông tin
                const [id, code, name] = bestMatch.label.split('|');
                setScanResult({ id, code, name, distance: bestMatch.distance });
                
                // TỰ ĐỘNG GỌI API CHẤM CÔNG
                const res = await recordFaceAttendance(id, projectId, location, supervisorId);
                if (res.success) {
                    toast.success(`Đã chấm công cho: ${name}`);
                } else {
                    toast.error(res.error);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Lỗi xử lý khuôn mặt.");
        }
        setIsScanning(false);
    };

    return (
        <div className="flex flex-col items-center bg-slate-50 dark:bg-slate-900 p-4 rounded-xl max-w-md mx-auto">
            {/* Trạng thái hệ thống */}
            <div className="flex w-full justify-between mb-4 text-xs font-semibold">
                <span className={`flex items-center ${isModelLoaded ? 'text-green-600' : 'text-orange-500'}`}>
                    {isModelLoaded ? <CheckCircle2 className="w-4 h-4 mr-1"/> : <Loader2 className="w-4 h-4 mr-1 animate-spin"/>}
                    AI Model
                </span>
                <span className={`flex items-center ${location ? 'text-green-600' : 'text-red-500'}`}>
                    {location ? <MapPin className="w-4 h-4 mr-1"/> : <XCircle className="w-4 h-4 mr-1"/>}
                    {location ? "GPS: Sẵn sàng" : "Đang tìm GPS"}
                </span>
            </div>

            {/* Khung Camera */}
            <div className="relative w-full aspect-[3/4] bg-black rounded-2xl overflow-hidden mb-6 shadow-xl border-4 border-slate-200 dark:border-slate-800">
                {!videoRef.current?.srcObject ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                        <Camera className="w-12 h-12 mb-2 opacity-50" />
                        <Button onClick={startVideo} variant="secondary">Mở Máy Ảnh</Button>
                    </div>
                ) : (
                    <video ref={videoRef} autoPlay muted playsInline className="object-cover w-full h-full" />
                )}
                
                {/* Lưới định vị khuôn mặt UI */}
                {videoRef.current?.srcObject && (
                    <div className="absolute inset-0 border-[3px] border-dashed border-white/40 m-8 rounded-full pointer-events-none"></div>
                )}
            </div>

            {/* Thông tin kết quả */}
            {scanResult && (
                <div className="w-full bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 p-3 rounded-lg mb-4 text-center animate-in zoom-in-95">
                    <p className="text-sm">Nhân viên: <strong className="text-lg">{scanResult.name}</strong></p>
                    <p className="text-xs opacity-80">Mã NV: {scanResult.code} | Độ khớp: {((1 - scanResult.distance) * 100).toFixed(1)}%</p>
                </div>
            )}

            {/* Nút Action */}
            <Button 
                onClick={handleScanFace} 
                disabled={isScanning || !isModelLoaded || !location || !videoRef.current?.srcObject}
                className="w-full h-14 text-lg rounded-full shadow-lg bg-blue-600 hover:bg-blue-700"
            >
                {isScanning ? (
                    <><Loader2 className="w-6 h-6 mr-2 animate-spin" /> Đang quét...</>
                ) : (
                    <><Camera className="w-6 h-6 mr-2" /> Chạm để Quét Chấm Công</>
                )}
            </Button>
        </div>
    );
}