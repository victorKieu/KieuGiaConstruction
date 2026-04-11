"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"

// ✅ FIX 1: Cập nhật type khớp 100% với file supabase.ts
type DueItem = {
    customer_id: string | null;
    description: string | null;
    due_date: string | null;
    status: string | null;
    type: string | null;
}

export function ReminderAlertsTable() {
    const [data, setData] = useState<DueItem[]>([])
    const [loading, setLoading] = useState(true)

    const supabase = createClient()

    useEffect(() => {
        async function fetchDueItems() {
            // ✅ FIX 2: Chỉ select đúng 5 cột có trong View
            const { data, error } = await supabase
                .from("crm_reminder_alerts")
                .select("customer_id, description, due_date, status, type")
                // Đổi từ remind_at sang due_date
                .lte("due_date", new Date().toISOString())
                .order("due_date", { ascending: true })
                .limit(10)

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
            <div className="space-y-2 p-4">
                <Skeleton className="h-6 w-1/3" />
                <Skeleton className="h-[200px] w-full mt-4" />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="h-[200px] flex items-center justify-center text-muted-foreground border border-dashed rounded-lg bg-slate-50 dark:bg-slate-900/50">
                🎉 Không có công việc nào trễ hạn!
            </div>
        )
    }

    // Hàm phụ trợ map loại cảnh báo sang Tiếng Việt
    const getTypeLabel = (type: string | null) => {
        if (!type) return "Khác";
        if (type.toLowerCase() === "activity") return "Hoạt động";
        if (type.toLowerCase() === "contract") return "Hợp đồng";
        if (type.toLowerCase() === "opportunity") return "Cơ hội";
        return type;
    }

    return (
        <Card className="border-none shadow-none">
            <CardContent className="space-y-4 p-0">
                {data.map((item, index) => (
                    // Dùng index làm key tạm vì bảng này không có cột ID duy nhất
                    <div key={index} className="flex items-start gap-3 border-b border-slate-100 dark:border-slate-800 pb-3 last:border-0 last:pb-0">
                        <AlertCircle className="text-red-500 w-5 h-5 mt-0.5 shrink-0" />
                        <div className="flex-1">
                            <div className="font-medium text-sm text-slate-800 dark:text-slate-200">
                                {item.description || "Không có tiêu đề"}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-2 items-center">
                                <span className="uppercase text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 tracking-wider">
                                    {getTypeLabel(item.type)}
                                </span>

                                {item.due_date && (
                                    <span className="font-medium text-red-600 dark:text-red-400">
                                        Trễ hạn: {new Date(item.due_date).toLocaleDateString('vi-VN')}
                                    </span>
                                )}

                                {item.status && (
                                    <span className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400">
                                        {item.status}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </CardContent>
        </Card>
    )
}