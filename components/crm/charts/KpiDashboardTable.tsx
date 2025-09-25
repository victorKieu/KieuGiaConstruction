"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type KpiRow = {
    employee_name: string
    total_opportunities: number
    won_opportunities: number
    win_rate_percent: number
    last_activity_at: string
}

export function KpiDashboardTable() {
    const [data, setData] = useState<KpiRow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchKpi() {
            const { data, error } = await supabase
                .from("crm_kpi_dashboard")
                .select("employee_name, total_opportunities, won_opportunities, win_rate_percent, last_activity_at")

            if (error) {
                console.error("Lỗi khi lấy dữ liệu KPI:", error.message || error)
            } else {
                setData(data as KpiRow[])
            }

            setLoading(false)
        }

        fetchKpi()
    }, [])

    if (loading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-[250px] w-full" />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Chưa có dữ liệu KPI
            </div>
        )
    }

    return (
        <Card>
            <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-muted-foreground text-left">
                            <th>Nhân viên</th>
                            <th>Tổng cơ hội</th>
                            <th>Thắng</th>
                            <th>Tỷ lệ thắng (%)</th>
                            <th>Ngày</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item, index) => (
                            <tr key={index} className="border-t">
                                <td>{item.employee_name}</td>
                                <td>{item.total_opportunities ?? "—"}</td>
                                <td>{item.won_opportunities ?? "—"}</td>
                                <td>{item.win_rate_percent?.toFixed(2) ?? "—"}</td>
                                <td>{item.last_activity_at?.slice(0, 10) ?? "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}