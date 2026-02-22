"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import { Loader2 } from "lucide-react"

// ✅ Định nghĩa kiểu dữ liệu để sửa lỗi TS7006
interface KpiRow {
    employee_name: string;
    total_opportunities: number;
    won_opportunities: number;
    total_revenue: number;
}

export function KpiDashboardTable() {
    const [data, setData] = useState<KpiRow[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchKpi() {
            // ✅ Gọi đúng View KPI vừa tạo ở trên
            const { data: resData, error } = await supabase
                .from("crm_employee_kpi_report")
                .select("*")
                .order('total_revenue', { ascending: false })

            if (error) {
                console.error("Lỗi fetch KPI:", error.message)
            } else {
                setData(resData as KpiRow[] || [])
            }
            setLoading(false)
        }
        fetchKpi()
    }, [])

    if (loading) return <div className="p-4 flex justify-center"><Loader2 className="animate-spin" /></div>

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-muted/50">
                    <tr>
                        <th className="p-3">Nhân viên</th>
                        <th className="p-3 text-center">Cơ hội</th>
                        <th className="p-3 text-center">Thành công</th>
                        <th className="p-3 text-right">Doanh thu</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((item: KpiRow, index: number) => (
                        <tr key={index} className="border-b hover:bg-muted/30 transition-colors">
                            <td className="p-3 font-medium">{item.employee_name}</td>
                            <td className="p-3 text-center">{item.total_opportunities}</td>
                            <td className="p-3 text-center text-green-600">{item.won_opportunities}</td>
                            <td className="p-3 text-right font-semibold">
                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.total_revenue)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}