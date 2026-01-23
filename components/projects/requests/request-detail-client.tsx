"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RequestDetailClient({ request }: { request: any }) {
    const router = useRouter();
    if (!request) return <div>Không tìm thấy dữ liệu.</div>;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <Button variant="ghost" onClick={() => router.back()}><ArrowLeft className="w-4 h-4 mr-2" /> Quay lại</Button>
                {request.status === 'pending' && (
                    <Button variant="outline" onClick={() => router.push(`requests/${request.id}/edit`)}><Edit className="w-4 h-4 mr-2" /> Sửa</Button>
                )}
            </div>
            <Card>
                <CardHeader><CardTitle>{request.code} - {request.requester?.name}</CardTitle></CardHeader>
                <CardContent>
                    <div className="mb-4 text-sm text-slate-500">
                        Ngày tạo: {format(new Date(request.created_at), "dd/MM/yyyy")} | Trạng thái: <Badge>{request.status}</Badge>
                    </div>
                    <Table>
                        <TableHeader><TableRow><TableHead>Tên hàng</TableHead><TableHead>SL</TableHead><TableHead>ĐVT</TableHead></TableRow></TableHeader>
                        <TableBody>
                            {request.items?.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.item_name}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell>{item.unit}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}