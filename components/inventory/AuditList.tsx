"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ClipboardList, Eye } from "lucide-react";
import Link from "next/link";
import { formatDate } from "lib/utils/utils"; 

export function AuditList({ audits, warehouseId }: { audits: any[], warehouseId: string }) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <Badge variant="secondary">Nháp</Badge>;
            case 'COUNTING': return <Badge className="bg-blue-500">Đang kiểm đếm</Badge>;
            case 'COMPLETED': return <Badge className="bg-green-600">Hoàn thành</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="border rounded-lg bg-white dark:bg-slate-950 shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="dark:border-slate-800">
                        <TableHead>Tên kỳ kiểm kê</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead>Ngày thực hiện</TableHead>
                        <TableHead>Số hạng mục</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {audits.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Chưa có kỳ kiểm kê nào được tạo.</TableCell></TableRow>
                    ) : (
                            audits.map((audit) => (
                                <TableRow key={audit.id} className="dark:border-slate-800">
                                    <TableCell className="font-medium">{audit.name}</TableCell>
                                    <TableCell>{getStatusBadge(audit.status)}</TableCell>
                                    <TableCell>{audit.check_date ? formatDate(new Date(audit.check_date)) : '-'}</TableCell>
                                    <TableCell>{audit.items?.[0]?.count || 0}</TableCell>

                                    {/* ✅ BẮT BUỘC PHẢI BỌC TRONG TABLECELL */}
                                    <TableCell className="text-right">
                                        <Button variant="ghost" size="sm" asChild>
                                            <Link href={`/inventory/${warehouseId}/audit/${audit.id}`}>
                                                <Eye className="w-4 h-4 mr-1" /> Xem
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                    )}
                </TableBody>
            </Table>
        </div>
    );
}