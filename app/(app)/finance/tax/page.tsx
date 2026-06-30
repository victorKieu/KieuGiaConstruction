import { getVatInvoices } from "@/lib/action/finance";
import TaxManager from "@/components/finance/TaxManager";

export const dynamic = "force-dynamic";

export default async function TaxPage() {
    // 1. Kéo dữ liệu từ Database
    const { inputVat, outputVat } = await getVatInvoices();

    // 2. Truyền dữ liệu vào Component con
    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">
                        Kế Toán Thuế & Hóa Đơn (VAT)
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Quản lý Bảng kê Hóa đơn GTGT Mua vào / Bán ra và tính toán thuế khấu trừ.
                    </p>
                </div>
            </div>

            {/* Gọi Component hiển thị ở đây */}
            <TaxManager inputVat={inputVat} outputVat={outputVat} />
        </div>
    );
}