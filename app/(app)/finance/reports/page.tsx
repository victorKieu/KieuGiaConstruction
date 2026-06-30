import { getPnLReport, getProjectsForSelect } from "@/lib/action/finance";
import ReportManager from "@/components/finance/ReportManager";

export const dynamic = "force-dynamic";

// Khai báo searchParams dưới dạng Promise (Chuẩn Next.js 15+)
export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ project?: string }> }) {

    // Đợi giải nén tham số từ URL
    const resolvedParams = await searchParams;
    const projectId = resolvedParams.project || 'all';

    // Tải dữ liệu song song
    const [pnlRes, projects] = await Promise.all([
        getPnLReport(projectId),
        getProjectsForSelect()
    ]);

    const reportData = pnlRes.success ? pnlRes.data : null;

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">
                        Báo Cáo Hoạt Động Kinh Doanh (P&L)
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Phân tích chuyên sâu Lợi nhuận gộp theo từng dự án và Lợi nhuận ròng toàn công ty.
                    </p>
                </div>
            </div>

            <ReportManager reportData={reportData} projects={projects} currentProject={projectId} />
        </div>
    );
}