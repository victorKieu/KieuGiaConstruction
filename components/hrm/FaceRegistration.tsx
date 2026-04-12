"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { CheckCircle2, Loader2, Save, ScanFace, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { registerFaceDescriptor } from '@/lib/action/employeeActions';

interface FaceRegistrationProps {
    employeeId: string;
    employeeName: string;
    onSuccess?: () => void;
}

export default function FaceRegistration({ employeeId, employeeName, onSuccess }: FaceRegistrationProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);

    // =======================================================================
    // ✅ HÀM TẮT CAMERA CHUYÊN DỤNG (XÓA SẠCH LUỒNG NGẦM)
    // =======================================================================
    const stopCamera = () => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop()); // Tắt phần cứng Camera
            videoRef.current.srcObject = null; // Cắt luồng khỏi thẻ HTML
        }
    };

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => toast.error("Không thể truy cập Camera."));
    };

    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setIsModelLoaded(true);
                startVideo();
            } catch (err) {
                toast.error("Không thể tải hệ thống AI.");
            }
        };
        loadModels();

        // ✅ HÀNH ĐỘNG 2: TẮT CAMERA KHI UNMOUNT (KHI ĐÓNG FORM ĐỘT NGỘT HOẶC LƯU XONG)
        return () => {
            stopCamera();
        };
    }, []);

    const captureFace = async () => {
        if (!videoRef.current || !isModelLoaded) return;
        setIsScanning(true);

        try {
            const detection = await faceapi.detectSingleFace(videoRef.current)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                toast.error("Không tìm thấy khuôn mặt! Vui lòng nhìn thẳng và đảm bảo đủ sáng.");
            } else {
                setCapturedDescriptor(detection.descriptor);
                toast.success("Đã bắt được dữ liệu khuôn mặt!");

                // ✅ HÀNH ĐỘNG 1: TẮT CAMERA NGAY KHI CHỤP MẶT THÀNH CÔNG (Không cần đợi lưu)
                stopCamera();
            }
        } catch (error) {
            toast.error("Đã xảy ra lỗi khi phân tích.");
        }
        setIsScanning(false);
    };

    const handleSave = async () => {
        if (!capturedDescriptor) return;
        setIsScanning(true);
        try {
            const descriptorArray = Array.from(capturedDescriptor);
            const res = await registerFaceDescriptor(employeeId, descriptorArray);
            if (res.success) {
                toast.success(res.message);
                if (onSuccess) onSuccess(); // Gọi hàm này sẽ làm Modal đóng -> kích hoạt Hành động 2 (Cleanup)
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Lỗi kết nối máy chủ.");
        }
        setIsScanning(false);
    };

    const handleRetry = () => {
        setCapturedDescriptor(null);
        startVideo(); // Bật lại camera nếu muốn chụp lại
    }

    return (
        <div className="flex flex-col items-center bg-slate-900 p-4 rounded-xl max-w-sm mx-auto text-white">
            <h3 className="text-lg font-bold mb-1">Đăng ký Face ID</h3>
            <p className="text-slate-400 text-sm mb-4">Nhân viên: <span className="text-blue-400 font-semibold">{employeeName}</span></p>

            {!isModelLoaded && (
                <div className="flex items-center text-orange-400 text-sm mb-4">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải AI Engine...
                </div>
            )}

            <div className="relative w-full aspect-square bg-black rounded-full overflow-hidden mb-6 border-4 border-slate-700 shadow-xl flex items-center justify-center">
                {!capturedDescriptor ? (
                    <video ref={videoRef} autoPlay muted playsInline className="object-cover w-full h-full transform scale-x-[-1]" />
                ) : (
                    <div className="flex flex-col items-center text-emerald-400 animate-in zoom-in">
                        <CheckCircle2 className="w-16 h-16 mb-2" />
                        <span className="font-semibold">Đã khóa mục tiêu</span>
                    </div>
                )}
                {!capturedDescriptor && <div className="absolute inset-0 border-[4px] border-dashed border-white/30 m-8 rounded-full pointer-events-none"></div>}
            </div>

            {!capturedDescriptor ? (
                <Button onClick={captureFace} disabled={isScanning || !isModelLoaded} className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-full shadow-lg">
                    {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ScanFace className="w-5 h-5 mr-2" /> Chụp khuôn mặt</>}
                </Button>
            ) : (
                <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-2">
                    <div className="bg-green-900/40 border border-green-500/30 text-green-400 p-3 rounded-lg flex items-center text-sm">
                        <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" /> Đã trích xuất xong. Sẵn sàng lưu trữ!
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={handleRetry} className="flex-1 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">
                            <RotateCcw className="w-4 h-4 mr-2" /> Chụp lại
                        </Button>
                        <Button onClick={handleSave} disabled={isScanning} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                            {isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Lưu Data</>}
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}