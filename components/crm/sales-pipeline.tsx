"use client"

import { useEffect, useState } from "react"
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts"
import supabase from '@/lib/supabase/client';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface OpportunityStage {
    stage: string
    count: number
    value: number
}

const stageOrder = ["lead", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"]

const stageLabels: Record<string, string> = {
    lead: "Tiềm năng",
    qualified: "Đủ điều kiện",
    proposal: "Đề xuất",
    negotiation: "Đàm phán",
    closed_won: "Thành công",
    closed_lost: "Thất bại",
}

export function SalesPipeline() {
    const [data, setData] = useState<OpportunityStage[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchOpportunities() {
            try {
                const { data, error } = await supabase.from("opportunities").select("stage, estimated_value")

                if (error) throw error

                const stageData: Record<string, OpportunityStage> = {}

                stageOrder.forEach((stage) => {
                    stageData[stage] = {
                        stage: stageLabels[stage] || stage,
                        count: 0,
                        value: 0,
                    }
                })

                data?.forEach((opp) => {
                    if (opp.stage && stageData[opp.stage]) {
                        stageData[opp.stage].count += 1
                        stageData[opp.stage].value += opp.estimated_value || 0
                    }
                })

                const chartData = stageOrder.map((stage) => stageData[stage]).filter(Boolean)

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
        return <div className="h-[300px] flex items-center justify-center">Loading pipeline data...</div>
    }

    if (data.length === 0) {
        return (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                Chưa có dữ liệu cơ hội bán hàng
            </div>
        )
    }

    return (
        <ChartContainer
            config={{
                count: {
                    label: "Số lượng",
                    color: "hsl(var(--chart-1))",
                },
                value: {
                    label: "Giá trị (triệu VNĐ)",
                    color: "hsl(var(--chart-2))",
                    // valueFormatter không được hỗ trợ ở đây
                },
            }}
            className="h-[300px]"
        >
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                    <XAxis dataKey="stage" stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                        stroke="#888888"
                        fontSize={12}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(value) => `${value}`}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} className="fill-primary" />
                </BarChart>
            </ResponsiveContainer>
        </ChartContainer>
    )
}