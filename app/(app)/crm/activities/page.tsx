import { Suspense } from "react";
import Link from "next/link";
import { Plus, Calendar as CalendarIcon } from "lucide-react";

// UI Components
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

// Business Components & Logic
import { createClient } from "@/lib/supabase/server";
import { ActivityCard } from "@/components/crm/activities/activity-card";
import { groupActivitiesByDate } from "@/lib/utils/date-grouping";
import { Activity } from "@/types/crm";

// Cấu hình render server
export const dynamic = "force-dynamic"; // Bắt buộc fetch mới mỗi lần load trang

export default async function ActivitiesPage() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                {/* Header Section */}
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Hoạt động</h2>
                    <Button asChild>
                        <Link href="/crm/activities/new">
                            <Plus className="mr-2 h-4 w-4" /> Thêm hoạt động
                        </Link>
                    </Button>
                </div>

                {/* Tabs Section */}
                <Tabs defaultValue="upcoming" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="upcoming">Sắp tới</TabsTrigger>
                        <TabsTrigger value="today">Hôm nay</TabsTrigger>
                        <TabsTrigger value="completed">Đã hoàn thành</TabsTrigger>
                        <TabsTrigger value="all">Tất cả</TabsTrigger>
                    </TabsList>

                    {/* Render Suspense Boundaries cho từng Tab để UX mượt mà */}
                    {["upcoming", "today", "completed", "all"].map((tabValue) => (
                        <TabsContent key={tabValue} value={tabValue} className="space-y-4">
                            <Suspense fallback={<ActivitiesLoading />}>
                                {/* Truyền filter xuống Server Component con */}
                                <ActivitiesListFetcher filter={tabValue} />
                            </Suspense>
                        </TabsContent>
                    ))}
                </Tabs>
            </div>
        </div>
    );
}

// --- Server Component Fetcher (Logic chính) ---
async function ActivitiesListFetcher({ filter }: { filter?: string }) {
    // 1. Khởi tạo Supabase Client
    const supabase = await createClient();

    try {
        // 2. Xây dựng câu truy vấn cơ bản
        // Lưu ý: Sử dụng 'customers (id, name)' để Left Join. 
        // Nếu dùng customers!inner thì activity không có khách hàng sẽ bị ẩn.
        let query = supabase.from("customer_activities").select(`
        id, 
        activity_type, 
        title, 
        description, 
        scheduled_at, 
        status, 
        created_at,
        customers (id, name)
      `);

        const now = new Date();
        // Tạo mốc thời gian cho bộ lọc "Hôm nay"
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
        const startOfTomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

        // 3. Áp dụng bộ lọc
        switch (filter) {
            case "upcoming":
                // Pending VÀ thời gian >= hiện tại
                query = query.eq("status", "pending").gte("scheduled_at", now.toISOString());
                break;
            case "today":
                // Trong khoảng 00:00 hôm nay đến 00:00 ngày mai
                query = query.gte("scheduled_at", startOfToday).lt("scheduled_at", startOfTomorrow);
                break;
            case "completed":
                query = query.eq("status", "completed");
                break;
            default: // "all"
                // Không filter thêm, lấy 50 cái mới nhất để tránh nặng
                query = query.limit(50);
                break;
        }

        // 4. Thực thi truy vấn
        const { data, error } = await query.order("scheduled_at", { ascending: true });

        // 5. Xử lý lỗi từ Supabase
        if (error) {
            console.error("[Activities Fetch Error]:", error.message);
            return (
                <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-md">
                    Không thể tải dữ liệu: {error.message}
                </div>
            );
        }

        // 6. Ép kiểu dữ liệu an toàn
        const activities = data as unknown as Activity[];

        // 7. Render trạng thái trống
        if (!activities || activities.length === 0) {
            return <EmptyState filter={filter} />;
        }

        // 8. Nhóm dữ liệu theo ngày (Sử dụng hàm util đã fix)
        const groupedActivities = groupActivitiesByDate(activities);

        // 9. Render danh sách
        return (
            <div className="space-y-8">
                {Object.entries(groupedActivities).map(([date, items]) => (
                    <section key={date} className="space-y-3">
                        <div className="flex items-center gap-2">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                {date} <span className="text-xs font-normal opacity-70">({items.length})</span>
                            </h3>
                            <div className="h-px bg-border flex-1" />
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                            {items.map((activity) => (
                                <ActivityCard key={activity.id} activity={activity} />
                            ))}
                        </div>
                    </section>
                ))}
            </div>
        );

    } catch (err) {
        // Catch-all block để bắt lỗi RangeError hoặc lỗi JS runtime khác
        console.error("[CRITICAL UI ERROR]:", err);
        return (
            <div className="p-4 border border-yellow-200 bg-yellow-50 text-yellow-800 rounded-md">
                Hệ thống đang gặp gián đoạn tạm thời. Vui lòng tải lại trang.
            </div>
        );
    }
}

// --- Helper Components ---

function EmptyState({ filter }: { filter?: string }) {
    let message = "Bạn chưa có hoạt động nào.";
    if (filter === "upcoming") message = "Không có hoạt động sắp tới.";
    if (filter === "today") message = "Hôm nay bạn rảnh rỗi!";
    if (filter === "completed") message = "Chưa có hoạt động nào hoàn thành.";

    return (
        <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed rounded-lg bg-muted/10 animate-in fade-in-50">
            <div className="bg-background p-3 rounded-full mb-4 shadow-sm">
                <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium">{message}</h3>
            <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                Tạo hoạt động mới để quản lý lịch trình làm việc hiệu quả hơn với khách hàng.
            </p>
            <Button className="mt-6" variant="outline" asChild>
                <Link href="/crm/activities/new">Thêm hoạt động ngay</Link>
            </Button>
        </div>
    );
}

function ActivitiesLoading() {
    return (
        <div className="space-y-8">
            {[1, 2].map((section) => (
                <div key={section} className="space-y-3">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-4 w-24" />
                        <div className="h-px bg-border flex-1" />
                    </div>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {[1, 2, 3].map((i) => (
                            <Card key={i} className="h-40">
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between">
                                        <Skeleton className="h-4 w-1/2" />
                                        <Skeleton className="h-4 w-16 rounded-full" />
                                    </div>
                                    <Skeleton className="h-3 w-1/3 mt-2" />
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-3 mt-2">
                                        <Skeleton className="h-8 w-8 rounded-full" />
                                        <div className="space-y-1">
                                            <Skeleton className="h-3 w-24" />
                                            <Skeleton className="h-3 w-16" />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}