"use client";

import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Loader2 } from "lucide-react";
import supabase from "@/lib/supabase/client";

interface ChartData {
    name: string;
    value: number;
    fill: string;
}

export function SalesByLevelChart() {
    const [data, setData] = useState<ChartData[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchSalesDataWithColors() {
            try {
                // 1. Fetch dữ liệu doanh số từ summary
                const { data: summary, error: summaryError } = await supabase
                    .from('customer_sales_summary')
                    .select('level, total_sales');

                if (summaryError) throw summaryError;

                // 2. Fetch danh mục màu sắc từ sys_dictionaries (category thường là 'customer_level')
                const { data: dict, error: dictError } = await supabase
                    .from('sys_dictionaries')
                    .select('code, name, color')
                    .eq('category', 'customer_level'); // Giả định category là customer_level

                if (dictError) {
                    console.warn("Không tìm thấy danh mục màu sắc cho customer_level trong sys_dictionaries");
                }

                // Tạo bản đồ ánh xạ từ code sang {name, color}
                const dictMap: Record<string, { name: string, color: string }> = {};
                dict?.forEach(item => {
                    dictMap[item.code] = {
                        name: item.name,
                        color: item.color || "#3b82f6"
                    };
                });

                // Nhãn mặc định nếu DB không có
                const defaultLabels: any = {
                    new: "Mới",
                    regular: "Thân thiết",
                    loyal: "Trung thành",
                    vip: "VIP",
                    super_vip: "S.VIP"
                };

                // 3. Kết hợp dữ liệu
                const chartData = (summary || []).map((item) => {
                    const levelCode = item.level as string;
                    const info = dictMap[levelCode];

                    return {
                        name: info?.name || defaultLabels[levelCode] || levelCode,
                        value: item.total_sales || 0,
                        fill: info?.color || "hsl(var(--primary))" // Ưu tiên màu từ DB
                    };
                });

                // Sắp xếp theo giá trị giảm dần
                setData(chartData.sort((a, b) => b.value - a.value));

            } catch (err) {
                console.error("Lỗi fetch doanh số cấp độ:", err);
            } finally {
                setIsLoading(false);
            }
        }
        fetchSalesDataWithColors();
    }, []);

    if (isLoading) return <div className="h-[250px] flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>;

    return (
        <div className="h-[250px] w-full">
            {data.length === 0 ? (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                    Chưa có dữ liệu doanh số.
                </div>
            ) : (
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data} layout="vertical" margin={{ left: -10, right: 30, top: 10, bottom: 10 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                        <XAxis type="number" hide />
                        <YAxis
                            dataKey="name"
                            type="category"
                            tick={{ fontSize: 12, fill: "hsl(var(--foreground))" }}
                            axisLine={false}
                            tickLine={false}
                            width={80}
                        />
                        <Tooltip
                            cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                            formatter={(value: number) => [new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value), "Doanh số"]}
                            contentStyle={{
                                backgroundColor: 'hsl(var(--card))',
                                borderColor: 'hsl(var(--border))',
                                borderRadius: '8px',
                                color: 'hsl(var(--foreground))'
                            }}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={24}>
                            {data.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}