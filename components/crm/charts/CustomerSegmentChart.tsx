"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts"
import { Loader2, AlertCircle } from "lucide-react"

// ✅ 1. Định nghĩa kiểu dữ liệu cho dòng kết quả từ View
interface SegmentReportRow {
    segment_name: string | null;
    total_customers: number | null;
}

interface ChartData {
    name: string;
    value: number;
    fill: string;
}

// ✅ 2. Sử dụng mã Hex trực tiếp để tránh lỗi "màu đen" (Black color issue)
const COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899"];

const segmentLabels: Record<string, string> = {
    residential: "Nhà ở",
    commercial: "Thương mại",
    industrial: "Công nghiệp",
    government: "Nhà nước",
    other: "Khác",
}

export function CustomerSegmentChart() {
    const [data, setData] = useState<ChartData[]>([])
    const [loading, setLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        async function fetchSegments() {
            setLoading(true)
            setErrorMsg(null)
            try {
                // ✅ Truy vấn từ View crm_customer_segment_report
                const { data: reportData, error } = await supabase
                    .from("crm_customer_segment_report")
                    .select("segment_name, total_customers")

                if (error) throw error

                // ✅ FIX TS7006: Định nghĩa kiểu 'd' là SegmentReportRow
                const chartData = (reportData as SegmentReportRow[] || []).map((d: SegmentReportRow, index: number) => ({
                    name: d.segment_name ? (segmentLabels[d.segment_name] || d.segment_name) : "Chưa xác định",
                    value: d.total_customers || 0,
                    fill: COLORS[index % COLORS.length]
                }))

                setData(chartData)
            } catch (err: any) {
                console.error("Lỗi fetch phân khúc:", err.message)
                setErrorMsg(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchSegments()
    }, [])

    if (loading) return <div className="h-[250px] flex items-center justify-center"><Loader2 className="animate-spin text-muted-foreground" /></div>

    if (errorMsg) return (
        <div className="h-[250px] flex flex-col items-center justify-center text-destructive text-xs p-4 text-center">
            <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
            <p>Lỗi Database: {errorMsg}</p>
            <p className="mt-2 text-muted-foreground italic">(Hãy đảm bảo bạn đã chạy lệnh tạo VIEW trong SQL Editor)</p>
        </div>
    )

    return (
        <div className="h-[250px] w-full">
            {data.length === 0 ? (
                <div className="h-full flex items-center justify-center text-muted-foreground text-sm italic">
                    Chưa có dữ liệu phân khúc
                </div>
            ) : (
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
                            formatter={(value) => <span className="text-[11px] text-muted-foreground">{value}</span>}
                        />
                    </PieChart>
                </ResponsiveContainer>
            )}
        </div>
    )
}