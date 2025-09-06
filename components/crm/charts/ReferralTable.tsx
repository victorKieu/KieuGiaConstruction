"use client"
/**
 * Component: ReferralTable
 * Mô tả: Bảng hiển thị hiệu suất giới thiệu của khách hàng và cộng tác viên
 * Refactor: Thêm loading state, dễ kết nối Supabase
 */

import { useEffect, useState } from "react"

interface Referral {
    name: string
    referrals: number
    reward: string
}

export function ReferralTable() {
    const [referrals, setReferrals] = useState<Referral[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchReferrals() {
            try {
                // TODO: Replace with Supabase query
                const mockData: Referral[] = [
                    { name: "Nguyễn Văn A", referrals: 3, reward: "5 triệu" },
                    { name: "CTV Trần B", referrals: 5, reward: "8 triệu" },
                ]
                setReferrals(mockData)
            } catch (error) {
                console.error("Error fetching referrals:", error)
            } finally {
                setIsLoading(false)
            }
        }

        fetchReferrals()
    }, [])

    if (isLoading) {
        return <div className="py-4 text-muted-foreground">Đang tải dữ liệu giới thiệu...</div>
    }

    if (referrals.length === 0) {
        return <div className="py-4 text-muted-foreground">Chưa có dữ liệu giới thiệu</div>
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b">
                        <th className="text-left py-2">Người giới thiệu</th>
                        <th className="text-left py-2">Số lượt</th>
                        <th className="text-left py-2">Hoa hồng</th>
                    </tr>
                </thead>
                <tbody>
                    {referrals.map((r, i) => (
                        <tr key={i} className="border-b">
                            <td className="py-2">{r.name}</td>
                            <td className="py-2">{r.referrals}</td>
                            <td className="py-2">{r.reward}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}