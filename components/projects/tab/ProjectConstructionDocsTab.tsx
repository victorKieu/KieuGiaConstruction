"use client";

import React, { useState, useEffect } from "react";
import * as XLSX from "xlsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, BookOpen, FileSpreadsheet, CheckCircle2, CornerDownRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";

interface Props { projectId: string; }

export default function ProjectConstructionDocsTab({ projectId }: Props) {
    const supabase = createClient();
    const [isLoading, setIsLoading] = useState(true);
    const [qtoTasks, setQtoTasks] = useState<any[]>([]);
    const [estItems, setEstItems] = useState<any[]>([]);
    const [normsList, setNormsList] = useState<any[]>([]);

    useEffect(() => {
        if (projectId) loadData();
    }, [projectId]);

    const loadData = async () => {
        setIsLoading(true);
        // 1. Fetch dữ liệu công tác kèm details (diễn giải khối lượng)
        const { data: qtoData } = await supabase
            .from('qto_items')
            .select('*, details:qto_item_details(*)')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true });

        // 2. Fetch hao phí vật tư
        const { data: estData } = await supabase
            .from('estimation_items')
            .select('qto_item_id, material_name, category')
            .eq('project_id', projectId);

        // 3. Fetch thư viện Định mức (lấy execution_guide)
        const { data: normsData } = await supabase
            .from('norms')
            .select('code, execution_guide, name');

        setQtoTasks(qtoData || []);
        setEstItems(estData || []);
        setNormsList(normsData || []);
        setIsLoading(false);
    };

    const sections = qtoTasks.filter(i => i.item_type === 'section' || (!i.parent_id && !i.item_type));

    // XUẤT EXCEL HỒ SƠ CHI TIẾT
    const handleExportExcel = () => {
        const exportData: any[] = [["STT", "Mã hiệu", "Hạng mục / Công tác / Diễn giải", "ĐVT", "Khối lượng", "Kỹ thuật thi công & Vật tư yêu cầu"]];

        let secIndex = 1;
        sections.forEach(sec => {
            // Dòng Hạng mục
            exportData.push([toRoman(secIndex++), "", sec.item_name.toUpperCase(), "", "", ""]);

            const tasks = qtoTasks.filter(t => t.parent_id === sec.id && t.item_type !== 'section');
            let taskIndex = 1;

            tasks.forEach(task => {
                // Tính khối lượng tổng
                let taskVol = task.details?.reduce((sum: number, d: any) => sum + (parseFloat(d.length || 1) * parseFloat(d.width || 1) * parseFloat(d.height || 1) * parseFloat(d.quantity_factor || 1)), 0) || Number(task.quantity) || 0;

                // Thu thập thông tin kỹ thuật
                const normInfo = normsList.find(n => n.code === task.norm_code);
                const materials = estItems.filter(e => e.qto_item_id === task.id && e.category === 'VL').map(e => e.material_name).join(", ");

                const methods = [
                    normInfo?.execution_guide ? `[KỸ THUẬT]: ${normInfo.execution_guide}` : "",
                    task.description ? `[LƯU Ý THÊM]: ${task.description}` : "",
                    materials ? `[VẬT TƯ]: ${materials}` : ""
                ].filter(Boolean).join("\n");

                // Dòng Công tác
                exportData.push([taskIndex++, task.norm_code || "", task.item_name, task.unit, taskVol, methods]);

                // ✅ FIX EXCEL: Dòng Diễn giải chi tiết lấy d.explanation
                task.details?.forEach((d: any, dIdx: number) => {
                    const dVol = (parseFloat(d.length || 1) * parseFloat(d.width || 1) * parseFloat(d.height || 1) * parseFloat(d.quantity_factor || 1));
                    const detailName = d.explanation || d.name || `Diễn giải ${dIdx + 1}`;
                    exportData.push(["", "", `  ↳ ${detailName}: ${d.length || 1} x ${d.width || 1} x ${d.height || 1} (HS:${d.quantity_factor || 1})`, task.unit, dVol, ""]);
                });
            });
        });

        const ws = XLSX.utils.aoa_to_sheet(exportData);
        ws['!cols'] = [{ wch: 8 }, { wch: 15 }, { wch: 50 }, { wch: 8 }, { wch: 12 }, { wch: 60 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "HoSoThiCong");
        XLSX.writeFile(wb, `Ho_So_Ky_Thuat_Thi_Cong_${projectId.substring(0, 5)}.xlsx`);
        toast.success("Đã xuất hồ sơ kỹ thuật thành công!");
    };

    function toRoman(num: number): string {
        const roman = ["", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
        return roman[num] || num.toString();
    }

    if (isLoading) return <div className="p-10 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-blue-500" /></div>;

    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <BookOpen className="w-5 h-5 text-indigo-600" /> Hồ Sơ Kỹ Thuật & Diễn Giải Khối Lượng
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Tích hợp biện pháp thi công từ Thư viện Định mức và diễn giải chi tiết cho thầu phụ.
                    </p>
                </div>
                <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md">
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> Xuất Hồ Sơ (Excel)
                </Button>
            </div>

            {/* Bảng Dữ liệu */}
            <Card className="border-none shadow-none bg-transparent">
                <CardContent className="p-0 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto max-h-[700px] custom-scrollbar">
                        <Table className="bg-white dark:bg-slate-950 min-w-[1100px]">
                            <TableHeader className="bg-slate-100 dark:bg-slate-900 sticky top-0 z-10 shadow-sm">
                                <TableRow>
                                    <TableHead className="w-[60px] text-center font-bold">STT</TableHead>
                                    <TableHead className="w-[100px] font-bold text-center">Mã hiệu</TableHead>
                                    <TableHead className="font-bold min-w-[350px]">Công tác / Diễn giải</TableHead>
                                    <TableHead className="w-[80px] text-center font-bold">ĐVT</TableHead>
                                    <TableHead className="w-[120px] text-right font-bold text-blue-700">Khối lượng</TableHead>
                                    <TableHead className="w-[450px] font-bold pl-6">Kỹ thuật thi công & Vật tư</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sections.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-10 text-slate-500">Chưa có dữ liệu công tác.</TableCell></TableRow>
                                ) : (
                                    sections.map((sec, secIdx) => (
                                        <React.Fragment key={sec.id}>
                                            {/* Dòng Hạng mục */}
                                            <TableRow className="bg-slate-200/80 dark:bg-slate-800/80 font-black uppercase">
                                                <TableCell className="text-center">{toRoman(secIdx + 1)}</TableCell>
                                                <TableCell colSpan={5}>{sec.item_name}</TableCell>
                                            </TableRow>

                                            {/* Dòng Công tác */}
                                            {qtoTasks.filter(t => t.parent_id === sec.id).map((task, tIdx) => {
                                                const norm = normsList.find(n => n.code === task.norm_code);
                                                const taskVol = task.details?.reduce((s: number, d: any) => s + (parseFloat(d.length || 1) * parseFloat(d.width || 1) * parseFloat(d.height || 1) * parseFloat(d.quantity_factor || 1)), 0) || Number(task.quantity);
                                                const matList = estItems.filter(e => e.qto_item_id === task.id && e.category === 'VL').map(e => e.material_name).join(", ");

                                                return (
                                                    <React.Fragment key={task.id}>
                                                        <TableRow className="border-b border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                                            <TableCell className="text-center font-bold text-slate-500 align-top pt-4">{tIdx + 1}</TableCell>
                                                            <TableCell className="text-center font-mono text-xs text-slate-400 align-top pt-4">{task.norm_code}</TableCell>
                                                            <TableCell className="font-bold text-base align-top pt-3.5">{task.item_name}</TableCell>
                                                            <TableCell className="text-center font-semibold text-slate-600 align-top pt-3.5">{task.unit}</TableCell>
                                                            <TableCell className="text-right font-black text-blue-700 dark:text-blue-400 text-lg align-top pt-3">{taskVol.toLocaleString('en-US', { maximumFractionDigits: 3 })}</TableCell>
                                                            <TableCell className="pl-6 py-3 bg-indigo-50/20 dark:bg-indigo-900/10">
                                                                <div className="space-y-2 text-sm">
                                                                    {/* Kỹ thuật chuẩn từ Thư viện */}
                                                                    {norm?.execution_guide && (
                                                                        <div className="p-2 bg-white dark:bg-slate-900 rounded border border-indigo-100 dark:border-indigo-900/50 text-slate-700 dark:text-slate-300 leading-relaxed italic shadow-sm">
                                                                            <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 block uppercase mb-1">Kỹ thuật chuẩn:</span>
                                                                            {norm.execution_guide}
                                                                        </div>
                                                                    )}
                                                                    {/* Lưu ý tại dự án (QTO) */}
                                                                    {task.description && (
                                                                        <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded border border-amber-200 dark:border-amber-800/50 text-amber-900 dark:text-amber-200 leading-relaxed shadow-sm">
                                                                            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 block uppercase mb-1">Lưu ý tại công trường:</span>
                                                                            {task.description}
                                                                        </div>
                                                                    )}
                                                                    {/* Vật tư */}
                                                                    {matList && (
                                                                        <div className="text-xs text-slate-600 dark:text-slate-400 flex gap-1.5 pt-1 items-start">
                                                                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" />
                                                                            <span><strong className="text-slate-700 dark:text-slate-200">Vật tư:</strong> {matList}</span>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </TableCell>
                                                        </TableRow>

                                                        {/* Các dòng diễn giải chi tiết */}
                                                        {task.details?.map((d: any, dIdx: number) => {
                                                            const dVol = (parseFloat(d.length || 1) * parseFloat(d.width || 1) * parseFloat(d.height || 1) * parseFloat(d.quantity_factor || 1));
                                                            // ✅ FIX UI: Lấy d.explanation thay vì d.name
                                                            const detailName = d.explanation || d.name || `Diễn giải ${dIdx + 1}`;

                                                            return (
                                                                <TableRow key={d.id} className="bg-slate-50/50 dark:bg-slate-900/30 border-b border-dashed border-slate-200 dark:border-slate-800">
                                                                    <TableCell></TableCell><TableCell></TableCell>
                                                                    <TableCell className="pl-8 text-sm text-slate-600 dark:text-slate-400">
                                                                        <div className="flex items-center gap-2">
                                                                            <CornerDownRight className="w-3.5 h-3.5 text-slate-400" />
                                                                            <span className="font-medium">- {detailName}:</span>
                                                                            <span className="font-mono text-[11px] text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                                                                                {d.length || 1} x {d.width || 1} x {d.height || 1} (HS:{d.quantity_factor || 1})
                                                                            </span>
                                                                        </div>
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-xs text-slate-400">-</TableCell>
                                                                    <TableCell className="text-right font-mono text-sm text-slate-700 dark:text-slate-300">
                                                                        {dVol.toLocaleString('en-US', { maximumFractionDigits: 3 })}
                                                                    </TableCell>
                                                                    <TableCell></TableCell>
                                                                </TableRow>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })}
                                        </React.Fragment>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}