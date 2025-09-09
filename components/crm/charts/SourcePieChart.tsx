"use client"
/**
 * Component: SourcePieChart
 * Mô tả: Biểu đồ tròn hiển thị phân bổ khách hàng theo nguồn
 * Fix: Sạch lỗi TypeScript, kết nối Supabase, hiển thị tiếng Việt
 */

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import supabase from "@/lib/supabase/client"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#A28EFF", "#FF6F91"]

interface SourcePoint {
    name: string
    value: number
}

export function SourcePieChart() {
    const [data, setData] = useState<SourcePoint[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchSources() {
            try {
                const { data: rawData, error } = await supabase
                    .from("customers")
                    .select("source_id, customer_sources(name)")

                if (error) throw error

                const sourceMap: Record<string, number> = {}

                rawData?.forEach((c) => {
                    const name = c.customer_sources?.name || "Không rõ"
                    sourceMap[name] = (sourceMap[name] || 0) + 1
                })

                const chartData: SourcePoint[] = Object.entries(sourceMap).map(([name, value]) => ({
                    name,
                    value,
                }))

                setData(chartData)
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu nguồn khách hàng:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchSources()
    }, [])

    if (isLoading) {
        return <div className="h-[250px] flex items-center justify-center text-muted-foreground">Đang tải dữ liệu...</div>
    }

    if (data.length === 0) {
        return <div className="h-[250px] flex items-center justify-center text-muted-foreground">Chưa có dữ liệu nguồn khách hàng</div>
    }

    return (
        <ChartContainer
            config={{
                value: {
                    label: "Số lượng",
                    color: "hsl(var(--chart-1))",
                },
            }}
            className="h-[250px]"
        >
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie
                        data={data}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name }) => name}
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}