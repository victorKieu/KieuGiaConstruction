import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
    return (
        <div className="p-4 space-y-6">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-[200px]" />
                    <Skeleton className="h-4 w-[300px]" />
                </div>
                <Skeleton className="h-10 w-[120px]" />
            </div>

            {/* Cards Grid Skeleton (Mô phỏng 3 cái card thống kê trong video) */}
            <div className="grid gap-4 md:grid-cols-3">
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
                <Skeleton className="h-[120px] rounded-xl" />
            </div>

            {/* Chart/Table Skeleton */}
            <div className="space-y-4">
                <Skeleton className="h-[300px] w-full rounded-xl" />
            </div>
        </div>
    );
}