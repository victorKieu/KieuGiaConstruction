"use client";

import { usePathname } from "next/navigation";
import PaymentStageManager from "@/components/projects/finance/PaymentStageManager";

export default function ProjectFinanceTab({ stats }: { stats: any }) {
    const pathname = usePathname();
    // Lấy ID từ URL /projects/[id]
    const projectId = pathname.split('/')[2];

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">

            {/* MODULE QUẢN LÝ TIẾN ĐỘ THANH TOÁN (LIÊN KẾT VỚI HỢP ĐỒNG) */}
            <PaymentStageManager
                projectId={projectId}
            />

            {/* CÁC THỐNG KÊ KHÁC (NẾU CẦN) */}
            <div className="pt-8 border-t">
                <h3 className="text-lg font-bold text-slate-800 mb-4">Tổng quan Thu Chi (Toàn dự án)</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Bạn có thể render các biểu đồ cũ ở đây nếu muốn giữ lại */}
                    <div className="p-4 bg-slate-50 rounded border text-center text-sm text-slate-500">
                        Biểu đồ dòng tiền (Đang phát triển)
                    </div>
                </div>
            </div>
        </div>
    );
}