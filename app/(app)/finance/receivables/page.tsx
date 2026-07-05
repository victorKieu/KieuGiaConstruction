import { getAllReceivables, getProjectsForSelect } from "@/lib/action/finance";
import ReceivablesManager from "@/components/finance/ReceivablesManager";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
    // Kéo dữ liệu song song từ Backend (Bổ sung lấy danh sách Dự án)
    const [receivables, projects] = await Promise.all([
        getAllReceivables(),
        getProjectsForSelect()
    ]);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">
                        Công nợ Phải thu (AR)
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Theo dõi công nợ Khách hàng, Đợt thanh toán hợp đồng và lập đề nghị báo Có.
                    </p>
                </div>
            </div>

            {/* Đã truyền thêm danh sách projects vào Component để gắn hóa đơn */}
            <ReceivablesManager milestones={receivables} projects={projects} />
        </div>
    );
}