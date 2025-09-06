"use client"
/**
 * Component: SourcePieChart
 * Mô tả: Biểu đồ tròn hiển thị phân bổ khách hàng theo nguồn
 * Refactor: Dùng ChartContainer + ChartTooltip để tránh lỗi RSC
 */

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

const sourceData = [
    { name: "Facebook", value: 120 },
    { name: "Zalo", value: 80 },
    { name: "Giới thiệu", value: 60 },
    { name: "Tự tìm", value: 40 },
]

export function SourcePieChart() {
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
                        data={sourceData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ name }) => name}
                    >
                        {sourceData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}