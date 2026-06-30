import { getPaymentRequests, getProjectsForSelect, getAccountingAccounts } from "@/lib/action/finance";
import CashbookManager from "@/components/finance/CashbookManager";

export const dynamic = "force-dynamic";

export default async function CashbookPage() {
    // Tải dữ liệu song song từ Backend
    const [requests, projects, accounts] = await Promise.all([
        getPaymentRequests(),
        getProjectsForSelect(),
        getAccountingAccounts() // Lấy danh sách tài khoản 111, 112, 154...
    ]);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
                        Sổ Quỹ & Quy trình Thu/Chi
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1">
                        Quản lý đề nghị thanh toán, phê duyệt và hạch toán bút toán Tiền mặt/Ngân hàng.
                    </p>
                </div>
            </div>

            {/* Truyền dữ liệu thật vào Component giao diện */}
            <CashbookManager
                initialRequests={requests}
                projects={projects}
                accounts={accounts}
            />
        </div>
    );
}