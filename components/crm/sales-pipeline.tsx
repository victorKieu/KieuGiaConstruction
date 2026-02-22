"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import supabase from '@/lib/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { BarChart3 } from "lucide-react"

interface OpportunityStage {
    stage: string
    label: string
    count: number
    value: number
}

interface RawOpportunity {
    stage: string | null;
    estimated_value: number | null;
}

const stageLabels: Record<string, string> = {
    lead: "Tiềm năng",
    qualified: "Đủ điều kiện",
    proposal: "Đề xuất",
    negotiation: "Đàm phán",
    closed_won: "Thành công",
    closed_lost: "Thất bại",
}

const stageOrder = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]

const SKELETON_HEIGHTS = ["40%", "70%", "50%", "85%", "60%", "30%"];

export function SalesPipeline() {
    const [data, setData] = useState<OpportunityStage[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchOpportunities() {
            try {
                const { data, error } = await supabase
                    .from("opportunities")
                    .select("stage, estimated_value")

                if (error) throw error

                const counts: Record<string, { count: number; value: number }> = {}

                // Thêm chấm phẩy hoặc tách dòng rõ ràng
                stageOrder.forEach(s => {
                    counts[s] = { count: 0, value: 0 }
                });

                // ✅ FIX: Gán vào biến trước để tránh lỗi cú pháp và ép kiểu an toàn
                const opportunities = (data || []) as RawOpportunity[];

                opportunities.forEach((opp) => {
                    const stageCode = opp.stage || "lead"
                    if (counts[stageCode]) {
                        counts[stageCode].count += 1
                        counts[stageCode].value += (opp.estimated_value || 0)
                    }
                })

                const chartData = stageOrder.map((code) => ({
                    stage: code,
                    label: stageLabels[code] || code,
                    count: counts[code]?.count || 0,
                    value: counts[code]?.value || 0
                }))

                setData(chartData)
            } catch (error) {
                console.error("Error fetching opportunities:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchOpportunities()
    }, [])

    if (isLoading) {
        return (
            <div className="h-[300px] w-full flex items-end justify-between gap-2 p-4 animate-pulse bg-muted/10 rounded-lg">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <div
                        key={i}
                        className="w-full bg-muted/20 rounded-t-md"
                        style={{ height: SKELETON_HEIGHTS[i] }}
                    />
                ))}
            </div>
        )
    }

    if (data.every(item => item.count === 0)) {
        return (
            <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground bg-muted/5 border border-dashed border-border rounded-lg">
                <BarChart3 className="w-10 h-10 mb-2 opacity-20" />
                <p>Chưa có dữ liệu cơ hội bán hàng</p>
            </div>
        )
    }

    return (
        <ChartContainer
            config={{
                count: {
                    label: "Số lượng",
                    color: "hsl(var(--primary))",
                },
                value: {
                    label: "Giá trị",
                    color: "hsl(var(--chart-2))",
                },
            }}
            className="h-[300px] w-full"
        >
            <BarChart data={data} margin={{ top: 20, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />

                <XAxis
                    dataKey="label"
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    interval={0}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />
                <YAxis
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `${value}`}
                    tick={{ fill: 'hsl(var(--muted-foreground))' }}
                />

                <ChartTooltip
                    cursor={{ fill: 'hsl(var(--muted)/0.2)' }}
                    content={<ChartTooltipContent indicator="dashed" />}
                />

                <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                    barSize={40}
                />
            </BarChart>
        </ChartContainer>
    )
}