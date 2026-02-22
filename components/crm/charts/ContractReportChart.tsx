// components/crm/charts/ContractReportChart.tsx
"use client"

import { useEffect, useState } from "react"
import supabase from "@/lib/supabase/client"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

type Contract = {
    contract_id: number
    contract_number: string
    contract_title: string
    customer_name: string
    status: string
    signed_at: string
    expired_at: string
    total_value: number
    days_since_signed: number
}

export function ContractReportChart() {
    const [data, setData] = useState<Contract[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchContracts() {
            try {
                const { data, error } = await supabase
                    .from("crm_contract_report")
                    .select("*")
                    .order("signed_at", { ascending: false });

                if (error) {
                    // In chi tiết lỗi để kiểm tra cấu trúc DB
                    console.error("Supabase Error Details:", JSON.stringify(error, null, 2));
                    throw error;
                }
                setData(data as Contract[]);
            } catch (error: any) {
                console.error("Lỗi fetch hợp đồng:", error.message || error);
            } finally {
                setLoading(false);
            }
        }
        fetchContracts();
    }, []);

    if (loading) {
        return (
            <div className="space-y-2">
                <Skeleton className="h-6 w-1/2" />
                <Skeleton className="h-[250px] w-full" />
            </div>
        )
    }

    if (data.length === 0) {
        return (
            <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                Chưa có dữ liệu hợp đồng
            </div>
        )
    }

    return (
        <Card>
            <CardContent className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="text-muted-foreground text-left">
                            <th>Số hợp đồng</th>
                            <th>Tiêu đề</th>
                            <th>Khách hàng</th>
                            <th>Trạng thái</th>
                            <th>Ngày ký</th>
                            <th>Ngày hết hạn</th>
                            <th>Giá trị</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((item) => (
                            <tr key={item.contract_id} className="border-t">
                                <td>{item.contract_number}</td>
                                <td>{item.contract_title}</td>
                                <td>{item.customer_name}</td>
                                <td>{item.status}</td>
                                <td>{item.signed_at}</td>
                                <td>{item.expired_at}</td>
                                <td>{item.total_value.toLocaleString()}₫</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </CardContent>
        </Card>
    )
}