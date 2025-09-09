"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
    CardDescription,
} from "@/components/ui/card"
import supabase from "@/lib/supabase/client"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar, Check, Clock, Phone, Users } from "lucide-react"

interface Customer {
    name: string
}

interface Activity {
    id: string
    activity_type: string
    title: string
    description: string
    scheduled_at: string
    status: string
    created_at: string
    customer_id: string
    customer?: Customer
}

interface CustomerActivitiesProps {
    customerId: string
}

const activityIcons: Record<string, any> = {
    call: Phone,
    meeting: Users,
    task: Calendar,
}

const activityStatusColors: Record<string, string> = {
    pending: "bg-yellow-100 text-yellow-800",
    completed: "bg-green-100 text-green-800",
    cancelled: "bg-red-100 text-red-800",
}

const activityTypeLabels: Record<string, string> = {
    call: "Cuộc gọi",
    meeting: "Cuộc họp",
    task: "Nhiệm vụ",
    email: "Email",
    other: "Khác",
}

export function CustomerActivities({ customerId }: CustomerActivitiesProps) {
    const [activities, setActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchActivities() {
            try {
                const { data, error } = await supabase
                    .from("customer_activities")
                    .select(`
            id, activity_type, title, description, status, scheduled_at, created_at, customer_id,
            customer:customers!customer_activities_customer_id_fkey(name)
          `)
                    .eq("customer_id", customerId)
                    .order("created_at", { ascending: false })

                if (error) throw error
                if (!data) throw new Error("Không có dữ liệu hoạt động.")

                // ✅ Chuẩn hóa customer nếu là mảng
                const normalized = data.map((a: any) => ({
                    ...a,
                    customer: Array.isArray(a.customer) ? a.customer[0] : a.customer,
                }))

                setActivities(normalized)
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu hoạt động:", error)
                setError("Không thể tải hoạt động khách hàng.")
            } finally {
                setIsLoading(false)
            }
        }

        setIsLoading(true)
        setError(null)
        fetchActivities()
    }, [customerId])

    async function markAsCompleted(activityId: string) {
        try {
            const { error } = await supabase
                .from("customer_activities")
                .update({ status: "completed" })
                .eq("id", activityId)

            if (error) throw error

            setActivities((prev) =>
                prev.map((a) =>
                    a.id === activityId ? { ...a, status: "completed" } : a
                )
            )
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái:", error)
        }
    }

    if (isLoading) {
        return (
            <Card>
                <CardContent className="text-center py-10">
                    <p className="text-muted-foreground mb-4">Đang tải hoạt động...</p>
                </CardContent>
            </Card>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="text-center py-10">
                    <p className="text-red-500 mb-4">{error}</p>
                    <Button onClick={() => window.location.reload()}>Thử lại</Button>
                </CardContent>
            </Card>
        )
    }

    if (activities.length === 0) {
        return (
            <Card>
                <CardContent className="text-center py-10">
                    <p className="text-muted-foreground mb-4">
                        Chưa có hoạt động nào với khách hàng này
                    </p>
                    <Button asChild>
                        <Link href={`/crm/customers/${customerId}/activities/new`}>
                            Thêm hoạt động mới
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-4">
            {activities.map((activity) => {
                const ActivityIcon = activityIcons[activity.activity_type] || Calendar
                const statusClass =
                    activityStatusColors[activity.status] || "bg-gray-100 text-gray-800"
                const isPast = new Date(activity.scheduled_at) < new Date()

                return (
                    <Card key={activity.id}>
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                                    <CardTitle className="text-base">{activity.title}</CardTitle>
                                </div>
                                <span
                                    className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusClass}`}
                                >
                                    {activity.status === "pending"
                                        ? "Chờ xử lý"
                                        : activity.status === "completed"
                                            ? "Hoàn thành"
                                            : "Đã hủy"}
                                </span>
                            </div>
                            <CardDescription className="text-xs flex items-center gap-1">
                                {isPast ? (
                                    <Clock className="h-3 w-3" />
                                ) : (
                                    <Calendar className="h-3 w-3" />
                                )}
                                {format(new Date(activity.scheduled_at), "PPp", { locale: vi })}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-2">
                            <p className="text-sm">{activity.description}</p>
                        </CardContent>
                        <CardFooter className="pt-2 flex justify-between">
                            <span className="text-xs text-muted-foreground">
                                Tạo lúc:{" "}
                                {format(new Date(activity.created_at), "PPp", { locale: vi })}
                            </span>
                            {activity.status === "pending" && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1"
                                    onClick={() => markAsCompleted(activity.id)}
                                >
                                    <Check className="h-3 w-3" /> Đánh dấu hoàn thành
                                </Button>
                            )}
                        </CardFooter>
                    </Card>
                )
            })}
            <div className="flex justify-center">
                <Button asChild>
                    <Link href={`/crm/customers/${customerId}/activities/new`}>
                        Thêm hoạt động mới
                    </Link>
                </Button>
            </div>
        </div>
    )
}