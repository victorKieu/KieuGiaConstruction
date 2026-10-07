"use client";

import React, { useState, useEffect } from "react";
import { Compass, Save, RefreshCw, Smartphone, User, Ruler, Settings2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

    // --- CÁC BIẾN SỐ RÀNG BUỘC DỰ TOÁN (FENG SHUI CONSTRAINTS) ---
    const [loBanDoor, setLoBanDoor] = useState("bat_buoc");
    const [stairSteps, setStairSteps] = useState("21");
    const [remedyScreen, setRemedyScreen] = useState("khong");
    const [septicTankRule, setSepticTankRule] = useState("tranh_trung_cung");

    // Tự động tính toán phong thủy
    useEffect(() => {
        if (!isLocked) {
            const res = evaluateFengShui(birthYear, gender, heading);
            setAnalysis(res);

            // Nếu hướng xấu (Tuyệt Mệnh, Ngũ Quỷ...), tự động đề xuất thêm Bình phong hóa giải
            if (res && !res.currentDirection.isGood) {
                setRemedyScreen("co_vach_ngan");
            } else {
                setRemedyScreen("khong");
            }
        }
    }, [heading, birthYear, gender, isLocked]);

    // Xử lý cảm biến la bàn
    useEffect(() => {
        const handleOrientation = (e: DeviceOrientationEvent) => {
            // @ts-ignore
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
        if (!analysis) return;

        // ✅ TRẢ VỀ TOÀN BỘ DATA (Heading + Thông số kỹ thuật) để ghim vào DỰ TOÁN
        onSaveResult({
            heading: heading,
            constraints: {
                loBanDoor: loBanDoor,
                stairSteps: parseInt(stairSteps),
                remedyScreen: remedyScreen,
                septicTankRule: septicTankRule
            }
        });
    };

    return (
        <div className="flex h-full w-full flex-col items-center overflow-y-auto bg-slate-950 pt-8 pb-20">
            {/* --- Hiển thị thông tin Gia chủ --- */}
            <div className="animate-in fade-in slide-in-from-top-4 mb-6 space-y-1 text-center">
                <div className="flex items-center justify-center gap-2 text-lg font-black tracking-tighter text-blue-400 uppercase">
                    <User size={18} /> {ownerName}
                </div>
                <p className="font-bold tracking-widest text-[10px] text-white/40 uppercase">
                    {birthYear} — {gender === 'nam' ? 'Nam' : 'Nữ'} (Cung {analysis?.cung})
                </p>
            </div>

            {/* --- Mặt La bàn (Công cụ đo) --- */}
            <div className="relative flex h-64 w-64 shrink-0 items-center justify-center overflow-hidden rounded-full border-[6px] border-slate-800 bg-slate-900 shadow-[0_0_50px_rgba(0,0,0,0.5)] md:h-80 md:w-80">
                <div className="absolute inset-2 rounded-full border border-slate-700/50 opacity-50" />
                <div className="absolute top-0 z-20 h-8 w-1 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />

                <div className="relative h-full w-full transition-transform duration-100 ease-out" style={{ transform: `rotate(${-heading}deg)` }}>
                    {['BẮC', 'ĐÔNG', 'NAM', 'TÂY'].map((dir, i) => (
                        <div key={dir} className="absolute inset-0 flex flex-col items-center pt-4" style={{ transform: `rotate(${i * 90}deg)` }}>
                            <span className={`text-sm font-black ${dir === 'BẮC' ? 'text-red-500' : 'text-white/60'}`}>{dir}</span>
                        </div>
                    ))}
                    {analysis?.allDirections.map((d, i) => (
                        <div key={i} className="absolute inset-0 flex flex-col items-center justify-start pt-12" style={{ transform: `rotate(${d.degree}deg)` }}>
                            <div className={`rounded-sm px-1.5 py-0.5 font-bold text-[8px] ${d.type === 'good' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/10 text-red-400/50'}`}>
                                {d.star}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="pointer-events-none absolute inset-0 z-30 flex flex-col items-center justify-center">
                    <div className="flex flex-col items-center rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-2 shadow-2xl backdrop-blur-md">
                        <span className="text-4xl leading-none font-black tracking-tighter text-white">{heading}°</span>
                        <span className={`mt-1 font-bold text-[10px] uppercase ${analysis?.currentDirection.isGood ? 'text-green-400' : 'text-red-400'}`}>
                            {analysis?.currentDirection.star} ({analysis?.currentDirection.name})
                        </span>
                    </div>
                </div>
            </div>

            {/* --- Bộ nút điều khiển La bàn --- */}
            <div className="mt-8 mb-8 grid w-full max-w-xs grid-cols-2 gap-4">
                <Button
                    type="button"
                    variant={isLocked ? "destructive" : "outline"}
                    className={`h-12 rounded-xl font-bold tracking-wider uppercase transition-all ${!isLocked && 'border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white'}`}
                    onClick={() => setIsLocked(!isLocked)}
                >
                    {isLocked ? <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> : <Smartphone className="mr-2 h-4 w-4" />}
                    {isLocked ? "Đo lại" : "Chốt hướng"}
                </Button>

                <Button
                    type="button"
                    disabled={!isLocked}
                    className="h-12 rounded-xl bg-blue-600 font-black tracking-wider text-white uppercase shadow-lg shadow-blue-900/40 hover:bg-blue-700 disabled:opacity-20"
                    onClick={handleSave}
                >
                    <Save className="mr-2 h-4 w-4" /> Lưu dữ liệu
                </Button>
            </div>

            {/* --- RÀNG BUỘC KỸ THUẬT (BIẾN SỐ CHO DỰ TOÁN) --- */}
            <div className={`w-full max-w-md space-y-4 px-4 transition-all duration-500 ${isLocked ? 'opacity-100 translate-y-0' : 'opacity-30 pointer-events-none translate-y-4'}`}>
                <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-amber-400">
                    <Settings2 className="h-5 w-5" />
                    <h3 className="font-black tracking-widest text-[13px] uppercase">Tham số Ràng buộc Kỹ thuật</h3>
                </div>

                <div className="space-y-4 rounded-2xl border border-white/5 bg-white/5 p-4">
                    {/* Bậc Cầu Thang */}
                    <div className="space-y-1.5">
                        <Label className="font-bold text-[11px] text-slate-300 uppercase">Số bậc cầu thang (Tầng)</Label>
                        <Select value={stairSteps} onValueChange={setStairSteps}>
                            <SelectTrigger className="border-white/10 bg-black/50 text-white focus:ring-blue-500">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-800 bg-slate-900 text-white">
                                <SelectItem value="21">21 Bậc (Sinh)</SelectItem>
                                <SelectItem value="22">22 Bậc (Sinh - Theo Trụ)</SelectItem>
                                <SelectItem value="25">25 Bậc (Sinh)</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-500 italic">💡 Ảnh hưởng: Chiều cao cổ bậc & Khối lượng Bê tông, mặt đá Cầu thang.</p>
                    </div>

                    {/* Thước Lỗ Ban */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1 font-bold text-[11px] text-slate-300 uppercase"><Ruler className="h-3 w-3" /> Cửa theo Thước Lỗ Ban</Label>
                        <Select value={loBanDoor} onValueChange={setLoBanDoor}>
                            <SelectTrigger className="border-white/10 bg-black/50 text-white focus:ring-blue-500">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-800 bg-slate-900 text-white">
                                <SelectItem value="bat_buoc">Bắt buộc 100% Cung Đỏ (52.2cm)</SelectItem>
                                <SelectItem value="tuong_doi">Chỉ áp dụng Cửa Chính (Main Door)</SelectItem>
                                <SelectItem value="khong_quan_trong">Không quan trọng</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-500 italic">💡 Ảnh hưởng: Cảnh báo khi nhập sai kích thước cửa ở form Bóc tách.</p>
                    </div>

                    {/* Hóa giải Hướng xấu */}
                    <div className="space-y-1.5">
                        <Label className="flex items-center gap-1 font-bold text-[11px] text-slate-300 uppercase"><ShieldAlert className="h-3 w-3" /> Hóa giải Hướng Xấu</Label>
                        <Select value={remedyScreen} onValueChange={setRemedyScreen}>
                            <SelectTrigger className={`border-white/10 bg-black/50 focus:ring-blue-500 ${remedyScreen !== 'khong' ? 'text-amber-400 font-bold' : 'text-white'}`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-800 bg-slate-900 text-white">
                                <SelectItem value="khong">Không cần thiết</SelectItem>
                                <SelectItem value="co_vach_ngan">Yêu cầu xây Vách ngăn / Bình phong (Huyền quan)</SelectItem>
                                <SelectItem value="doi_cua">Yêu cầu đổi Hướng cửa chính</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-slate-500 italic">💡 Tự động nảy sinh mã công việc/vật tư "Vách Bình Phong" nếu yêu cầu.</p>
                    </div>

                    {/* Quy tắc Hầm cầu */}
                    <div className="space-y-1.5">
                        <Label className="font-bold text-[11px] text-slate-300 uppercase">Vị trí Bể phốt / Hầm cầu</Label>
                        <Select value={septicTankRule} onValueChange={setSepticTankRule}>
                            <SelectTrigger className="border-white/10 bg-black/50 text-white focus:ring-blue-500">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="border-slate-800 bg-slate-900 text-white">
                                <SelectItem value="tranh_trung_cung">Tuyệt đối tránh Trung Cung (Giữa nhà)</SelectItem>
                                <SelectItem value="duoi_gam_bep">Tránh đặt dưới gầm Bếp</SelectItem>
                                <SelectItem value="dat_truoc_nha">Ép buộc đặt ở sân trước</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    );
}