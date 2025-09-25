// CustomerSegmentChart.tsx
"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import {
    PieChart,
    Pie,
    Cell,
    ResponsiveContainer,
} from "recharts"
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
} from "@/components/ui/chart"

type SegmentPoint = {
    segment: string
    customer_count: number
}

const segmentLabels: Record<string, string> = {
    residential: "Nhà ở",
    commercial: "Thương mại",
    industrial: "Công nghiệp",
    government: "Nhà nước",
    other: "Khác",
}

const COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
]

export function CustomerSegmentChart() {
    const [data, setData] = useState<SegmentPoint[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchSegments() {
            const { data, error } = await supabase
                .from("crm_customer_segment_report")
                .select("segment_name, total_customers")

            if (error) {
                console.error("Lỗi khi lấy dữ liệu phân khúc:", error.message || error)
            } else {
                const chartData =
                    data?.map((d) => ({
                        segment: segmentLabels[d.segment_name] || d.segment_name,
                        customer_count: d.total_customers,
                    })) || []

                setData(chartData)
            }

            setLoading(false)
        }

        fetchSegments()
    }, [])

    if (loading) {
        return (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Đang tải dữ liệu…
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Chưa có dữ liệu phân khúc khách hàng
            </div>
        )
    }

    return (
        <ChartContainer
            config={{
                customer_count: {
                    label: "Số lượng khách hàng",
                    color: "hsl(var(--chart-1))",
                },
            }}
            className="h-[250px]"
        >
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Pie
                        data={data}
                        dataKey="customer_count"
                        nameKey="segment"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                    >
                        {data.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}
