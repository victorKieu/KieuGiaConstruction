import { getJournalEntries } from "@/lib/action/finance";
import JournalManager from "@/components/finance/JournalManager";

export const dynamic = "force-dynamic";

export default async function JournalsPage() {
    const journals = await getJournalEntries();

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">
                        Sổ Nhật Ký Chung
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Lịch sử hạch toán kế toán toàn công ty (Double-Entry Ledger).
                    </p>
                </div>
            </div>

            <JournalManager initialData={journals} />
        </div>
    );
}