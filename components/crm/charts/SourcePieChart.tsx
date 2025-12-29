"use client"

import { useEffect, useState } from "react"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Loader2, PieChart as PieChartIcon } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { getCustomerSourceStats } from "@/lib/action/dashboard" // <--- Import Server Action

export function SourcePieChart() {
    const [data, setData] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchSources() {
            try {
                const chartData = await getCustomerSourceStats()
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
        return (
            <Card className="flex flex-col h-full shadow-sm">
                <CardHeader className="items-center pb-0">
                    <CardTitle className="text-sm font-medium flex gap-2">
                        <PieChartIcon className="h-4 w-4" /> Nguồn Khách hàng
                    </CardTitle>
                </CardHeader>
                <CardContent className="flex-1 flex items-center justify-center pb-0">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="flex flex-col h-full shadow-sm">
            <CardHeader className="items-center pb-2">
                <CardTitle className="text-sm font-medium flex gap-2">
                    <PieChartIcon className="h-4 w-4 text-blue-600" /> Nguồn Khách hàng
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                {data.length === 0 ? (
                    <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
                        Chưa có dữ liệu nguồn.
                    </div>
                ) : (
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={data}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                >
                                    {data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number) => [value, "Khách hàng"]}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    formatter={(value, entry: any) => <span className="text-xs text-slate-600 ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}