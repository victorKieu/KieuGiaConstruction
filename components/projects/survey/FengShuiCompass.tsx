"use client";

import React, { useState, useEffect } from 'react';
import { evaluateFengShui, Gender } from '@/lib/utils/fengShui';
import { Save, RefreshCcw, CheckCircle2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface FengShuiCompassProps {
    projectId: string;
    onSaveResult?: (data: { heading: number; result: string; cung: string; dirName: string }) => void;
}

export default function FengShuiCompass({ projectId, onSaveResult }: FengShuiCompassProps) {
    const [name, setName] = useState<string>("");
    const [heading, setHeading] = useState<number | null>(null);
    const [year, setYear] = useState<number>(1985);
    const [gender, setGender] = useState<Gender>('nam');
    const [isLock, setIsLock] = useState(false);
    const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

    const requestPermission = async () => {
        if (typeof (DeviceOrientationEvent as any).requestPermission === 'function') {
            try {
                const permissionState = await (DeviceOrientationEvent as any).requestPermission();
                setPermissionGranted(permissionState === 'granted');
            } catch (error) {
                console.error("Lỗi cấp quyền cảm biến:", error);
            }
        } else {
            setPermissionGranted(true);
        }
    };

    useEffect(() => {
        if (!permissionGranted || isLock) return;
        const handleOrientation = (e: DeviceOrientationEvent) => {
            let compassHeading = (e as any).webkitCompassHeading;
            if (!compassHeading && e.alpha !== null) compassHeading = Math.abs(e.alpha - 360);
            if (compassHeading) setHeading(Math.round(compassHeading));
        };
        window.addEventListener('deviceorientation', handleOrientation, true);
        return () => window.removeEventListener('deviceorientation', handleOrientation, true);
    }, [permissionGranted, isLock]);

    const fengShui = heading !== null ? evaluateFengShui(year, gender, heading) : null;

    // HÀM QUAN TRỌNG: Gửi dữ liệu về Modal để lưu vào Database
    const handleFinalSave = () => {
        if (onSaveResult && fengShui && heading !== null) {
            onSaveResult({
                heading: heading,
                result: fengShui.result,
                cung: fengShui.cung,
                dirName: fengShui.dirName
            });
        }
    };

    return (
        <div className="w-full h-full flex flex-col bg-slate-950 overflow-hidden relative">

            {/* 1. INPUT BAR */}
            <div className="bg-slate-900/90 backdrop-blur-md p-3 border-b border-slate-800 z-50 shrink-0">
                <div className="flex gap-2 items-end">
                    <div className="flex-[2]">
                        <label className="text-[9px] font-bold text-slate-500 uppercase ml-1 tracking-tighter">Gia chủ & Năm sinh</label>
                        <div className="flex gap-1 mt-1">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Họ tên..."
                                className="h-8 bg-slate-800 border-none text-white text-xs font-bold focus-visible:ring-1 focus-visible:ring-blue-500"
                            />
                            <Input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(Number(e.target.value))}
                                className="w-16 h-8 bg-slate-800 border-none text-white text-xs font-bold text-center"
                            />
                        </div>
                    </div>
                    <div className="flex-1 max-w-[80px]">
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter text-center block">Giới tính</label>
                        <select
                            className="w-full h-8 bg-slate-800 border-none rounded-md mt-1 font-bold text-white text-[11px] outline-none px-1 appearance-none text-center"
                            value={gender}
                            onChange={(e) => setGender(e.target.value as Gender)}
                        >
                            <option value="nam">Nam</option>
                            <option value="nu">Nữ</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* 2. MAIN COMPASS AREA */}
            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                <div className="absolute top-0 bottom-0 w-[1px] bg-red-600/60 z-20 pointer-events-none shadow-[0_0_10px_rgba(220,38,38,0.5)]">
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 bg-red-600 rotate-45 mt-[-6px]" />
                </div>

                {!permissionGranted ? (
                    <div className="z-40 text-center px-6">
                        <p className="text-slate-400 text-xs mb-4 uppercase font-bold tracking-widest">Cần quyền truy cập cảm biến để đo hướng</p>
                        <Button onClick={requestPermission} className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-8 py-6 rounded-full shadow-xl shadow-amber-500/20">
                            BẬT LA BÀN PHONG THỦY
                        </Button>
                    </div>
                ) : (
                    <div className="relative flex flex-col items-center">
                        <div
                            className="relative w-[88vw] h-[88vw] max-w-[480px] max-h-[480px] transition-transform duration-300 ease-out z-10"
                            style={{ transform: `rotate(${-(heading || 0)}deg)` }}
                        >
                            <img
                                src="https://firebasestorage.googleapis.com/v0/b/smart-survey-7b567.appspot.com/o/assets%2Fluopan.png?alt=media"
                                className="w-full h-full object-contain brightness-110 contrast-125 drop-shadow-[0_0_40px_rgba(0,0,0,1)]"
                                alt="La bàn 24 sơn hướng"
                                onError={(e) => e.currentTarget.src = "https://img.freepik.com/premium-vector/feng-shui-compass-luo-pan-vector-illustration_651235-132.jpg"}
                            />
                        </div>

                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center z-30 pointer-events-none">
                            <div className="bg-slate-950/80 px-4 py-1 rounded-full border border-amber-500/50 backdrop-blur-md shadow-2xl">
                                <span className="text-3xl font-black text-white tracking-tighter leading-none">
                                    {heading !== null ? `${heading}°` : '--°'}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 3. FLOATING RESULTS */}
            {fengShui && heading !== null && (
                <div className="absolute bottom-6 left-4 right-4 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className={`p-4 rounded-[2rem] backdrop-blur-xl border-2 shadow-2xl ${fengShui.isGood ? 'bg-emerald-950/60 border-emerald-500/40' : 'bg-rose-950/60 border-rose-500/40'}`}>
                        <div className="flex justify-between items-center mb-4 px-2">
                            <div>
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Cung {fengShui.cung}</p>
                                <h4 className={`text-2xl font-black uppercase leading-none mt-1 ${fengShui.isGood ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {fengShui.result}
                                </h4>
                            </div>
                            <div className="text-right">
                                <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em]">Hướng</p>
                                <h4 className="text-xl font-black text-amber-400 mt-1 uppercase leading-none">{fengShui.dirName}</h4>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button
                                variant="ghost"
                                className="flex-1 h-11 rounded-2xl text-white hover:bg-white/10 border border-white/10 font-bold"
                                onClick={() => setIsLock(!isLock)}
                            >
                                {isLock ? <RefreshCcw className="w-4 h-4 mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                {isLock ? "MỞ KHÓA" : "KHÓA HƯỚNG"}
                            </Button>
                            <Button
                                onClick={handleFinalSave}
                                className="flex-1 h-11 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-600/20"
                            >
                                <CheckCircle2 className="w-4 h-4 mr-2" />
                                LƯU KẾT QUẢ
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}