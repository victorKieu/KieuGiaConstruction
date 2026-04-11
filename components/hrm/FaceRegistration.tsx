"use client";

import React, { useEffect, useRef, useState } from 'react';
import * as faceapi from 'face-api.js';
import { Camera, CheckCircle2, Loader2, Save, ScanFace } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { registerFaceDescriptor } from '@/lib/action/employeeActions';

interface FaceRegistrationProps {
    employeeId: string;
    employeeName: string;
    onSuccess?: () => void; // Callback để đóng modal sau khi xong
}

export default function FaceRegistration({ employeeId, employeeName, onSuccess }: FaceRegistrationProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [isModelLoaded, setIsModelLoaded] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [capturedDescriptor, setCapturedDescriptor] = useState<Float32Array | null>(null);

    // 1. Tải AI Models
    useEffect(() => {
        const loadModels = async () => {
            try {
                await Promise.all([
                    faceapi.nets.ssdMobilenetv1.loadFromUri('/models'),
                    faceapi.nets.faceLandmark68Net.loadFromUri('/models'),
                    faceapi.nets.faceRecognitionNet.loadFromUri('/models')
                ]);
                setIsModelLoaded(true);
                startVideo(); // Tự động mở camera khi load xong model
            } catch (err) {
                console.error("Lỗi tải model:", err);
                toast.error("Không thể tải hệ thống AI.");
            }
        };
        loadModels();

        return () => {
            // Tắt camera khi đóng Component
            if (videoRef.current && videoRef.current.srcObject) {
                const stream = videoRef.current.srcObject as MediaStream;
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    const startVideo = () => {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
            .then(stream => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            })
            .catch(err => toast.error("Không thể truy cập Camera."));
    };

    // 2. Chụp và phân tích khuôn mặt
    const captureFace = async () => {
        if (!videoRef.current || !isModelLoaded) return;
        setIsScanning(true);

        try {
            // Quét duy nhất 1 khuôn mặt trong khung hình
            const detection = await faceapi.detectSingleFace(videoRef.current)
                .withFaceLandmarks()
                .withFaceDescriptor();

            if (!detection) {
                toast.error("Không tìm thấy khuôn mặt! Vui lòng nhìn thẳng và đảm bảo đủ sáng.");
            } else {
                // Nhận diện thành công, lưu descriptor vào state
                setCapturedDescriptor(detection.descriptor);
                toast.success("Đã bắt được dữ liệu khuôn mặt!");
            }
        } catch (error) {
            toast.error("Đã xảy ra lỗi khi phân tích.");
        }

        setIsScanning(false);
    };

    // 3. Lưu vào Database
    const handleSave = async () => {
        if (!capturedDescriptor) return;
        setIsScanning(true);

        try {
            // ✅ QUAN TRỌNG: face-api trả về Float32Array, phải ép về Array chuẩn của Javascript để gửi API
            const descriptorArray = Array.from(capturedDescriptor);

            const res = await registerFaceDescriptor(employeeId, descriptorArray);
            if (res.success) {
                toast.success(res.message);
                if (onSuccess) onSuccess();
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Lỗi kết nối máy chủ.");
        }
        setIsScanning(false);
    };

    return (
        <div className="flex flex-col items-center bg-slate-900 p-4 rounded-xl max-w-sm mx-auto text-white">
            <h3 className="text-lg font-bold mb-1">Đăng ký Face ID</h3>
            <p className="text-slate-400 text-sm mb-4">Nhân viên: <span className="text-blue-400 font-semibold">{employeeName}</span></p>

            {!isModelLoaded && (
                <div className="flex items-center text-orange-400 text-sm mb-4">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang tải AI Engine...
                </div>
            )}

            {/* Khung Camera */}
            <div className="relative w-full aspect-square bg-black rounded-full overflow-hidden mb-6 border-4 border-slate-700 shadow-xl">
                <video ref={videoRef} autoPlay muted playsInline className="object-cover w-full h-full transform scale-x-[-1]" />

                {/* Overlay hướng dẫn */}
                <div className="absolute inset-0 border-[4px] border-dashed border-white/30 m-8 rounded-full pointer-events-none"></div>
            </div>

            {/* Nút chức năng */}
            {!capturedDescriptor ? (
                <Button
                    onClick={captureFace}
                    disabled={isScanning || !isModelLoaded}
                    className="w-full bg-blue-600 hover:bg-blue-700 h-12 rounded-full"
                >
                    {isScanning ? <Loader2 className="w-5 h-5 animate-spin" /> : <><ScanFace className="w-5 h-5 mr-2" /> Chụp khuôn mặt</>}
                </Button>
            ) : (
                <div className="w-full space-y-3">
                    <div className="bg-green-900/40 border border-green-500/30 text-green-400 p-3 rounded-lg flex items-center text-sm">
                        <CheckCircle2 className="w-5 h-5 mr-2 shrink-0" />
                        Đã trích xuất thành công 128 điểm ảnh. Sẵn sàng lưu trữ!
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => setCapturedDescriptor(null)} className="flex-1 bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800">
                            Chụp lại
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