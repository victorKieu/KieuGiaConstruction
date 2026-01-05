"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils/utils";
import { AlertCircle, ArrowUpRight } from "lucide-react";

interface Props {
    debtData: any;
}

export default function DebtWidget({ debtData }: Props) {
    if (!debtData || debtData.remaining_debt <= 0) return null;

    return (
        <Card className="border-orange-200 bg-orange-50/50">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-orange-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" />
                    Theo dõi công nợ
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex justify-between items-end">
                    <div>
                        <p className="text-2xl font-bold text-orange-700">
                            {formatCurrency(debtData.remaining_debt)}
                        </p>
                        <p className="text-xs text-orange-600 mt-1">
                            {debtData.overdue_count > 0
                                ? `Có ${debtData.overdue_count} đợt thanh toán quá hạn!`
                                : "Chưa thu hồi so với giá trị Hợp đồng"}
                        </p>
                    </div>
                    <div className="text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                        Bên A còn nợ
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}