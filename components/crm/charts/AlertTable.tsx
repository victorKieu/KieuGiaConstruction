"use client"
/**
 * Component: AlertTable
 * Mô tả: Bảng hiển thị danh sách khách hàng có cảnh báo chăm sóc
 * Nâng cấp: Kết nối Supabase thật, thêm bộ lọc, hiển thị màu cảnh báo
 */

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"

interface Alert {
    id: string
    customer_name: string
    alert_type: string
    triggered_at: string
    resolved: boolean
}

export function AlertTable() {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchAlerts() {
            try {
                const { data, error } = await supabase
                    .from("customer_alerts")
                    .select("id, alert_type, triggered_at, resolved, customers(name)")
                    .eq("resolved", false)
                    .gte("triggered_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // 30 ngày gần nhất

                if (error) throw error

                const formatted = data.map((a: any) => ({
                    id: a.id,
                    customer_name: a.customers?.name || "Không rõ",
                    alert_type: a.alert_type,
                    triggered_at: a.triggered_at,
                    resolved: a.resolved,
                }))

                setAlerts(formatted)
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu cảnh báo:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAlerts()
    }, [])

    const getAlertColor = (type: string) => {
        switch (type) {
            case "no_interaction":
                return "bg-red-100 text-red-600"
            case "status_stagnant":
                return "bg-yellow-100 text-yellow-600"
            default:
                return "bg-gray-100 text-gray-600"
        }
    }

    if (isLoading) {
        return <div className="py-4 text-muted-foreground">Đang tải dữ liệu cảnh báo...</div>
    }

    if (alerts.length === 0) {
        return <div className="py-4 text-muted-foreground">Không có cảnh báo nào trong 30 ngày gần đây</div>
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2">Khách hàng</th>
                        <th className="text-left py-2">Loại cảnh báo</th>
                        <th className="text-left py-2">Ngày phát sinh</th>
                    </tr>
                </thead>
                <tbody>
                    {alerts.map((alert) => (
                        <tr key={alert.id} className="border-b">
                            <td className="py-2">{alert.customer_name}</td>
                            <td className="py-2">
                                <span className={`px-2 py-1 rounded text-xs font-medium ${getAlertColor(alert.alert_type)}`}>
                                    {alert.alert_type === "no_interaction"
                                        ? "Không tương tác"
                                        : alert.alert_type === "status_stagnant"
                                            ? "Trạng thái không đổi"
                                            : alert.alert_type}
                                </span>
                            </td>
                            <td className="py-2">{new Date(alert.triggered_at).toLocaleDateString("vi-VN")}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}