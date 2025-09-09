"use client"
/**
 * Component: WeeklyInteractionChart
 * Mô tả: Biểu đồ đường hiển thị số lượt tương tác theo tuần
 * Refactor: Kết nối Supabase + ChartContainer + ChartTooltip
 */

import { useEffect, useState } from "react"
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import supabase from "@/lib/supabase/client"

interface InteractionPoint {
    week: string
    total: number
}

export function WeeklyInteractionChart() {
    const [data, setData] = useState<InteractionPoint[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchInteractions() {
            try {
                const { data, error } = await supabase
                    .from("customer_interactions")
                    .select("interaction_date")

                if (error) throw error

                const weekMap: Record<string, number> = {}

                data?.forEach((i) => {
                    const date = new Date(i.interaction_date)
                    const weekKey = `Tuần ${getWeekNumber(date)}`
                    weekMap[weekKey] = (weekMap[weekKey] || 0) + 1
                })

                const chartData = Object.entries(weekMap).map(([week, total]) => ({ week, total }))
                setData(chartData)
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu tương tác:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchInteractions()
    }, [])

    function getWeekNumber(date: Date): number {
        const firstDay = new Date(date.getFullYear(), 0, 1)
        const pastDays = Math.floor((date.getTime() - firstDay.getTime()) / (24 * 60 * 60 * 1000))
        return Math.ceil((pastDays + firstDay.getDay() + 1) / 7)
    }

    if (isLoading) {
        return <div className="h-[250px] flex items-center justify-center text-muted-foreground">Đang tải dữ liệu...</div>
    }

    if (data.length === 0) {
        return <div className="h-[250px] flex items-center justify-center text-muted-foreground">Chưa có dữ liệu tương tác</div>
    }

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
                <LineChart data={data}>
                    <XAxis dataKey="week" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}