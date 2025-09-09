"use client"
/**
 * Component: ReferralTable
 * Mô tả: Bảng hiển thị hiệu suất giới thiệu của khách hàng và cộng tác viên
 * Refactor: Kết nối Supabase thật, gộp dữ liệu, hiển thị tiếng Việt
 */

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"

interface Referral {
    name: string
    referrals: number
    reward: number
}

export function ReferralTable() {
    const [referrals, setReferrals] = useState<Referral[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchReferrals() {
            try {
                const [customerRes, collaboratorRes] = await Promise.all([
                    supabase
                        .from("customer_referrals")
                        .select("referrer_id, reward_value, customers!customer_referrals_referrer_id_fkey(name)")
                        .eq("contract_signed", true),
                    supabase
                        .from("collaborator_rewards")
                        .select("collaborator_id, reward_value, collaborators(name)")
                        .eq("reward_status", "paid"),
                ])

                if (customerRes.error) throw customerRes.error
                if (collaboratorRes.error) throw collaboratorRes.error

                const customerMap: Record<string, Referral> = {}
                customerRes.data?.forEach((r: any) => {
                    const name = r.customers?.name || "Khách hàng không rõ"
                    if (!customerMap[name]) {
                        customerMap[name] = { name, referrals: 0, reward: 0 }
                    }
                    customerMap[name].referrals += 1
                    customerMap[name].reward += r.reward_value || 0
                })

                const collaboratorMap: Record<string, Referral> = {}
                collaboratorRes.data?.forEach((r: any) => {
                    const name = r.collaborators?.name || "CTV không rõ"
                    if (!collaboratorMap[name]) {
                        collaboratorMap[name] = { name, referrals: 0, reward: 0 }
                    }
                    collaboratorMap[name].referrals += 1
                    collaboratorMap[name].reward += r.reward_value || 0
                })

                const combined = [...Object.values(customerMap), ...Object.values(collaboratorMap)]
                const sorted = combined.sort((a, b) => b.reward - a.reward)

                setReferrals(sorted)
            } catch (error) {
                console.error("Lỗi khi lấy dữ liệu giới thiệu:", error)
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
                            <td className="py-2">{r.reward.toLocaleString("vi-VN")} VNĐ</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}