import { Loader2 } from "lucide-react";

export default function EstimationLoading() {
    return (
        <div className="p-6 space-y-6 w-full max-w-[1920px] mx-auto">
            <div className="space-y-2">
                {/* Sử dụng thẻ div với animate-pulse thay cho component Skeleton */}
                <div className="h-4 w-1/6 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
                <div className="h-8 w-1/3 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
            </div>

            <div className="h-[70vh] w-full border border-dashed border-slate-200 rounded-xl flex items-center justify-center flex-col space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                <p className="text-sm font-bold text-slate-600 dark:text-slate-400 uppercase tracking-widest animate-pulse">
                    Đang nạp định mức & ma trận khối lượng...
                </p>
            </div>
        </div>
    );
}