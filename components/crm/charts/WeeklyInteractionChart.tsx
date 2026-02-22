"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Loader2, AlertCircle } from "lucide-react";
import supabase from "@/lib/supabase/client";
import { format, subDays, startOfDay } from "date-fns";
import { Database } from "@/types/supabase"; // Đảm bảo đường dẫn này trỏ đúng đến file supabase.ts của bạn

// ✅ Định nghĩa kiểu dữ liệu từ Schema của bạn
type InteractionRow = Database["public"]["Tables"]["customer_interactions"]["Row"];

interface ChartData {
    date: string;
    count: number;
    rawDate: string;
}

export function WeeklyInteractionChart() {
    const [data, setData] = useState<ChartData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    useEffect(() => {
        async function fetchWeeklyInteractions() {
            setIsLoading(true);
            setErrorMsg(null);
            try {
                // Lấy mốc thời gian 7 ngày trước
                const last7Days = startOfDay(subDays(new Date(), 7)).toISOString();

                // ✅ Query bảng tương tác khách hàng
                const { data: interactions, error } = await supabase
                    .from('customer_interactions')
                    .select('interaction_date')
                    .gte('interaction_date', last7Days);

                if (error) throw error;

                // Khởi tạo khung dữ liệu cho 7 ngày gần nhất (để tránh ngày không có tương tác bị trống)
                const days: ChartData[] = Array.from({ length: 7 }, (_, i) => {
                    const d = subDays(new Date(), i);
                    return {
                        date: format(d, "dd/MM"),
                        count: 0,
                        rawDate: format(d, "yyyy-MM-dd")
                    };
                }).reverse();

                // ✅ FIX TS7006: Khai báo kiểu InteractionRow cho item
                (interactions as InteractionRow[] || []).forEach((item: InteractionRow) => {
                    if (item.interaction_date) {
                        const itemDate = item.interaction_date.split('T')[0];
                        const dayIdx = days.findIndex(d => d.rawDate === itemDate);
                        if (dayIdx !== -1) {
                            days[dayIdx].count++;
                        }
                    }
                });

                setData(days);
            } catch (err: any) {
                console.error("Lỗi fetch tương tác tuần:", err);
                setErrorMsg(err.message || "Không thể tải dữ liệu tương tác");
            } finally {
                setIsLoading(false);
            }
        }
        fetchWeeklyInteractions();
    }, []);

    if (isLoading) {
        return (
            <div className="h-[250px] flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (errorMsg) {
        return (
            <div className="h-[250px] flex flex-col items-center justify-center text-destructive p-4 text-center">
                <AlertCircle className="h-8 w-8 mb-2 opacity-50" />
                <p className="text-xs">{errorMsg}</p>
            </div>
        );
    }

    return (
        <div className="h-[250px] w-full">
            {data.every(d => d.count === 0) ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">
                    Không có tương tác nào trong 7 ngày qua
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <YAxis
                            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                            axisLine={false}
                            tickLine={false}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                color: 'hsl(var(--foreground))',
                                borderRadius: '8px'
                            }}
                            itemStyle={{ color: 'hsl(var(--primary))' }}
                        />
                        <Line
                            type="monotone"
                            dataKey="count"
                            name="Số tương tác"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2.5}
                            dot={{ r: 4, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}