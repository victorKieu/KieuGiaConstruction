"use client";

import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Plus, CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function ProjectRequestsTab({ projectId, requests }: { projectId: string, requests: any[] }) {

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending': return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Chờ duyệt</Badge>;
            case 'approved': return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Đã duyệt</Badge>;
            case 'ordered': return <Badge className="bg-blue-600">Đã mua hàng</Badge>;
            case 'rejected': return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Từ chối</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Danh sách phiếu yêu cầu</h3>
                <Button asChild>
                    <Link href={`/projects/${projectId}/requests/new`}>
                        <Plus className="mr-2 h-4 w-4" /> Tạo yêu cầu mới
                    </Link>
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Mã phiếu</TableHead>
                                <TableHead>Ngày cần hàng</TableHead>
                                <TableHead>Người yêu cầu</TableHead>
                                <TableHead>Số lượng mục</TableHead>
                                <TableHead>Độ ưu tiên</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {requests.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Chưa có yêu cầu nào.</TableCell></TableRow>
                            ) : (
                                requests.map((req) => (
                                    <TableRow key={req.id}>
                                        <TableCell className="font-bold">{req.code}</TableCell>
                                        <TableCell>{format(new Date(req.deadline_date), "dd/MM/yyyy", { locale: vi })}</TableCell>
                                        <TableCell>{req.requester?.name || "---"}</TableCell>
                                        <TableCell>{req.items?.[0]?.count || 0} loại</TableCell>
                                        <TableCell>
                                            {req.priority === 'urgent'
                                                ? <span className="text-red-600 font-bold uppercase text-xs">Gấp</span>
                                                : <span className="text-muted-foreground text-xs">Bình thường</span>}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(req.status)}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" asChild>
                                                <Link href={`/projects/${projectId}/requests/${req.id}`}>
                                                    Chi tiết <ArrowRight className="ml-1 h-3 w-3" />
                                                </Link>
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}