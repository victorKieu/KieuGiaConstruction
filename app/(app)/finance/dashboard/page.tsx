import { getFinanceDashboardData } from "@/lib/action/finance";
import FinanceDashboard from "@/components/finance/FinanceDashboard";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    // Chỉ cần gọi 1 hàm duy nhất (Đã bao gồm cả Số dư & Biểu đồ)
    const dashboardRes = await getFinanceDashboardData();

    // Bóc tách dữ liệu an toàn
    const stats = dashboardRes.success && dashboardRes.data
        ? dashboardRes.data.stats
        : { totalCash: 0, totalAR: 0, totalAP: 0 };

    const monthlyStats = dashboardRes.success && dashboardRes.data
        ? dashboardRes.data.monthlyStats
        : [];

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">
                        Tổng Quan Tài Chính (FICO)
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Bức tranh toàn cảnh về Dòng tiền, Quỹ và Công nợ doanh nghiệp.
                    </p>
                </div>
            </div>

            <FinanceDashboard stats={stats} monthlyStats={monthlyStats} />
        </div>
    );
}