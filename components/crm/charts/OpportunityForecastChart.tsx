// OpportunityForecastChart.tsx
"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Forecast = {
    opportunity_id: number
    opportunity_title: string
    stage: string
    estimated_value: number
    forecasted_value: number
    expected_close_date: string
    employee_name: string
    customer_name: string
}

export function OpportunityForecastChart() {
    const [data, setData] = useState<Forecast[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchForecast() {
            try {
                const { data, error } = await supabase
                    .from("crm_opportunity_forecast")
                    .select("*")
                    .order("expected_close_date", { ascending: true })

                if (error) throw error
                setData(data as Forecast[])
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu dự báo:", error)
            } finally {
                setLoading(false)
            }
        }

        fetchForecast()
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
                Chưa có dữ liệu dự báo doanh thu
            </div>
        )
    }

    return (
        <Card>
            <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-muted-foreground text-left">
                            <th>Cơ hội</th>
                            <th>Khách hàng</th>
                            <th>Nhân viên</th>
                            <th>Giai đoạn</th>
                            <th>Giá trị dự kiến</th>
                            <th>Dự báo</th>
                            <th>Ngày chốt</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.opportunity_id} className="border-t">
                                <td>{item.opportunity_title}</td>
                                <td>{item.customer_name}</td>
                                <td>{item.employee_name}</td>
                                <td>{item.stage}</td>
                                <td>{item.estimated_value?.toLocaleString() ?? "—"}₫</td>
                                <td>{item.forecasted_value?.toLocaleString() ?? "—"}₫</td>
                                <td>{item.expected_close_date}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}