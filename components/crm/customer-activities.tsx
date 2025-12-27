"use client"

import { useEffect, useState, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card"
import supabase from "@/lib/supabase/client"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import {
    Calendar,
    Check,
    Clock,
    Phone,
    Users,
    Mail,
    FileText,
    AlertCircle,
    MoreHorizontal
} from "lucide-react"
import { cn } from "@/lib/utils/utils" // Giả sử bạn có util này (thường có trong shadcn)

// --- TYPES ---
interface Activity {
    id: string
    activity_type: string
    title: string
    description: string
    scheduled_at: string
    status: "pending" | "completed" | "cancelled"
    created_at: string
    customer_id: string
}

interface CustomerActivitiesProps {
    customerId: string
}

// --- CONSTANTS & CONFIG ---
const ACTIVITY_ICONS: Record<string, any> = {
    call: Phone,
    meeting: Users,
    task: Calendar,
    email: Mail,
    other: FileText,
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon?: any }> = {
    pending: {
        label: "Chờ xử lý",
        color: "bg-yellow-100 text-yellow-800 border-yellow-200",
        icon: Clock
    },
    completed: {
        label: "Hoàn thành",
        color: "bg-green-100 text-green-800 border-green-200",
        icon: Check
    },
    cancelled: {
        label: "Đã hủy",
        color: "bg-red-100 text-red-800 border-red-200",
        icon: AlertCircle
    },
}

const TYPE_LABELS: Record<string, string> = {
    call: "Cuộc gọi",
    meeting: "Cuộc họp",
    task: "Nhiệm vụ",
    email: "Email",
    other: "Khác",
}

// --- SUB-COMPONENT: ACTIVITY ITEM ---
// Tách ra để code chính gọn gàng hơn
function ActivityItem({
    activity,
    onComplete,
}: {
    activity: Activity
    onComplete: (id: string) => void
}) {
    const Icon = ACTIVITY_ICONS[activity.activity_type] || FileText
    const statusConfig = STATUS_CONFIG[activity.status] || STATUS_CONFIG.pending
    const isPast = new Date(activity.scheduled_at) < new Date() && activity.status === 'pending'

    return (
        <Card className={cn("transition-all hover:shadow-md", isPast ? "border-red-200" : "")}>
            <CardHeader className="pb-2 grid grid-cols-[1fr_auto] items-start gap-4 space-y-0">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="p-2 bg-muted rounded-full">
                            <Icon className="h-4 w-4 text-foreground" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-semibold leading-none">
                                {activity.title}
                            </CardTitle>
                            <p className="text-xs text-muted-foreground mt-1">
                                {TYPE_LABELS[activity.activity_type] || "Hoạt động"}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Status Badge */}
                <div className={cn(
                    "inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium border",
                    statusConfig.color
                )}>
                    {statusConfig.label}
                </div>
            </CardHeader>

            <CardContent className="pb-2">
                <p className="text-sm text-foreground/80 whitespace-pre-line">
                    {activity.description || "Không có mô tả chi tiết."}
                </p>

                {/* Thời gian */}
                <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className={cn("flex items-center gap-1", isPast && "text-red-600 font-medium")}>
                        <Calendar className="h-3.5 w-3.5" />
                        <span>
                            Lịch: {format(new Date(activity.scheduled_at), "PPp", { locale: vi })}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        <span>Tạo: {format(new Date(activity.created_at), "dd/MM/yyyy", { locale: vi })}</span>
                    </div>
                </div>
            </CardContent>

            {/* Action Footer */}
            {activity.status === "pending" && (
                <CardFooter className="pt-2 pb-4 bg-muted/20 border-t">
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 gap-2 ml-auto hover:bg-green-100 hover:text-green-700"
                        onClick={() => onComplete(activity.id)}
                    >
                        <Check className="h-4 w-4" />
                        Đánh dấu hoàn thành
                    </Button>
                </CardFooter>
            )}
        </Card>
    )
}

// --- MAIN COMPONENT ---
export function CustomerActivities({ customerId }: CustomerActivitiesProps) {
    const [activities, setActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Dùng useCallback để tránh re-create function khi render lại
    const fetchActivities = useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const { data, error } = await supabase
                .from("customer_activities")
                .select("*") // Lấy hết fields, không cần join customer vì đã biết customerId rồi
                .eq("customer_id", customerId)
                .order("created_at", { ascending: false })

            if (error) throw error
            setActivities(data || [])
        } catch (err: any) {
            console.error("Fetch error:", err)
            setError(err.message || "Không thể tải dữ liệu.")
        } finally {
            setIsLoading(false)
        }
    }, [customerId])

    useEffect(() => {
        fetchActivities()
    }, [fetchActivities])

    const handleMarkCompleted = async (activityId: string) => {
        // 1. Optimistic Update (Cập nhật giao diện ngay lập tức để cảm giác nhanh hơn)
        setActivities((prev) =>
            prev.map((a) => (a.id === activityId ? { ...a, status: "completed" } : a))
        )

        // 2. Gọi API Background
        try {
            const { error } = await supabase
                .from("customer_activities")
                .update({ status: "completed" })
                .eq("id", activityId)

            if (error) throw error
        } catch (err: any) {
            // Sửa lại cách log lỗi để nhìn thấy nội dung bên trong
            console.error("Update error detailed:", JSON.stringify(err, null, 2));
            console.error("Message:", err.message);
            console.error("Details:", err.details);

            // Revert nếu lỗi
            fetchActivities()
        }
    }

    // --- RENDERS ---

    if (isLoading) {
        return (
            <div className="space-y-4">
                {[1, 2].map((i) => (
                    <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="p-6 text-center border rounded-lg bg-red-50 text-red-600">
                <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                <p>{error}</p>
                <Button variant="outline" size="sm" onClick={fetchActivities} className="mt-4 bg-white">
                    Thử lại
                </Button>
            </div>
        )
    }

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 border border-dashed rounded-lg bg-muted/10">
                <div className="p-3 bg-muted rounded-full mb-3">
                    <Calendar className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium">Chưa có hoạt động</h3>
                <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
                    Khách hàng này chưa có lịch sử tương tác nào. Hãy bắt đầu ngay!
                </p>
                <Button asChild>
                    <Link href={`/crm/customers/${customerId}/activities/new`}>
                        <MoreHorizontal className="mr-2 h-4 w-4" />
                        Thêm hoạt động
                    </Link>
                </Button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Lịch sử hoạt động ({activities.length})</h3>
                <Button asChild size="sm">
                    <Link href={`/crm/customers/${customerId}/activities/new`}>
                        Thêm mới
                    </Link>
                </Button>
            </div>

            <div className="space-y-4">
                {activities.map((activity) => (
                    <ActivityItem
                        key={activity.id}
                        activity={activity}
                        onComplete={handleMarkCompleted}
                    />
                ))}
            </div>
        </div>
    )
}