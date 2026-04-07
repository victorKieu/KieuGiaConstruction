"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, MapPinned, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { submitMobileCheckIn } from "@/lib/action/attendanceActions";

// ✅ Thêm interface để nhận hàm callback từ component cha
interface MobileCheckInProps {
    onCheckInSuccess?: () => void;
}

export function MobileCheckIn({ onCheckInSuccess }: MobileCheckInProps) {
    const [currentTime, setCurrentTime] = useState<string>("");
    const [currentDate, setCurrentDate] = useState<string>("");
    const [isLocating, setIsLocating] = useState(false);
    const [lastAction, setLastAction] = useState<{ type: string, message: string } | null>(null);

    useEffect(() => {
        const timer = setInterval(() => {
            const now = new Date();
            setCurrentTime(now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
            setCurrentDate(now.toLocaleDateString('vi-VN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }));
        }, 1000);
        return () => clearInterval(timer);
    }, []);

    const handleCheckIn = () => {
        if (!navigator.geolocation) {
            toast.error("Thiết bị của bạn không hỗ trợ GPS!");
            return;
        }

        setIsLocating(true);
        toast.loading("Đang xác định vị trí của bạn...", { id: "checkin-process" });

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;

                toast.loading("Đang gửi dữ liệu chấm công...", { id: "checkin-process" });

                const res = await submitMobileCheckIn({
                    lat: latitude,
                    lng: longitude
                });

                if (res.success) {
                    toast.success("Chấm công thành công!", { id: "checkin-process" });
                    setLastAction({ type: res.type || 'SUCCESS', message: res.message || 'Đã ghi nhận' });

                    // 🚀 GỌI HÀM REFRESH DATA CỦA THẰNG CHA
                    if (onCheckInSuccess) {
                        onCheckInSuccess();
                    }
                } else {
                    toast.error(res.error, { id: "checkin-process", duration: 5000 });
                }
                setIsLocating(false);
            },
            (error) => {
                setIsLocating(false);
                let errMsg = "Không thể lấy vị trí.";
                if (error.code === error.PERMISSION_DENIED) errMsg = "Vui lòng cho phép ứng dụng truy cập Vị trí (Location).";
                if (error.code === error.TIMEOUT) errMsg = "Lấy vị trí quá lâu, vui lòng thử lại ở nơi có sóng GPS tốt hơn.";

                toast.error(errMsg, { id: "checkin-process", duration: 5000 });
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    };

    return (
        <Card className="border-indigo-100 dark:border-slate-800 shadow-lg bg-gradient-to-b from-indigo-50 to-white dark:from-slate-900 dark:to-slate-950 mx-auto max-w-md overflow-hidden transition-colors">
            <CardContent className="pt-10 pb-12 flex flex-col items-center justify-center space-y-8">

                {/* Đồng hồ */}
                <div className="text-center space-y-2">
                    <div className="text-5xl font-mono font-bold text-indigo-800 dark:text-indigo-400 tracking-wider">
                        {currentTime || "--:--:--"}
                    </div>
                    <div className="text-sm font-medium text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                        {currentDate || "Đang tải ngày..."}
                    </div>
                </div>

                {/* Nút bấm khổng lồ */}
                <div className="relative">
                    {/* Hiệu ứng gợn sóng khi rảnh */}
                    {!isLocating && (
                        <div className="absolute inset-0 rounded-full border-4 border-indigo-200 dark:border-indigo-500/30 animate-ping opacity-75"></div>
                    )}

                    <button
                        onClick={handleCheckIn}
                        disabled={isLocating}
                        className={`
                            relative z-10 w-48 h-48 rounded-full flex flex-col items-center justify-center text-white 
                            shadow-2xl transition-all duration-300
                            ${isLocating
                                ? "bg-indigo-400 dark:bg-indigo-600/50 scale-95 cursor-not-allowed"
                                : "bg-indigo-600 dark:bg-indigo-500 hover:bg-indigo-700 dark:hover:bg-indigo-600 active:scale-90 shadow-indigo-600/40 dark:shadow-indigo-500/20 hover:shadow-indigo-600/60"
                            }
                        `}
                    >
                        {isLocating ? (
                            <>
                                <Loader2 className="w-12 h-12 mb-3 animate-spin text-indigo-100" />
                                <span className="font-bold text-lg animate-pulse">ĐANG XỬ LÝ...</span>
                            </>
                        ) : (
                            <>
                                <MapPinned className="w-14 h-14 mb-2 drop-shadow-md" />
                                <span className="font-bold text-2xl tracking-wide">CHẤM CÔNG</span>
                                <span className="text-xs font-medium opacity-90 mt-1 bg-black/10 dark:bg-black/20 px-3 py-1 rounded-full">
                                    Bấm để quét GPS
                                </span>
                            </>
                        )}
                    </button>
                </div>

                {/* Phản hồi trạng thái */}
                <div className="h-16 flex items-center justify-center w-full px-4">
                    {lastAction ? (
                        <div className="flex items-start gap-2 text-sm text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-4 py-3 rounded-lg border border-emerald-100 dark:border-emerald-500/20 w-full animate-in slide-in-from-bottom-2">
                            <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5 text-emerald-500 dark:text-emerald-400" />
                            <span className="font-medium leading-snug">{lastAction.message}</span>
                        </div>
                    ) : (
                        <div className="flex items-center text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border dark:border-slate-800">
                            <MapPin className="w-3.5 h-3.5 mr-1.5" />
                            Yêu cầu bật định vị (Location)
                        </div>
                    )}
                </div>

            </CardContent>
        </Card>
    );
}