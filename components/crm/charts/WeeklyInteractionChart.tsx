"use client"
/**
 * Component: WeeklyInteractionChart
 * Mô tả: Biểu đồ đường hiển thị số lượt tương tác theo tuần
 * Refactor: Dùng ChartContainer + ChartTooltip để tránh lỗi RSC
 */

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const interactionData = [
    { week: "Tuần 1", total: 30 },
    { week: "Tuần 2", total: 45 },
    { week: "Tuần 3", total: 60 },
]

export function WeeklyInteractionChart() {
    return (
        <ChartContainer
            config={{
                total: {
                    label: "Số lượt tương tác",
                    color: "hsl(var(--chart-3))",
                },
            }}
            className="h-[250px]"
        >
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={interactionData}>
                    <XAxis dataKey="week" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}