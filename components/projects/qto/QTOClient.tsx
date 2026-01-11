"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus, Trash2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

// Import đầy đủ các Server Action
import {
    createQTOItem, addQTODetail, deleteQTOItem, deleteQTODetail, calculateMaterialBudget,
    updateQTODetail, updateQTODetailText
} from "@/lib/action/qtoActions";

interface Props {
    projectId: string;
    items: any[];
    norms: any[];
}

export default function QTOClient({ projectId, items, norms }: Props) {
    const router = useRouter();
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

    // --- LOGIC TÍNH TOÁN THÔNG MINH TẠI CLIENT (Để hiển thị ngay lập tức) ---
    const calculateDisplayVol = (l: any, w: any, h: any, f: any) => {
        const len = parseFloat(l) || 0;
        const wid = parseFloat(w) || 0;
        const hei = parseFloat(h) || 0;
        const fac = parseFloat(f) || 0;

        // Trường hợp đặc biệt: Nếu tất cả kích thước đều = 0 thì kết quả là 0
        if (len === 0 && wid === 0 && hei === 0) return 0;

        // Logic Smart: Cái nào > 0 thì nhân, cái nào = 0 thì coi là 1
        const finalL = len !== 0 ? len : 1;
        const finalW = wid !== 0 ? wid : 1;
        const finalH = hei !== 0 ? hei : 1;
        const finalF = fac !== 0 ? fac : 1; // Hệ số mặc định là 1

        return finalL * finalW * finalH * finalF;
    };

    // --- CÁC HÀM XỬ LÝ (HANDLERS) ---

    const handleAddItem = async () => {
        if (!newItemName) {
            toast.error("Vui lòng nhập tên công việc");
            return;
        }
        setLoading(true);
        const res = await createQTOItem(projectId, newItemName, newItemUnit, newItemNorm);
        setLoading(false);

        if (res.success) {
            toast.success("Đã thêm đầu việc");
            setIsAddOpen(false);
            setNewItemName(""); setNewItemUnit(""); setNewItemNorm("");
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const handleAddDetail = async (itemId: string) => {
        // Tạo dòng mới với giá trị mặc định = 0.
        // Server sẽ xử lý logic lưu, nhưng Client sẽ hiển thị 0 cho đến khi user nhập.
        const res = await addQTODetail(itemId, {
            projectId,
            explanation: "",
            length: 0, width: 0, height: 0, quantity_factor: 1
        });

        if (res.success) {
            if (!expandedRows[itemId]) toggleRow(itemId);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa đầu việc này?")) return;
        await deleteQTOItem(itemId, projectId);
        router.refresh();
    }

    const handleDeleteDetail = async (detailId: string) => {
        await deleteQTODetail(detailId, projectId);
        router.refresh();
    }

    // ✅ Tự động lưu khi nhập xong (On Blur)
    const handleUpdateNum = async (detailId: string, field: string, value: string) => {
        const numVal = parseFloat(value) || 0;
        await updateQTODetail(detailId, projectId, field, numVal);
        // Router refresh để cập nhật lại tổng số bên trên header
        router.refresh();
    };

    const handleUpdateText = async (detailId: string, value: string) => {
        await updateQTODetailText(detailId, projectId, value);
    };

    const handleCalculate = async () => {
        setCalcLoading(true);
        const res = await calculateMaterialBudget(projectId);
        setCalcLoading(false);
        if (res.success) {
            toast.success(res.message);
            router.refresh();
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
                                    <Label>Tên công việc <span className="text-red-500">*</span></Label>
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
                                <Button onClick={handleAddItem} disabled={loading} className="w-full mt-2">
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu lại"}
                                </Button>
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
                            <TableHead className="w-[80px]">ĐVT</TableHead>
                            <TableHead className="w-[120px]">Mã Định mức</TableHead>
                            <TableHead className="w-[150px] text-right">Tổng khối lượng</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {items.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Chưa có dữ liệu bóc tách.</TableCell></TableRow>
                        ) : items.map((item) => {

                            // Tính tổng khối lượng Header (cộng dồn từ các dòng con)
                            // Lưu ý: Dùng chính hàm calculateDisplayVol để đảm bảo logic hiển thị giống hệt
                            const totalVol = item.details?.reduce((sum: number, d: any) => {
                                return sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor);
                            }, 0) || 0;

                            return (
                                <React.Fragment key={item.id}>
                                    {/* Dòng Header (Item) */}
                                    <TableRow className="font-medium bg-slate-50/50 hover:bg-slate-100">
                                        <TableCell>
                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => toggleRow(item.id)}>
                                                {expandedRows[item.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            </Button>
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-800">{item.item_name}</TableCell>
                                        <TableCell>{item.unit}</TableCell>
                                        <TableCell>
                                            {item.norm_code
                                                ? <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{item.norm_code}</Badge>
                                                : <span className="text-slate-400 italic text-xs">Chưa gán</span>
                                            }
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-blue-600 text-lg">
                                            {totalVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50" onClick={() => handleDeleteItem(item.id)}>
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
                                                                <th className="text-left py-2 pl-2">Diễn giải</th>
                                                                <th className="text-center w-[80px]">Hệ số</th>
                                                                <th className="text-center w-[80px]">Dài</th>
                                                                <th className="text-center w-[80px]">Rộng</th>
                                                                <th className="text-center w-[80px]">Cao</th>
                                                                <th className="text-right w-[120px] pr-2">Khối Lượng</th>
                                                                <th className="w-[40px]"></th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {item.details?.map((detail: any) => {
                                                                // Tính toán hiển thị ngay lập tức
                                                                const displayVol = calculateDisplayVol(detail.length, detail.width, detail.height, detail.quantity_factor);

                                                                return (
                                                                    <tr key={detail.id} className="border-b border-slate-100 last:border-0 hover:bg-white group transition-colors">
                                                                        <td className="py-1">
                                                                            <Input
                                                                                defaultValue={detail.explanation}
                                                                                className="h-8 border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent px-2 w-full"
                                                                                placeholder="Nhập diễn giải..."
                                                                                onBlur={(e) => handleUpdateText(detail.id, e.target.value)}
                                                                            />
                                                                        </td>
                                                                        <td className="px-1"><Input type="number" defaultValue={detail.quantity_factor} onBlur={(e) => handleUpdateNum(detail.id, 'quantity_factor', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent" /></td>
                                                                        <td className="px-1"><Input type="number" defaultValue={detail.length} onBlur={(e) => handleUpdateNum(detail.id, 'length', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent" placeholder="0" /></td>
                                                                        <td className="px-1"><Input type="number" defaultValue={detail.width} onBlur={(e) => handleUpdateNum(detail.id, 'width', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent" placeholder="0" /></td>
                                                                        <td className="px-1"><Input type="number" defaultValue={detail.height} onBlur={(e) => handleUpdateNum(detail.id, 'height', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 focus:border-blue-500 bg-transparent" placeholder="0" /></td>

                                                                        {/* Cột Kết quả */}
                                                                        <td className="text-right font-semibold text-slate-700 pr-2">
                                                                            {displayVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                        </td>
                                                                        <td className="text-right">
                                                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDeleteDetail(detail.id)}>
                                                                                <Trash2 className="w-3 h-3" />
                                                                            </Button>
                                                                        </td>
                                                                    </tr>
                                                                );
                                                            })}
                                                            <tr>
                                                                <td colSpan={7} className="pt-2">
                                                                    <Button variant="outline" size="sm" className="h-7 text-xs border-dashed w-full text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" onClick={() => handleAddDetail(item.id)}>
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