"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import supabase from '@/lib/supabase/client';
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { Calendar, Phone, Users, Clock, AlertCircle } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"

interface Activity {
    id: string
    customer_id: string
    customer_name: string
    activity_type: string; // ✅ FIX: Đổi từ 'type' sang 'activity_type' khớp DB
    title: string
    description: string
    scheduled_at: string
    status: string
}

const activityIcons: Record<string, any> = {
    call: Phone,
    meeting: Users,
    task: Calendar,
    email: Calendar, // Fallback icon
}

export function UpcomingActivities() {
    const [activities, setActivities] = useState<Activity[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        async function fetchUpcomingActivities() {
            setIsLoading(true)
            try {
                const nextWeek = new Date()
                nextWeek.setDate(nextWeek.getDate() + 7)

                const { data, error } = await supabase
                    .from("customer_activities")
                    .select(`
            id, 
            activity_type, 
            title, 
            description, 
            scheduled_at, 
            status,
            customer_id,
            customers (name)
          `)
                    .gte("scheduled_at", new Date().toISOString())
                    .lte("scheduled_at", nextWeek.toISOString())
                    .order("scheduled_at", { ascending: true })
                    .limit(5)

                if (error) {
                    console.error('Error fetching activities details:', JSON.stringify(error, null, 2));
                    throw error;
                }

                const formattedActivities: Activity[] = (data || []).map((item: any) => {
                    // Xử lý an toàn cho quan hệ customers
                    let custName = "Khách hàng ẩn";
                    if (item.customers) {
                        if (Array.isArray(item.customers)) {
                            custName = item.customers[0]?.name || custName;
                        } else {
                            custName = item.customers.name || custName;
                        }
                    }

                    return {
                        id: item.id,
                        customer_id: item.customer_id,
                        customer_name: custName,
                        activity_type: item.activity_type, // ✅ FIX: Map đúng trường activity_type
                        title: item.title,
                        description: item.description,
                        scheduled_at: item.scheduled_at,
                        status: item.status,
                    }
                })

                setActivities(formattedActivities)
            } catch (error: any) {
                setErrorMsg(error.message || "Lỗi kết nối CSDL")
            } finally {
                setIsLoading(false)
            }
        }

        fetchUpcomingActivities()
    }, [])

    if (isLoading) {
        return (
            <div className="space-y-6">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-start space-x-4 animate-pulse">
                        <Skeleton className="h-9 w-9 rounded-full bg-muted/50" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-3/4 bg-muted/50" />
                            <Skeleton className="h-3 w-1/2 bg-muted/50" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (errorMsg) {
        return (
            <div className="flex flex-col items-center justify-center py-6 text-center border border-dashed border-destructive/50 rounded-lg bg-destructive/5 text-destructive">
                <AlertCircle className="h-8 w-8 mb-2 opacity-80" />
                <p className="text-sm font-medium">Không thể tải hoạt động</p>
                <p className="text-xs opacity-70 mt-1 max-w-[200px]">{errorMsg}</p>
            </div>
        )
    }

    if (activities.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-border rounded-lg bg-muted/10">
                <Clock className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
                <p className="text-muted-foreground text-sm">Không có hoạt động nào trong 7 ngày tới</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {activities.map((activity) => {
                // ✅ FIX: Sử dụng activity_type để lấy icon
                const ActivityIcon = activityIcons[activity.activity_type] || Calendar

                const initials = activity.customer_name
                    ? activity.customer_name.trim().split(/\s+/).map((n) => n[0]).join("").substring(0, 2).toUpperCase()
                    : "??"

                return (
                    <div key={activity.id} className="flex items-start group">
                        <Avatar className="h-9 w-9 mr-4 border border-border">
                            <AvatarFallback className="bg-primary/10 text-primary font-medium text-xs">
                                {initials}
                            </AvatarFallback>
                        </Avatar>

                        <div className="flex-1 space-y-1">
                            <div className="flex items-center gap-2">
                                <ActivityIcon className="h-3.5 w-3.5 text-muted-foreground" />
                                <p className="text-sm font-medium text-foreground">{activity.title}</p>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-1">
                                {activity.description || "Không có mô tả"}
                            </p>

                            <div className="flex items-center text-xs text-muted-foreground mt-1">
                                <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-foreground/80">
                                    {format(new Date(activity.scheduled_at), "PPp", { locale: vi })}
                                </span>
                                <span className="mx-2 text-border">•</span>
                                <span className="font-medium text-foreground/80">{activity.customer_name}</span>
                            </div>
                        </div>

                        <Button variant="ghost" size="sm" className="ml-auto h-8 text-xs hover:bg-muted">
                            Chi tiết
                        </Button>
                    </div>
                )
            })}
        </div>
    )
}