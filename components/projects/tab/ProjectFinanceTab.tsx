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

        </div>
    );
}