"use client";

import { useEffect, useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Loader2 } from "lucide-react";
import supabase from "@/lib/supabase/client";

interface ChartItem {
    name: string;
    value: number;
    fill: string;
}

export function SourcePieChart() {
    const [data, setData] = useState<ChartItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchSourceStats() {
            try {
                // ✅ Lấy thêm cột 'color' từ quan hệ sys_dictionaries
                const { data: customers, error } = await supabase
                    .from('customers')
                    .select(`
                        source_id, 
                        sys_dictionaries!customers_source_id_fkey(name, color)
                    `);

                if (error) throw error;

                const counts: Record<string, { count: number; color: string }> = {};
                customers?.forEach((c: any) => {
                    const sourceName = c.sys_dictionaries?.name || "Khác";
                    // ✅ Lấy mã màu từ DB, nếu trống gán màu xám mặc định
                    const sourceColor = c.sys_dictionaries?.color || "#888888";

                    if (!counts[sourceName]) {
                        counts[sourceName] = { count: 0, color: sourceColor };
                    }
                    counts[sourceName].count++;
                });

                const chartData = Object.entries(counts).map(([name, info]) => ({
                    name,
                    value: info.count,
                    fill: info.color // ✅ Sử dụng màu sắc từ sys_dictionaries
                }));

                setData(chartData);
            } catch (err) {
                console.error("Lỗi fetch nguồn:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSourceStats();
    }, []);

    if (isLoading) return <div className="h-[250px] flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="h-[250px] w-full">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                    <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2}>
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} strokeWidth={0} />
                        ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>} />
                </PieChart>
            </ResponsiveContainer>
        </div>
    );
}