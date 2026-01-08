"use client";

import React, { useState } from "react"; // ✅ Thêm import React
import { Calculator, Plus, Trash2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

import { createQTOItem, addQTODetail, deleteQTOItem, deleteQTODetail, calculateMaterialBudget } from "@/lib/action/qtoActions";

interface Props {
    projectId: string;
    items: any[];
    norms: any[];
}

export default function QTOClient({ projectId, items, norms }: Props) {
    const [loading, setLoading] = useState(false);
    const [calcLoading, setCalcLoading] = useState(false);

    // State cho form thêm mới Item
    const [newItemName, setNewItemName] = useState("");
    const [newItemUnit, setNewItemUnit] = useState("");
    const [newItemNorm, setNewItemNorm] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);

    // State quản lý Expand/Collapse các dòng item
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleAddItem = async () => {
        if (!newItemName) return;
        setLoading(true);
        const res = await createQTOItem(projectId, newItemName, newItemUnit, newItemNorm);
        setLoading(false);
        if (res.success) {
            toast.success("Đã thêm đầu việc");
            setIsAddOpen(false);
            setNewItemName("");
            setNewItemUnit("");
            setNewItemNorm("");
        } else {
            toast.error(res.error);
        }
    };

    const handleAddDetail = async (itemId: string) => {
        const res = await addQTODetail(itemId, {
            projectId,
            explanation: "Chi tiết mới",
            length: 0, width: 0, height: 0, quantity_factor: 1
        });
        if (!res.success) toast.error(res.error);
        if (!expandedRows[itemId]) toggleRow(itemId);
    };

    const handleCalculate = async () => {
        setCalcLoading(true);
        const res = await calculateMaterialBudget(projectId);
        setCalcLoading(false);
        if (res.success) {
            toast.success(res.message);
        } else {
            toast.error(res.error);
        }
    };

    return (
        <div className="space-y-4">
            {/* TOOLBAR */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                <div className="flex items-center gap-2">
                    <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
                                <Plus className="w-4 h-4 mr-2" /> Thêm đầu việc
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Thêm công việc bóc tách</DialogTitle></DialogHeader>
                            <div className="space-y-3 py-4">
                                <div>
                                    <Label>Tên công việc</Label>
                                    <Input value={newItemName} onChange={e => setNewItemName(e.target.value)} placeholder="VD: Bê tông móng..." />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>Đơn vị tính</Label>
                                        <Input value={newItemUnit} onChange={e => setNewItemUnit(e.target.value)} placeholder="m3, m2..." />
                                    </div>
                                    <div>
                                        <Label>Mã định mức (Nếu có)</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={newItemNorm}
                                            onChange={e => setNewItemNorm(e.target.value)}
                                        >
                                            <option value="">-- Chọn định mức --</option>
                                            {norms.map((n: any) => (
                                                <option key={n.id} value={n.code}>{n.code} - {n.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                                <Button onClick={handleAddItem} disabled={loading} className="w-full mt-2">Lưu</Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                <Button variant="outline" className="border-green-600 text-green-700 hover:bg-green-50" onClick={handleCalculate} disabled={calcLoading}>
                    {calcLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                    Tính toán & Cập nhật Vật tư
                </Button>
            </div>

            {/* MAIN TABLE */}
            <Card className="border-none shadow-none bg-transparent">
                <Table className="bg-white rounded-md border">
                    <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableHead className="w-[50px]"></TableHead>
                            <TableHead>Tên công việc (Hạng mục)</TableHead>
                            <TableHead className="w-[100px]">ĐVT</TableHead>
                            <TableHead className="w-[150px]">Mã Định mức</TableHead>
                            <TableHead className="w-[150px] text-right">Tổng khối lượng</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu bóc tách.</TableCell></TableRow>
                        ) : items.map((item) => {
                            const totalVol = item.details?.reduce((sum: number, d: any) => {
                                return sum + (d.length * d.width * d.height * d.quantity_factor);
                            }, 0) || 0;

                            return (
                                // ✅ FIX: Thay <> bằng <React.Fragment key={item.id}>
                                <React.Fragment key={item.id}>
                                    {/* Dòng Header (Item) */}
                                    <TableRow className="font-medium bg-slate-50/50 hover:bg-slate-100">
                                        <TableCell>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleRow(item.id)}>
                                                {expandedRows[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell>{item.item_name}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell>
                                            {item.norm_code
                                                ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{item.norm_code}</Badge>
                                                : <span className="text-slate-400 italic text-xs">Chưa gán</span>
                                            }
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-blue-600">
                                            {totalVol.toLocaleString('vi-VN')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400" onClick={() => deleteQTOItem(item.id, projectId)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>

                                    {/* Phần mở rộng: Nhập chi tiết */}
                                    {expandedRows[item.id] && (
                                        <TableRow className="bg-white">
                                            <TableCell colSpan={6} className="p-0">
                                                <div className="p-4 border-b border-l border-r mx-4 mb-4 rounded-b-lg bg-slate-50 shadow-inner">
                                                    <table className="w-full text-sm">
                                                        <thead className="text-xs text-slate-500 font-semibold border-b">
                                                            <tr>
                                                                <th className="text-left py-2">Diễn giải</th>
                                                                <th className="text-right w-[100px]">Số cấu kiện</th>
                                                                <th className="text-right w-[100px]">Dài</th>
                                                                <th className="text-right w-[100px]">Rộng</th>
                                                                <th className="text-right w-[100px]">Cao/Sâu</th>
                                                                <th className="text-right w-[120px]">Thành tiền</th>
                                                                <th className="w-[40px]"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {item.details?.map((detail: any) => (
                                                                <tr key={detail.id} className="border-b border-slate-100 last:border-0">
                                                                    <td className="py-2">
                                                                        <Input defaultValue={detail.explanation} className="h-7 bg-white" placeholder="Trục..." />
                                                                    </td>
                                                                    <td className="text-right"><Input type="number" defaultValue={detail.quantity_factor} className="h-7 text-right bg-white" /></td>
                                                                    <td className="text-right"><Input type="number" defaultValue={detail.length} className="h-7 text-right bg-white" /></td>
                                                                    <td className="text-right"><Input type="number" defaultValue={detail.width} className="h-7 text-right bg-white" /></td>
                                                                    <td className="text-right"><Input type="number" defaultValue={detail.height} className="h-7 text-right bg-white" /></td>
                                                                    <td className="text-right font-semibold text-slate-700">
                                                                        {(detail.length * detail.width * detail.height * detail.quantity_factor).toFixed(2)}
                                                                    </td>
                                                                    <td className="text-right">
                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-red-300 hover:text-red-500" onClick={() => deleteQTODetail(detail.id, projectId)}>
                                                                            <Trash2 className="w-3 h-3" />
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                            <tr>
                                                                <td colSpan={7} className="pt-2">
                                                                    <Button variant="outline" size="sm" className="h-7 text-xs border-dashed w-full text-slate-500" onClick={() => handleAddDetail(item.id)}>
                                                                        <Plus className="w-3 h-3 mr-1" /> Thêm dòng chi tiết
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}