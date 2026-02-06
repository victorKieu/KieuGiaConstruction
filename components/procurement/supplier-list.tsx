"use client"; // Chuyển thành Client Component để dùng state/onClick

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MoreHorizontal } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { deleteSupplierAction } from "@/lib/action/procurement";
import { toast } from "sonner";
import { EditSupplierDialog } from "./edit-supplier-dialog"; // Import Dialog vừa tạo

export function SupplierList({ data }: { data: any[] }) {
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [editOpen, setEditOpen] = useState(false);

    const handleDelete = async (id: string, name: string) => {
        if (confirm(`Bạn có chắc chắn muốn xóa nhà cung cấp "${name}" không?`)) {
            const res = await deleteSupplierAction(id);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error);
            }
        }
    };

    const handleEdit = (supplier: any) => {
        setEditingSupplier(supplier);
        setEditOpen(true);
    };

    const getTypeBadge = (type: string) => {
        switch (type) {
            case 'material': return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">Vật liệu</Badge>;
            case 'furniture': return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Nội thất</Badge>;
            case 'subcontractor': return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">Thầu phụ</Badge>;
            case 'equipment': return <Badge variant="outline" className="bg-slate-100 text-slate-700">Thiết bị</Badge>;
            default: return <Badge variant="outline">Khác</Badge>;
        }
    }

    return (
        <>
            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Tên Nhà Cung Cấp</TableHead>
                                <TableHead>Phân loại</TableHead>
                                <TableHead>Người liên hệ</TableHead>
                                <TableHead>Mã số thuế</TableHead>
                                <TableHead>Điện thoại</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-4">Chưa có dữ liệu</TableCell></TableRow> :
                                data.map((s) => (
                                    <TableRow key={s.id}>
                                        <TableCell className="font-medium">
                                            <div>{s.name}</div>
                                            <div className="text-xs text-muted-foreground">{s.email}</div>
                                        </TableCell>
                                        <TableCell>{getTypeBadge(s.type)}</TableCell>
                                        <TableCell>{s.contact_person || '---'}</TableCell>
                                        <TableCell>{s.tax_code}</TableCell>
                                        <TableCell>{s.phone}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleEdit(s)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Sửa thông tin
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(s.id, s.name)} className="text-red-600 focus:text-red-600">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Xóa
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* Dialog Sửa (Chỉ render khi có dữ liệu) */}
            {editingSupplier && (
                <EditSupplierDialog
                    supplier={editingSupplier}
                    open={editOpen}
                    setOpen={setEditOpen}
                />
            )}
        </>
    );
}