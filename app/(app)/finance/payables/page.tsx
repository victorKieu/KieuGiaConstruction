import { getPOsPendingInvoice, getPayableInvoices } from "@/lib/action/finance";
import AccountsPayableManager from "@/components/finance/AccountsPayableManager";

export const dynamic = "force-dynamic";

export default async function PayablesPage() {
    // Load dữ liệu song song
    const [pendingPOs, invoices] = await Promise.all([
        getPOsPendingInvoice(),
        getPayableInvoices()
    ]);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">
                        Công nợ Phải trả (AP)
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Theo dõi hóa đơn đầu vào, công nợ và thanh toán cho Nhà cung cấp.
                    </p>
                </div>
            </div>

            {/* Component chính */}
            <AccountsPayableManager pendingPOs={pendingPOs} invoices={invoices} />
        </div>
    );
}