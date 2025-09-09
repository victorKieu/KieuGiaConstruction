"use client"
/**
 * Component: SalesByLevelChart
 * Mô tả: Biểu đồ cột hiển thị tổng doanh số theo cấp độ khách hàng
 * Refactor: Kết nối Supabase + ChartContainer + ChartTooltip + chuyển ngữ cấp độ
 */

import { useEffect, useState } from "react"
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import supabase from "@/lib/supabase/client"

interface LevelPoint {
    level: string
    total_sales: number
}

const levelLabels: Record<string, string> = {
    new: "Mới",
    regular: "Thường",
    loyal: "Thân thiết",
    vip: "VIP",
    super_vip: "Super VIP",
}

export function SalesByLevelChart() {
    const [data, setData] = useState<LevelPoint[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchSales() {
            try {
                const { data, error } = await supabase
                    .from("customer_sales_summary")
                    .select("level, total_sales")

                if (error) throw error

                const chartData = data?.map((d) => ({
                    level: levelLabels[d.level] || d.level,
                    total_sales: d.total_sales,
                })) || []

                setData(chartData)
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu doanh số:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSales()
    }, [])

    if (isLoading) {
        return <div className="h-[250px] flex items-center justify-center text-muted-foreground">Đang tải dữ liệu...</div>
    }

    if (data.length === 0) {
        return <div className="h-[250px] flex items-center justify-center text-muted-foreground">Chưa có dữ liệu doanh số</div>
    }

    return (
        <ChartContainer
            config={{
                total_sales: {
                    label: "Doanh số (triệu VNĐ)",
                    color: "hsl(var(--chart-2))",
                },
            }}
            className="h-[250px]"
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis dataKey="level" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_sales" fill="var(--color-total_sales)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}