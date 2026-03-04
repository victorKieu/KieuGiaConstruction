"use client";

import React, { useState, useEffect, useRef } from "react";
import { Compass, Save, RefreshCw, Smartphone, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { evaluateFengShui, type FullFengShuiAnalysis } from "@/lib/utils/fengShui";

interface FengShuiCompassProps {
    projectId: string;
    ownerName?: string;
    birthYear?: number;
    gender?: 'nam' | 'nu';
    onSaveResult: (data: any) => void;
}

export default function FengShuiCompass({
    projectId,
    ownerName = "Khách hàng",
    birthYear = 1990,
    gender = 'nam',
    onSaveResult
}: FengShuiCompassProps) {
    const [heading, setHeading] = useState(0);
    const [isLocked, setIsLocked] = useState(false);
    const [analysis, setAnalysis] = useState<FullFengShuiAnalysis | null>(null);

    // ✅ Tự động tính toán phong thủy khi Heading hoặc Thông tin gia chủ thay đổi
    useEffect(() => {
        if (!isLocked) {
            const res = evaluateFengShui(birthYear, gender, heading);
            setAnalysis(res);
        }
    }, [heading, birthYear, gender, isLocked]);

    // Xử lý cảm biến la bàn trên điện thoại
    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            // @ts-ignore - Hỗ trợ webkit cho iOS
            const compass = e.webkitCompassHeading || (360 - (e.alpha || 0));
            if (!isLocked) setHeading(Math.round(compass));
        };

        if (typeof window !== "undefined" && "DeviceOrientationEvent" in window) {
            // @ts-ignore
            if (typeof DeviceOrientationEvent.requestPermission === "function") {
                // @ts-ignore
                DeviceOrientationEvent.requestPermission().then((res: string) => {
                    if (res === "granted") window.addEventListener("deviceorientation", handleOrientation);
                });
            } else {
                window.addEventListener("deviceorientation", handleOrientation);
            }
        }
        return () => window.removeEventListener("deviceorientation", handleOrientation);
    }, [isLocked]);

    const handleSave = () => {
        onSaveResult({
            heading,
            analysis,
            timestamp: new Date().toISOString()
        });
    };

    return (
        <div className="flex flex-col items-center justify-center space-y-8 w-full">
            {/* --- Hiển thị thông tin Gia chủ đang đo --- */}
            <div className="text-center space-y-1 animate-in fade-in slide-in-from-top-4">
                <div className="flex items-center justify-center gap-2 text-blue-400 font-black uppercase tracking-tighter text-lg">
                    <User size={18} /> {ownerName || "Gia chủ"}
                </div>
                <p className="text-white/40 text-[10px] font-bold uppercase tracking-widest">
                    {birthYear} — {gender === 'nam' ? 'Tây Tứ Trạch' : 'Đông Tứ Trạch'} (Cung {analysis?.cung})
                </p>
            </div>

            {/* --- Mặt La bàn --- */}
            <div className="relative w-72 h-72 md:w-80 md:h-80 rounded-full border-[6px] border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.5)] bg-slate-900 flex items-center justify-center overflow-hidden">
                {/* Các vạch chia độ */}
                <div className="absolute inset-2 rounded-full border border-slate-700/50 opacity-50" />

                {/* Kim chỉ hướng (Đứng yên) */}
                <div className="absolute top-0 w-1 h-8 bg-red-500 z-20 rounded-full shadow-[0_0_10px_rgba(239,68,68,0.5)]" />

                {/* Đĩa xoay La bàn */}
                <div
                    className="relative w-full h-full transition-transform duration-100 ease-out"
                    style={{ transform: `rotate(${-heading}deg)` }}
                >
                    {/* Các hướng chính */}
                    {['BẮC', 'ĐÔNG', 'NAM', 'TÂY'].map((dir, i) => (
                        <div key={dir} className="absolute inset-0 flex flex-col items-center pt-4" style={{ transform: `rotate(${i * 90}deg)` }}>
                            <span className={`font-black text-sm ${dir === 'BẮC' ? 'text-red-500' : 'text-white/60'}`}>{dir}</span>
                        </div>
                    ))}

                    {/* Hiển thị Cung Tốt/Xấu trực tiếp trên đĩa xoay (Nếu có analysis) */}
                    {analysis?.allDirections.map((d, i) => (
                        <div
                            key={i}
                            className="absolute inset-0 flex flex-col items-center justify-start pt-12"
                            style={{ transform: `rotate(${d.degree}deg)` }}
                        >
                            <div className={`text-[8px] font-bold px-1.5 py-0.5 rounded-sm ${d.type === 'good' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-400/50'}`}>
                                {d.star}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Hiển thị số độ ở giữa */}
                <div className="absolute inset-0 flex flex-col items-center justify-center z-30 pointer-events-none">
                    <div className="bg-slate-950/80 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center">
                        <span className="text-4xl font-black text-white leading-none tracking-tighter">{heading}°</span>
                        <span className={`text-[10px] font-bold uppercase mt-1 ${analysis?.currentDirection.isGood ? 'text-green-400' : 'text-red-400'}`}>
                            {analysis?.currentDirection.star} ({analysis?.currentDirection.name})
                        </span>
                    </div>
                </div>
            </div>

            {/* --- Bộ nút điều khiển --- */}
            <div className="grid grid-cols-2 gap-4 w-full max-w-xs">
                <Button
                    type="button"
                    variant={isLocked ? "destructive" : "outline"}
                    className={`h-12 rounded-2xl font-bold uppercase tracking-wider transition-all ${!isLocked && 'border-white/10 bg-white/5 text-white'}`}
                    onClick={() => setIsLocked(!isLocked)}
                >
                    {isLocked ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                    {isLocked ? "Mở khóa" : "Chốt hướng"}
                </Button>

                <Button
                    type="button"
                    disabled={!isLocked}
                    className="h-12 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider shadow-lg shadow-blue-900/40 disabled:opacity-20"
                    onClick={handleSave}
                >
                    <Save className="mr-2 h-4 w-4" /> Lưu lại
                </Button>
            </div>

            <p className="text-white/20 text-[9px] font-medium uppercase tracking-[0.3em]">Thiết kế bởi KieuGia Construction</p>
        </div>
    );
}