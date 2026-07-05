import { getVatInvoices } from "@/lib/action/finance";
import TaxReportDashboard from "@/components/finance/TaxReportDashboard"; // Đổi tên Component

export const dynamic = "force-dynamic";

export default async function TaxPage() {
    // Kéo toàn bộ dữ liệu Hóa đơn đã được AP và AR nhập liệu/đồng bộ
    const { inputVat, outputVat } = await getVatInvoices();

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">
                        Báo Cáo Thuế GTGT
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Tự động tổng hợp dữ liệu từ phân hệ Công nợ (AP/AR). Tính toán cấn trừ thuế đầu vào và đầu ra.
                    </p>
                </div>
            </div>

            <TaxReportDashboard inputVat={inputVat} outputVat={outputVat} />
        </div>
    );
}