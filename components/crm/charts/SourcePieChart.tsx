"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

interface ChartItem {
    name: string;
    value: number;
    fill: string;
}

// 1. KHAI BÁO INTERFACE CHO PROPS: Định nghĩa rõ component này sẽ nhận vào 1 mảng 'data'
interface SourcePieChartProps {
    data: ChartItem[];
}

// 2. NHẬN PROPS 'data' TỪ THẰNG CHA (page.tsx) TRUYỀN XUỐNG
export function SourcePieChart({ data }: SourcePieChartProps) {

    // Nếu chưa có dữ liệu hoặc mảng rỗng thì hiện thông báo
    if (!data || data.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center text-sm text-muted-foreground">
                Chưa có dữ liệu khách hàng
            </div>
        );
    }

    return (
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
                        contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            borderColor: 'hsl(var(--border))',
                            borderRadius: '8px'
                        }}
                    />
                    <Legend
                        verticalAlign="bottom"
                        height={36}
                        formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
                    />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}