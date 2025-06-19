import { Suspense } from "react"
import Link from "next/link"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { format, isToday, isTomorrow, isYesterday } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar, Check, Clock, Phone, Plus, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";
export default async function ActivitiesPage() {
  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Hoạt động</h2>
          <Button asChild>
            <Link href="/crm/activities/new">
              <Plus className="mr-2 h-4 w-4" /> Thêm hoạt động mới
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="upcoming" className="space-y-4">
          <TabsList>
            <TabsTrigger value="upcoming">Sắp tới</TabsTrigger>
            <TabsTrigger value="today">Hôm nay</TabsTrigger>
            <TabsTrigger value="completed">Đã hoàn thành</TabsTrigger>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming" className="space-y-4">
            <Suspense fallback={<ActivitiesLoading />}>
              <ActivitiesList filter="upcoming" />
            </Suspense>
          </TabsContent>

          <TabsContent value="today" className="space-y-4">
            <Suspense fallback={<ActivitiesLoading />}>
              <ActivitiesList filter="today" />
            </Suspense>
          </TabsContent>

          <TabsContent value="completed" className="space-y-4">
            <Suspense fallback={<ActivitiesLoading />}>
              <ActivitiesList filter="completed" />
            </Suspense>
          </TabsContent>

          <TabsContent value="all" className="space-y-4">
            <Suspense fallback={<ActivitiesLoading />}>
              <ActivitiesList />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

async function ActivitiesList({ filter }: { filter?: string }) {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    let query = supabase.from("customer_activities").select(`
      id, 
      type, 
      title, 
      description, 
      scheduled_at, 
      status, 
      created_at,
      customer_id,
      customers (id, name)
    `)

    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

    if (filter === "upcoming") {
        query = query.eq("status", "pending").gte("scheduled_at", now.toISOString())
    } else if (filter === "today") {
        query = query.gte("scheduled_at", today.toISOString()).lt("scheduled_at", tomorrow.toISOString())
    } else if (filter === "completed") {
        query = query.eq("status", "completed")
    }

    const { data: activities, error } = await query.order("scheduled_at", { ascending: true })

    if (error) {
        console.error("Error fetching activities:", error)
        return <div>Đã xảy ra lỗi khi tải dữ liệu</div>
    }

    if (!activities || activities.length === 0) {
        return (
            <div className="text-center py-10">
                <h3 className="text-lg font-medium">Không có hoạt động nào</h3>
                <p className="text-muted-foreground mt-2">Thêm hoạt động mới để bắt đầu</p>
                <Button className="mt-4" asChild>
                    <Link href="/crm/activities/new">Thêm hoạt động mới</Link>
                </Button>
            </div>
        )
    }

    const activityIcons: Record<string, any> = {
        call: Phone,
        meeting: Users,
        task: Calendar,
    }

    const statusColors: Record<string, string> = {
        pending: "bg-yellow-100 text-yellow-800",
        completed: "bg-green-100 text-green-800",
        cancelled: "bg-red-100 text-red-800",
    }

    const statusLabels: Record<string, string> = {
        pending: "Chờ xử lý",
        completed: "Hoàn thành",
        cancelled: "Đã hủy",
    }

    // Nhóm hoạt động theo ngày
    const groupedActivities: Record<string, typeof activities> = {}

    activities.forEach((activity) => {
        const date = new Date(activity.scheduled_at)
        let dateKey = ""

        if (isToday(date)) {
            dateKey = "Hôm nay"
        } else if (isTomorrow(date)) {
            dateKey = "Ngày mai"
        } else if (isYesterday(date)) {
            dateKey = "Hôm qua"
        } else {
            dateKey = format(date, "EEEE, dd/MM/yyyy", { locale: vi })
            dateKey = dateKey.charAt(0).toUpperCase() + dateKey.slice(1)
        }

        if (!groupedActivities[dateKey]) {
            groupedActivities[dateKey] = []
        }

        groupedActivities[dateKey].push(activity)
    })

    return (
        <div className="space-y-6">
            {Object.entries(groupedActivities).map(([date, dateActivities]) => (
                <div key={date} className="space-y-4">
                    <h3 className="text-lg font-medium">{date}</h3>
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {dateActivities.map((activity) => {
                            const ActivityIcon = activityIcons[activity.type] || Calendar
                            const statusColor = statusColors[activity.status] || "bg-gray-100 text-gray-800"
                            const statusLabel = statusLabels[activity.status] || activity.status
                            const isPast = new Date(activity.scheduled_at) < new Date()

                            // customers là mảng, lấy phần tử đầu tiên
                            const customers = activity.customers || []
                            const customer = customers.length > 0 ? customers[0] : null
                            const customerName = customer?.name || "Khách hàng không xác định"

                            const initials = customerName
                                .split(" ")
                                .map((n: string) => n[0])
                                .join("")
                                .toUpperCase()
                                .substring(0, 2)

                            return (
                                <Card key={activity.id}>
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                                                <CardTitle className="text-base">{activity.title}</CardTitle>
                                            </div>
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                                            >
                                                {statusLabel}
                                            </span>
                                        </div>
                                        <CardDescription className="text-xs flex items-center gap-1">
                                            {isPast ? <Clock className="h-3 w-3" /> : <Calendar className="h-3 w-3" />}
                                            {format(new Date(activity.scheduled_at), "p", { locale: vi })}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pb-2">
                                        <div className="flex items-center gap-3 mb-3">
                                            <Avatar className="h-8 w-8">
                                                <AvatarFallback>{initials}</AvatarFallback>
                                            </Avatar>
                                            <div>
                                                <p className="text-sm font-medium">{customerName}</p>
                                                {customer && (
                                                    <Link
                                                        href={`/crm/customers/${customer.id}`}
                                                        className="text-xs text-muted-foreground hover:underline"
                                                    >
                                                        Xem khách hàng
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                        <p className="text-sm line-clamp-2">{activity.description}</p>
                                    </CardContent>
                                    <CardFooter className="pt-2 flex justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Tạo lúc: {format(new Date(activity.created_at), "dd/MM/yyyy", { locale: vi })}
                                        </span>
                                        {activity.status === "pending" && (
                                            <Button size="sm" variant="outline" className="h-7 gap-1">
                                                <Check className="h-3 w-3" /> Hoàn thành
                                            </Button>
                                        )}
                                    </CardFooter>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            ))}
        </div>
    )
}


function ActivitiesLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array(3)
            .fill(0)
            .map((_, i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-5 w-[120px]" />
                    <Skeleton className="h-5 w-[80px] rounded-full" />
                  </div>
                  <div className="pt-1">
                    <Skeleton className="h-4 w-[100px]" />
                  </div>
                </CardHeader>
                <CardContent className="pb-2">
                  <div className="flex items-center gap-3 mb-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div>
                      <Skeleton className="h-4 w-[100px] mb-1" />
                      <Skeleton className="h-3 w-[80px]" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full mb-1" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
                <CardFooter className="pt-2 flex justify-between">
                  <Skeleton className="h-3 w-[120px]" />
                  <Skeleton className="h-7 w-[100px] rounded-md" />
                </CardFooter>
              </Card>
            ))}
        </div>
      </div>
    </div>
  )
}
