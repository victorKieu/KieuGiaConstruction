"use client"
/**
 * Component: AlertTable
 * Mô tả: Bảng hiển thị danh sách khách hàng có cảnh báo chăm sóc
 * Refactor: Thêm loading state, dễ kết nối Supabase
 */

import { useEffect, useState } from "react"

interface Alert {
    name: string
    type: string
    date: string
}

export function AlertTable() {
    const [alerts, setAlerts] = useState<Alert[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchAlerts() {
            try {
                // TODO: Replace with Supabase query
                const mockData: Alert[] = [
                    { name: "Nguyễn Văn A", type: "no_interaction", date: "2025-08-01" },
                    { name: "Trần Thị B", type: "status_stagnant", date: "2025-07-25" },
                ]
                setAlerts(mockData)
            } catch (error) {
                console.error("Error fetching alerts:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchAlerts()
    }, [])

    if (isLoading) {
        return <div className="py-4 text-muted-foreground">Đang tải dữ liệu cảnh báo...</div>
    }

    if (alerts.length === 0) {
        return <div className="py-4 text-muted-foreground">Không có cảnh báo nào</div>
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
                    {alerts.map((alert, i) => (
                        <tr key={i} className="border-b">
                            <td className="py-2">{alert.name}</td>
                            <td className="py-2">{alert.type}</td>
                            <td className="py-2">{alert.date}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}