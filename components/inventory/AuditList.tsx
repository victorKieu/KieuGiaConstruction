"use client";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import Link from "next/link";
import { formatDate } from "@/lib/utils/utils";

export function AuditList({ audits, warehouseId }: { audits: any[], warehouseId: string }) {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'DRAFT': return <Badge variant="secondary" className="text-muted-foreground">Nháp</Badge>;
            case 'COUNTING': return <Badge className="bg-blue-500 hover:bg-blue-600">Đang kiểm đếm</Badge>;
            case 'COMPLETED': return <Badge className="bg-emerald-600 hover:bg-emerald-700">Hoàn thành</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="border border-border rounded-lg bg-card text-card-foreground shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="hover:bg-transparent bg-muted/30">
                        <TableHead className="font-medium text-foreground">Tên kỳ kiểm kê</TableHead>
                        <TableHead className="font-medium text-foreground">Trạng thái</TableHead>
                        <TableHead className="font-medium text-foreground">Ngày thực hiện</TableHead>
                        <TableHead className="font-medium text-foreground">Số hạng mục</TableHead>
                        <TableHead className="text-right font-medium text-foreground">Tác vụ</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {audits.length === 0 ? (
                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground italic">Chưa có kỳ kiểm kê nào được tạo.</TableCell></TableRow>
                    ) : (
                        audits.map((audit) => (
                            <TableRow key={audit.id} className="hover:bg-muted/50 transition-colors">
                                <TableCell className="font-medium">{audit.name}</TableCell>
                                <TableCell>{getStatusBadge(audit.status)}</TableCell>
                                <TableCell className="text-muted-foreground">{audit.check_date ? formatDate(new Date(audit.check_date)) : '-'}</TableCell>
                                <TableCell className="text-muted-foreground">{audit.items?.[0]?.count || 0}</TableCell>
                                <TableCell className="text-right">
                                    <Button variant="ghost" size="sm" asChild className="hover:bg-muted">
                                        <Link href={`/inventory/${warehouseId}/audit/${audit.id}`}>
                                            <Eye className="w-4 h-4 mr-1 text-muted-foreground" /> Xem
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