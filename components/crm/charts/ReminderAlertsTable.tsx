"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"

type DueItem = {
    item_id: string
    title: string
    type: "contract" | "opportunity" | "task"
    customer_name: string
    employee_name: string
    remind_at: string
    status: string
}

export function ReminderAlertsTable() {
    const [data, setData] = useState<DueItem[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchDueItems() {
            const { data, error } = await supabase
                .from("crm_reminder_alerts")
                .select("item_id, title, type, customer_name, employee_name, remind_at, status")
                .lte("due_date", new Date().toISOString()) // lấy các mục đến hạn hoặc quá hạn

            if (error) {
                console.error("Lỗi khi lấy dữ liệu cảnh báo đến hạn:", error.message || error)
            } else {
                setData(data as DueItem[])
            }

            setLoading(false)
        }

        fetchDueItems()
    }, [])

    if (loading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-[200px] w-full" />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                Không có cảnh báo đến hạn
            </div>
        )
    }

    return (
        <Card>
            <CardContent className="space-y-4">
                {data.map((item) => (
                    <div key={item.item_id} className="flex items-center gap-3 border-b pb-2">
                        <AlertCircle className="text-red-500 w-5 h-5" />
                        <div className="flex-1">
                            <div className="font-medium">{item.title}</div>
                            <div className="text-sm text-muted-foreground">
                                {item.type === "contract" && "Hợp đồng"}
                                {item.type === "opportunity" && "Cơ hội"}
                                {item.type === "task" && "Nhiệm vụ"} đến hạn vào{" "}
                                {item.remind_at?.slice(0, 10)} — trạng thái: {item.status}
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}