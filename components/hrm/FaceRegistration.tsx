"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { CheckCircle2, Loader2, ScanFace, XCircle } from 'lucide-react';
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
    const streamRef = useRef<MediaStream | null>(null); // Lưu trữ luồng phần cứng
    const intervalRef = useRef<NodeJS.Timeout | null>(null); // Quản lý vòng lặp quét mặt

    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [cameraError, setCameraError] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [instruction, setInstruction] = useState("Đang tìm khuôn mặt...");
    const [scanProgress, setScanProgress] = useState(0);
    const [isSuccess, setIsSuccess] = useState(false);

    // =======================================================================
    // 1. HÀM DỪNG CAMERA TRIỆT ĐỂ (Hardware & Logic)
    // =======================================================================
    const stopCamera = () => {
        // A. Dừng vòng lặp quét ngay lập tức
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        // B. Tắt luồng phần cứng (Sử dụng streamRef để đảm bảo tắt được cả khi videoRef đã null)
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
            streamRef.current = null;
        }

        // C. Ngắt kết nối với thẻ video trên UI
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };

    const startVideo = async () => {
        try {
            setCameraError(false);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
            });

            streamRef.current = stream; // Lưu tham chiếu luồng

            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            console.error("Camera Error:", err);
            setCameraError(true);
            toast.error("Không thể mở Camera.");
        }
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
                toast.error("Lỗi tải AI models.");
            }
        };
        loadModels();

        // Chốt chặn cuối cùng: Cleanup khi unmount
        return () => stopCamera();
    }, []);

    const handleVideoPlay = () => {
        let stableCount = 0;
        const STABLE_THRESHOLD = 5;

        // Lưu vào intervalRef để quản lý tập trung
        intervalRef.current = setInterval(async () => {
            if (!videoRef.current || !isModelLoaded || isProcessing || isSuccess) return;

            try {
                const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.SsdMobilenetv1Options({ minConfidence: 0.7 }))
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (!detection) {
                    setInstruction("Đang tìm khuôn mặt...");
                    setScanProgress(0);
                    stableCount = 0;
                    return;
                }

                const box = detection.detection.box;
                const videoW = videoRef.current.videoWidth;
                const videoH = videoRef.current.videoHeight;

                const isLargeEnough = box.width > (videoW * 0.3);
                const faceCenterX = box.x + box.width / 2;
                const faceCenterY = box.y + box.height / 2;
                const isCentered =
                    Math.abs(faceCenterX - (videoW / 2)) < (videoW * 0.15) &&
                    Math.abs(faceCenterY - (videoH / 2)) < (videoH * 0.15);

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

                    if (stableCount >= STABLE_THRESHOLD) {
                        stopCamera(); // TẮT CAMERA NGAY KHI ĐẠT CHUẨN
                        handleAutoSave(detection.descriptor);
                    }
                }
            } catch (error) {
                console.error("Scan error:", error);
            }
        }, 300);
    };

    const handleAutoSave = async (descriptor: Float32Array) => {
        setIsProcessing(true);
        try {
            setInstruction("Đang lưu Face ID...");
            const res = await registerFaceDescriptor(employeeId, Array.from(descriptor));

            if (res.success) {
                setIsSuccess(true);
                toast.success("Đã đăng ký Face ID thành công!");
                setTimeout(() => {
                    if (onSuccess) onSuccess();
                }, 1500);
            } else {
                toast.error(res.error || "Lỗi lưu dữ liệu.");
                setIsProcessing(false);
                startVideo(); // Thử lại nếu lỗi
            }
        } catch (error) {
            toast.error("Lỗi kết nối máy chủ.");
            setIsProcessing(false);
            startVideo();
        }
    };

    // Hàm đóng thủ công (Dùng cho cả 2 nút đóng)
    const handleClose = () => {
        stopCamera();
        if (onSuccess) onSuccess();
    };

    return (
        <div className="flex flex-col items-center bg-slate-900 p-4 rounded-xl max-w-sm mx-auto text-white w-full">
            <h3 className="text-lg font-bold mb-1">Đăng ký Face ID</h3>
            <p className="text-slate-400 text-sm mb-6">Nhân viên: <span className="text-blue-400 font-semibold">{employeeName}</span></p>

            <div className="relative w-full aspect-square bg-slate-950 rounded-full overflow-hidden mb-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] flex items-center justify-center">
                {!isModelLoaded ? (
                    <div className="flex flex-col items-center text-slate-400">
                        <Loader2 className="w-8 h-8 animate-spin mb-3 text-blue-500" />
                        <span className="text-sm">Khởi tạo AI...</span>
                    </div>
                ) : cameraError ? (
                    <div className="flex flex-col items-center text-red-400 text-center p-4">
                        <XCircle className="w-10 h-10 mb-2 opacity-60" />
                        <span className="text-sm">Lỗi Camera</span>
                    </div>
                ) : isSuccess ? (
                    <div className="flex flex-col items-center text-emerald-400 animate-in zoom-in duration-300">
                        <CheckCircle2 className="w-20 h-20 mb-3" />
                        <span className="font-bold text-lg">Hoàn tất!</span>
                    </div>
                ) : (
                    <>
                        <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            onPlay={handleVideoPlay}
                            className={`object-cover w-full h-full transform scale-x-[-1] transition-opacity duration-300 ${isProcessing ? 'opacity-30' : 'opacity-100'}`}
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

            <div className={`h-12 flex items-center justify-center w-full px-4 rounded-lg font-medium transition-colors duration-300 ${isSuccess ? 'bg-emerald-900/40 text-emerald-400 border border-emerald-500/30' :
                    isProcessing ? 'bg-blue-900/40 text-blue-400 border border-blue-500/30' :
                        scanProgress > 0 ? 'bg-amber-900/40 text-amber-400 border border-amber-500/30' :
                            'bg-slate-800 text-slate-300'
                }`}>
                {isSuccess ? "Đăng ký thành công!" : instruction}
            </div>

            <Button variant="ghost" className="mt-4 text-slate-500 hover:text-slate-300" onClick={handleClose}>
                Đóng
            </Button>
        </div>
    );
}