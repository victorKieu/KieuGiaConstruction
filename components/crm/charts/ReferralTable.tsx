"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Users } from "lucide-react"

interface Referral {
    id: string
    name: string
    type: "customer" | "collaborator"
    referrals: number
    reward: number
}

export function ReferralTable() {
    const [referrals, setReferrals] = useState<Referral[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [errorMsg, setErrorMsg] = useState<string | null>(null)

    useEffect(() => {
        async function fetchReferrals() {
            setIsLoading(true)
            setErrorMsg(null)
            try {
                // ✅ FIX: Sử dụng cú pháp Bảng!Tên_Khóa_Ngoại để định danh chính xác
                const [customerRes, collaboratorRes] = await Promise.all([
                    supabase
                        .from("customer_referrals")
                        .select(`
                            referrer_id, 
                            reward_value, 
                            customers!customer_referrals_referrer_id_fkey(name)
                        `)
                        .eq("contract_signed", true),
                    supabase
                        .from("collaborator_rewards")
                        .select(`
                            collaborator_id, 
                            reward_value, 
                            collaborators(name)
                        `)
                        .eq("reward_status", "paid")
                ])

                if (customerRes.error) throw customerRes.error
                if (collaboratorRes.error) throw collaboratorRes.error

                const referralMap: Record<string, Referral> = {}

                // 1. Xử lý dữ liệu Khách hàng giới thiệu
                customerRes.data?.forEach((r: any) => {
                    // Khi dùng định danh !, dữ liệu trả về vẫn nằm trong object 'customers'
                    const name = r.customers?.name || "Khách hàng ẩn"
                    const key = `cus_${r.referrer_id}`

                    if (!referralMap[key]) {
                        referralMap[key] = { id: key, name, type: "customer", referrals: 0, reward: 0 }
                    }
                    referralMap[key].referrals += 1
                    referralMap[key].reward += (r.reward_value || 0)
                })

                // 2. Xử lý dữ liệu CTV giới thiệu
                collaboratorRes.data?.forEach((r: any) => {
                    const name = r.collaborators?.name || "CTV ẩn"
                    const key = `col_${r.collaborator_id}`

                    if (!referralMap[key]) {
                        referralMap[key] = { id: key, name, type: "collaborator", referrals: 0, reward: 0 }
                    }
                    referralMap[key].referrals += 1
                    referralMap[key].reward += (r.reward_value || 0)
                })

                const sorted = Object.values(referralMap).sort((a, b) => b.reward - a.reward)
                setReferrals(sorted)

            } catch (err: any) {
                console.error("Referral Fetch Error:", err)
                setErrorMsg(err.message || "Không thể tải dữ liệu")
            } finally {
                setIsLoading(false)
            }
        }

        fetchReferrals()
    }, [])

    if (isLoading) {
        return (
            <div className="space-y-3">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-20 w-full" />
            </div>
        )
    }

    if (errorMsg) {
        return (
            <div className="p-4 border border-destructive/50 rounded-md bg-destructive/10 text-destructive flex items-center gap-2 text-sm">
                <AlertCircle className="h-4 w-4" />
                {errorMsg}
            </div>
        )
    }

    return (
        <Card className="h-full border-border bg-card shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Top Giới Thiệu
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <Table>
                    <TableHeader>
                        <TableRow className="border-border">
                            <TableHead>Người giới thiệu</TableHead>
                            <TableHead className="text-center">Vai trò</TableHead>
                            <TableHead className="text-center">Số lượt</TableHead>
                            <TableHead className="text-right">Hoa hồng</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {referrals.map((r) => (
                            <TableRow key={r.id} className="border-border transition-colors hover:bg-muted/30">
                                <TableCell className="font-medium">{r.name}</TableCell>
                                <TableCell className="text-center">
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${r.type === 'customer'
                                            ? 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-900'
                                            : 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-900'
                                        }`}>
                                        {r.type === 'customer' ? 'Khách hàng' : 'CTV'}
                                    </span>
                                </TableCell>
                                <TableCell className="text-center">{r.referrals}</TableCell>
                                <TableCell className="text-right font-medium text-green-600 dark:text-green-400">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(r.reward)}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    )
}