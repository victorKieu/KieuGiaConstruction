import { getPaymentRequests, getProjectsForSelect, getAccountingAccounts } from "@/lib/action/finance";
import CashbookManager from "@/components/finance/CashbookManager";
import { createClient } from "@/lib/supabase/server";
// Đổi đường dẫn import sao cho khớp với thư mục thực tế của anh
import { getUserProfile } from "@/lib/supabase/getUserProfile";

export const dynamic = "force-dynamic";

export default async function CashbookPage() {
    const supabase = await createClient();

    // 1. Dùng ngay hàm xịn sò đã được Cache của hệ thống
    const userProfile = await getUserProfile();

    // 2. Kéo thông tin cấu hình công ty
    const { data: companySettings } = await supabase
        .from('company_settings')
        .select('name, address')
        .eq('id', 'DEFAULT')
        .single();

    // 3. Tải dữ liệu song song từ Backend
    const [requests, projects, accounts] = await Promise.all([
        getPaymentRequests(),
        getProjectsForSelect(),
        getAccountingAccounts()
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

            {/* Truyền thẳng userProfile, bên trong đã có sẵn thuộc tính .role */}
            <CashbookManager
                initialRequests={requests}
                projects={projects}
                accounts={accounts}
                companySettings={companySettings}
                userProfile={userProfile}
            />
        </div>
    );
}