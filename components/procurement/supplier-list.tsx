"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Edit, Trash2, MoreHorizontal, Search, Star } from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { deleteSupplierAction } from "@/lib/action/procurement";
import { toast } from "sonner";
import { EditSupplierDialog } from "./edit-supplier-dialog";

export function SupplierList({ data, supplierTypes }: { data: any[], supplierTypes: any[] }) {
    const [editingSupplier, setEditingSupplier] = useState<any>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");

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

    const filteredData = data.filter(s =>
        s.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.tax_code?.includes(searchTerm)
    );

    // ✅ Đã fix Dark Mode cho hệ thống Badge phân loại
    const getTypeBadge = (typeCode: string) => {
        const dict = supplierTypes.find(t => t.code === typeCode);
        if (!dict) return <Badge variant="outline" className="bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">Khác</Badge>;

        // Map mã màu động của Tailwind 
        const colorMap: Record<string, string> = {
            blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/20",
            amber: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-400 dark:border-amber-500/20",
            purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-500/10 dark:text-purple-400 dark:border-purple-500/20",
            indigo: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20",
            emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20",
            rose: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20",
            slate: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-500/10 dark:text-slate-400 dark:border-slate-500/20",
        };
        const classes = colorMap[dict.color] || colorMap.slate; // Nếu nhập sai màu, fallback về slate

        return <Badge variant="outline" className={classes}>{dict.name}</Badge>;
    };

    // ✅ Đã fix Dark Mode cho hệ thống Trạng thái
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'active': return <Badge className="bg-emerald-500 text-white hover:bg-emerald-600 dark:bg-emerald-600 dark:hover:bg-emerald-700">Đang giao dịch</Badge>;
            case 'inactive': return <Badge variant="secondary">Ngừng giao dịch</Badge>;
            case 'blacklist': return <Badge variant="destructive">Blacklist</Badge>;
            default: return <Badge variant="outline">Không rõ</Badge>;
        }
    };

    return (
        <>
            <Card className="border-border bg-background shadow-sm">
                <CardHeader className="border-border border-b p-4">
                    <div className="flex items-center gap-4">
                        <div className="relative max-w-sm flex-1">
                            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
                            <Input
                                placeholder="Tìm theo Tên, Mã, MST..."
                                className="bg-background pl-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                            <TableRow className="border-border hover:bg-transparent">
                                <TableHead className="w-[100px]">Mã NCC</TableHead>
                                <TableHead>Doanh nghiệp</TableHead>
                                <TableHead>Phân loại</TableHead>
                                <TableHead>Đánh giá</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredData.length === 0 ? (
                                <TableRow><TableCell colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400">Không tìm thấy nhà cung cấp nào.</TableCell></TableRow>
                            ) : (
                                filteredData.map((s) => (
                                    <TableRow key={s.id} className="border-border transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                                        <TableCell className="font-semibold text-slate-700 dark:text-slate-300">{s.code || '---'}</TableCell>
                                        <TableCell>
                                            <div className="font-bold text-slate-900 dark:text-slate-100">{s.name}</div>
                                            <div className="text-muted-foreground mt-0.5 text-xs">MST: {s.tax_code || '---'} | LH: {s.contact_person || '---'} ({s.phone || '---'})</div>
                                        </TableCell>
                                        <TableCell>{getTypeBadge(s.type)}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1 font-bold dark:text-slate-200">
                                                <Star className={`w-4 h-4 ${s.rating === 'A' ? 'text-amber-500 fill-amber-500' : s.rating === 'B' ? 'text-blue-500 fill-blue-500' : 'text-slate-300 dark:text-slate-600'}`} />
                                                Hạng {s.rating || 'C'}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(s.status)}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" className="h-8 w-8 p-0"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                    <DropdownMenuItem onClick={() => handleEdit(s)}>
                                                        <Edit className="mr-2 h-4 w-4" /> Cập nhật chi tiết
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleDelete(s.id, s.name)} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                                                        <Trash2 className="mr-2 h-4 w-4" /> Xóa dữ liệu
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {editingSupplier && (
                <EditSupplierDialog
                    supplier={editingSupplier}
                    open={editOpen}
                    setOpenAction={setEditOpen}
                    supplierTypes={supplierTypes}
                />
            )}
        </>
    );
}