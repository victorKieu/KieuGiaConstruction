"use client"
/**
 * Component: SalesByLevelChart
 * Mô tả: Biểu đồ cột hiển thị tổng doanh số theo cấp độ khách hàng
 * Refactor: Dùng ChartContainer + ChartTooltip để tránh lỗi RSC
 */

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const levelData = [
    { level: "Thân thiết", total_sales: 500 },
    { level: "VIP", total_sales: 1200 },
    { level: "Super VIP", total_sales: 2200 },
]

export function SalesByLevelChart() {
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
                <BarChart data={levelData}>
                    <XAxis dataKey="level" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="total_sales" fill="var(--color-total_sales)" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}