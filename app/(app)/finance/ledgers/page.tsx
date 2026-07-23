import React from "react"; // ✅ Thêm dòng này để fix lỗi UMD Global
import { getGeneralLedgerData } from "@/lib/action/accounting";
import { GeneralLedger } from "@/components/finance/general-ledger"; // ⚠️ Đảm bảo anh đã tạo file này đúng trong thư mục finance

export const dynamic = "force-dynamic";

export default async function GeneralLedgerPage() {
    const { success, journalLines, projects, accounts } = await getGeneralLedgerData();

    if (!success) {
        return <div className="p-8 font-bold text-red-500">Lỗi tải dữ liệu Sổ cái Kế toán.</div>;
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Sổ Cái Kế Toán (General Ledger)</h2>
            </div>

            {/* Truyền toàn bộ dữ liệu xuống Client Component */}
            <GeneralLedger
                journalLines={journalLines || []}
                projects={projects || []}
                accounts={accounts || []}
            />
        </div>
    );
}