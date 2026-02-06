"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, AlertCircle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import { PaymentConfirmationDialog } from "@/components/projects/contract/payment-confirmation-dialog";

// Component này nhận danh sách các đợt thanh toán CHƯA THU
export default function ReceivablesManager({ milestones }: { milestones: any[] }) {

    return (
        <Card className="mt-6 border-l-4 border-l-orange-400">
            <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-orange-800">
                    <ArrowUpRight className="w-5 h-5" /> Các khoản Phải thu (Theo Hợp đồng)
                </CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow className="bg-orange-50 hover:bg-orange-50">
                            <TableHead>Dự án / Hợp đồng</TableHead>
                            <TableHead>Đợt thanh toán</TableHead>
                            <TableHead>Hạn thanh toán</TableHead>
                            <TableHead className="text-right">Số tiền</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {milestones.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                                    <div className="flex flex-col items-center gap-2">
                                        <CheckCircle2 className="w-8 h-8 text-green-500 opacity-50" />
                                        <span>Tuyệt vời! Không có công nợ phải thu nào.</span>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            milestones.map((m) => {
                                const isOverdue = m.due_date && new Date(m.due_date) < new Date();
                                return (
                                    <TableRow key={m.id}>
                                        <TableCell>
                                            <div className="font-bold text-slate-700">{m.contracts?.projects?.name}</div>
                                            <div className="text-xs text-slate-500 font-mono">HĐ: {m.contracts?.contract_number}</div>
                                        </TableCell>
                                        <TableCell>{m.name}</TableCell>
                                        <TableCell>
                                            <div className={isOverdue ? "text-red-600 font-bold flex items-center gap-1" : "text-slate-600"}>
                                                {m.due_date ? format(new Date(m.due_date), "dd/MM/yyyy") : "---"}
                                                {isOverdue && <AlertCircle className="w-3 h-3" />}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-orange-700">
                                            {formatCurrency(m.amount)}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {/* ✅ POPUP THU TIỀN ĐẶT Ở ĐÂY */}
                                            <PaymentConfirmationDialog
                                                milestone={m}
                                                projectId={m.contracts?.projects?.id}
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}