// components/hrm/CheckpointTimeline.tsx
import React from "react";
import { MapPin, Clock, ArrowRight, Building2, HardHat } from "lucide-react";
import { formatDate } from "@/lib/utils/utils";

export function CheckpointTimeline({ checkpoints }: { checkpoints: any[] }) {
    if (!checkpoints || checkpoints.length === 0) return null;

    return (
        <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:h-full before:w-0.5 before:bg-slate-200 dark:before:bg-slate-800">
            {checkpoints.map((cp, index) => (
                <div key={cp.id} className="relative pl-12">
                    {/* Icon đại diện điểm đến */}
                    <div className="absolute left-0 p-2 bg-white dark:bg-slate-900 border-2 border-blue-500 rounded-full z-10">
                        {cp.project_id ? <HardHat className="w-5 h-5 text-blue-600" /> : <Building2 className="w-5 h-5 text-emerald-600" />}
                    </div>

                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-bold text-slate-800 dark:text-slate-200">
                                {cp.projects?.name || "Văn phòng Công ty"}
                            </h4>
                            <span className="text-[10px] uppercase px-2 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-slate-500">
                                Điểm số {index + 1}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div className="space-y-1">
                                <div className="flex items-center text-slate-500">
                                    <Clock className="w-3 h-3 mr-1.5" /> Giờ đến
                                </div>
                                <div className="font-medium text-blue-600 dark:text-blue-400">
                                    {new Date(cp.check_in_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                                </div>
                            </div>

                            <div className="space-y-1">
                                <div className="flex items-center text-slate-500">
                                    <Clock className="w-3 h-3 mr-1.5" /> Giờ đi
                                </div>
                                <div className="font-medium text-orange-600 dark:text-orange-400">
                                    {cp.check_out_time
                                        ? new Date(cp.check_out_time).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
                                        : "Đang ở đây"}
                                </div>
                            </div>
                        </div>

                        {/* Tọa độ (Dùng để sau này tích hợp bản đồ) */}
                        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center text-[11px] text-slate-400">
                            <MapPin className="w-3 h-3 mr-1" />
                            {cp.check_in_lat.toFixed(5)}, {cp.check_in_lng.toFixed(5)}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}