"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Calculator, Plus, Trash2, ChevronDown, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { deleteQTOItem, deleteQTODetail, calculateMaterialBudget, updateQTODetail, updateQTODetailText, addQTODetail } from "@/lib/action/qtoActions";

interface Props {
    projectId: string;
    items: any[];
    norms: any[];
}

function toRoman(num: number): string {
    const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
    return roman[num] || num.toString();
}

export default function QTOClient({ projectId, items, norms }: Props) {
    const router = useRouter();
    const [calcLoading, setCalcLoading] = useState(false);
    const [expandedRows, setExpandedRows] = useState<Record<string, boolean>>({});

    const toggleRow = (id: string) => {
        setExpandedRows(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // VÁ LỖI TOÁN HỌC TẠI ĐÂY
    const calculateDisplayVol = (l: any, w: any, h: any, f: any) => {
        const len = parseFloat(l) || 0;
        const wid = parseFloat(w) || 0;
        const hei = parseFloat(h) || 0;
        const fac = parseFloat(f) || 0;

        // Nếu Dài, Rộng, Cao đều = 0, lấy luôn khối lượng bằng Hệ số (SL)
        if (len === 0 && wid === 0 && hei === 0) return fac;

        const finalL = len !== 0 ? len : 1;
        const finalW = wid !== 0 ? wid : 1;
        const finalH = hei !== 0 ? hei : 1;
        const finalF = fac !== 0 ? fac : 1;

        return finalL * finalW * finalH * finalF;
    };

    const handleDeleteItem = async (itemId: string) => {
        if (!confirm("Bạn có chắc muốn xóa?")) return;
        await deleteQTOItem(itemId, projectId);
        router.refresh();
    };

    const handleDeleteDetail = async (detailId: string) => {
        await deleteQTODetail(detailId, projectId);
        router.refresh();
    };

    const handleUpdateNum = async (detailId: string, field: string, value: string) => {
        await updateQTODetail(detailId, projectId, field, parseFloat(value) || 0);
        router.refresh();
    };

    const handleUpdateText = async (detailId: string, value: string) => {
        await updateQTODetailText(detailId, projectId, value);
    };

    const handleAddDetail = async (itemId: string) => {
        await addQTODetail(itemId, { projectId, explanation: "Chi tiết mới", length: 0, width: 0, height: 0, quantity_factor: 1 });
        if (!expandedRows[itemId]) toggleRow(itemId);
        router.refresh();
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

    const sections = items.filter(i => !i.parent_id);

    return (
        <div className="space-y-4">
            <div className="flex justify-end bg-white p-3 rounded-lg border shadow-sm">
                <Button className="bg-blue-600 hover:bg-blue-700" onClick={handleCalculate} disabled={calcLoading}>
                    {calcLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Calculator className="w-4 h-4 mr-2" />}
                    Phân tích Vật tư & Chuyển Dự toán
                </Button>
            </div>

            <Card className="border-none shadow-none bg-transparent">
                <Table className="bg-white rounded-md border">
                    <TableHeader>
                        <TableRow className="bg-slate-100 hover:bg-slate-100">
                            <TableHead className="w-[60px] text-center font-bold">STT</TableHead>
                            <TableHead className="font-bold">Danh mục công việc (Từ AI)</TableHead>
                            <TableHead className="w-[80px] text-center font-bold">ĐVT</TableHead>
                            <TableHead className="w-[120px] text-right font-bold">Khối lượng</TableHead>
                            <TableHead className="w-[200px] text-center font-bold">Mã Định Mức</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sections.length === 0 ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8">Chưa có dữ liệu bóc tách.</TableCell></TableRow>
                        ) : sections.map((section, secIdx) => {
                            const tasks = items.filter(i => i.parent_id === section.id);

                            return (
                                <React.Fragment key={section.id}>
                                    <TableRow className="bg-slate-100 hover:bg-slate-200">
                                        <TableCell className="text-center font-bold text-slate-800">{toRoman(secIdx + 1)}</TableCell>
                                        <TableCell className="font-bold text-slate-800 uppercase tracking-wide">{section.item_name}</TableCell>
                                        <TableCell></TableCell>
                                        <TableCell></TableCell>
                                        <TableCell className="text-center">
                                            <span className="text-slate-400 text-xs font-mono">###{section.item_name.substring(0, 4)}</span>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:bg-red-50" onClick={() => handleDeleteItem(section.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>

                                    {tasks.map((task, taskIdx) => {
                                        const totalVol = task.details?.reduce((sum: number, d: any) => sum + calculateDisplayVol(d.length, d.width, d.height, d.quantity_factor), 0) || 0;
                                        // Kiểm tra xem mảng details có data hay không
                                        const hasDetails = task.details && task.details.length > 0;

                                        return (
                                            <React.Fragment key={task.id}>
                                                <TableRow className="hover:bg-slate-50 transition-colors">
                                                    <TableCell className="text-center font-medium text-slate-600">{taskIdx + 1}</TableCell>
                                                    <TableCell className="font-medium text-slate-800">
                                                        <div className="flex items-center gap-2">
                                                            {/* HIỂN THỊ MŨI TÊN NẾU CÓ DỮ LIỆU HOẶC CHƯA CÓ ĐỂ THÊM MỚI */}
                                                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-blue-600 hover:bg-blue-100 shrink-0" onClick={() => toggleRow(task.id)}>
                                                                {expandedRows[task.id] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                            </Button>
                                                            <span>{task.item_name}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">{task.unit}</TableCell>

                                                    <TableCell className="text-right font-bold text-blue-700 text-base">
                                                        {totalVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                    </TableCell>

                                                    <TableCell>
                                                        {task.norm_code ? (
                                                            <Badge variant="outline" className="bg-blue-50 text-blue-700 w-full justify-center">{task.norm_code}</Badge>
                                                        ) : (
                                                            <select className="flex h-8 w-full rounded-md border border-orange-200 bg-orange-50 px-2 py-1 text-xs text-orange-700 outline-none">
                                                                <option value="">Chọn / Gõ mã...</option>
                                                                {norms.map((n: any) => <option key={n.id} value={n.code}>{n.code} - {n.name}</option>)}
                                                            </select>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-300 hover:text-red-500" onClick={() => handleDeleteItem(task.id)}>
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>

                                                {expandedRows[task.id] && (
                                                    <TableRow className="bg-white">
                                                        <TableCell colSpan={6} className="p-0">
                                                            <div className="pl-16 pr-4 py-3 border-b bg-slate-50/50 shadow-inner">
                                                                <table className="w-full text-sm">
                                                                    <thead className="text-xs text-slate-500 font-semibold border-b border-slate-200">
                                                                        <tr>
                                                                            <th className="text-left py-2">Diễn giải cấu kiện</th>
                                                                            <th className="text-center w-[80px]">Số lượng</th>
                                                                            <th className="text-center w-[80px]">Dài</th>
                                                                            <th className="text-center w-[80px]">Rộng</th>
                                                                            <th className="text-center w-[80px]">Cao</th>
                                                                            <th className="text-right w-[100px] pr-2">Khối Lượng</th>
                                                                            <th className="w-[40px]"></th>
                                                                        </tr>
                                                                    </thead>
                                                                    <tbody>
                                                                        {task.details?.map((detail: any) => {
                                                                            const displayVol = calculateDisplayVol(detail.length, detail.width, detail.height, detail.quantity_factor);
                                                                            return (
                                                                                <tr key={detail.id} className="border-b border-dashed border-slate-200 last:border-0 hover:bg-white group transition-colors">
                                                                                    <td className="py-1">
                                                                                        <Input defaultValue={detail.explanation} onBlur={(e) => handleUpdateText(detail.id, e.target.value)} className="h-8 border-transparent hover:border-slate-300 bg-transparent px-2 w-full text-sm" placeholder="VD: Móng M1..." />
                                                                                    </td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.quantity_factor} onBlur={(e) => handleUpdateNum(detail.id, 'quantity_factor', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.length} onBlur={(e) => handleUpdateNum(detail.id, 'length', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.width} onBlur={(e) => handleUpdateNum(detail.id, 'width', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                                                    <td className="px-1"><Input type="number" defaultValue={detail.height} onBlur={(e) => handleUpdateNum(detail.id, 'height', e.target.value)} className="h-8 text-center border-transparent hover:border-slate-300 bg-transparent" /></td>
                                                                                    <td className="text-right font-semibold text-slate-700 pr-2">
                                                                                        {displayVol.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                                                                    </td>
                                                                                    <td className="text-right">
                                                                                        <Button variant="ghost" size="icon" className="h-6 w-6 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100" onClick={() => handleDeleteDetail(detail.id)}>
                                                                                            <Trash2 className="w-3 h-3" />
                                                                                        </Button>
                                                                                    </td>
                                                                                </tr>
                                                                            );
                                                                        })}
                                                                        <tr>
                                                                            <td colSpan={7} className="pt-2">
                                                                                <Button variant="outline" size="sm" className="h-7 text-xs border-dashed text-blue-600 hover:bg-blue-50" onClick={() => handleAddDetail(task.id)}>
                                                                                    <Plus className="w-3 h-3 mr-1" /> Thêm diễn giải
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
                                </React.Fragment>
                            );
                        })}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}