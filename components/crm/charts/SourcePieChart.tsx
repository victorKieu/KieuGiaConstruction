"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PieChart as PieChartIcon } from "lucide-react";

// 1. Định nghĩa kiểu dữ liệu cho Props
interface SourcePieChartProps {
    data: {
        name: string;
        value: number;
        fill: string;
    }[];
}

// 2. Component nhận props 'data' thay vì tự fetch
export function SourcePieChart({ data }: SourcePieChartProps) {
    // Kiểm tra nếu dữ liệu null hoặc rỗng thì gán mảng rỗng để tránh lỗi map
    const chartData = data || [];

    return (
        <Card className="flex flex-col h-full shadow-sm">
            <CardHeader className="items-center pb-2">
                <CardTitle className="text-sm font-medium flex gap-2">
                    <PieChartIcon className="h-4 w-4 text-blue-600" /> Nguồn Khách hàng
                </CardTitle>
            </CardHeader>
            <CardContent className="flex-1 pb-0">
                {chartData.length === 0 ? (
                    <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                        Chưa có dữ liệu nguồn.
                    </div>
                ) : (
                    <div className="h-[250px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    dataKey="value"
                                    nameKey="name"
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={2}
                                >
                                    {chartData.map((entry, index) => (
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
                                    formatter={(value) => <span className="text-xs text-slate-600 ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}