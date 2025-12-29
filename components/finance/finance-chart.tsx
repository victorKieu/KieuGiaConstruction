"use client";

import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChartData {
    name: string;   // Tên tháng (T11, T12...)
    income: number; // Tổng thu
    expense: number; // Tổng chi
}

export function FinanceChart({ data }: { data: ChartData[] }) {
    // Hàm format tiền tệ cho trục Y và Tooltip
    const formatMoney = (value: number) => {
        if (value >= 1000000000) return `${(value / 1000000000).toFixed(1)} tỷ`;
        if (value >= 1000000) return `${(value / 1000000).toFixed(0)} tr`;
        return `${value.toLocaleString()} đ`;
    };

    return (
        <Card className="col-span-4">
            <CardHeader>
                <CardTitle>Biểu đồ dòng tiền (6 tháng)</CardTitle>
            </CardHeader>
            <CardContent className="pl-2">
                <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis
                                dataKey="name"
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#888888"
                                fontSize={12}
                                tickLine={false}
                                axisLine={false}
                                tickFormatter={formatMoney} // Format trục Y: 10 tr, 20 tr...
                            />
                            <Tooltip
                                formatter={(value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value)}
                                cursor={{ fill: 'transparent' }}
                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                            />
                            <Legend />

                            {/* Cột Thu - Màu xanh lá */}
                            <Bar
                                dataKey="income"
                                name="Thu"
                                fill="#22c55e"
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                            />

                            {/* Cột Chi - Màu đỏ */}
                            <Bar
                                dataKey="expense"
                                name="Chi"
                                fill="#ef4444"
                                radius={[4, 4, 0, 0]}
                                barSize={30}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    );
}