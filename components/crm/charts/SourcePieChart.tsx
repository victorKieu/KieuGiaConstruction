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
        // Card tự động dùng bg-card text-card-foreground nhờ globals.css
        <Card className="flex flex-col h-full shadow-sm">
            <CardHeader className="items-center pb-2">
                <CardTitle className="text-sm font-medium flex gap-2">
                    {/* ✅ FIX: Icon màu xanh sáng hơn trong dark mode */}
                    <PieChartIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" /> Nguồn Khách hàng
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
                                        // Cell giữ nguyên fill từ props (màu sắc biểu đồ thường không cần đổi theo theme)
                                        <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                                    ))}
                                </Pie>

                                {/* ✅ FIX: Tooltip dùng biến màu hệ thống để tự đổi màu nền/chữ */}
                                <Tooltip
                                    formatter={(value: number) => [value, "Khách hàng"]}
                                    cursor={{ fill: 'var(--muted)', opacity: 0.2 }}
                                    contentStyle={{
                                        backgroundColor: 'hsl(var(--card))',
                                        borderColor: 'hsl(var(--border))',
                                        color: 'hsl(var(--foreground))',
                                        borderRadius: '8px',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
                                    }}
                                    itemStyle={{ color: 'hsl(var(--foreground))' }}
                                />

                                <Legend
                                    verticalAlign="bottom"
                                    height={36}
                                    iconType="circle"
                                    // ✅ FIX: Text chú thích dùng text-muted-foreground thay vì slate-600
                                    formatter={(value) => <span className="text-xs text-muted-foreground ml-1">{value}</span>}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}