"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format, differenceInDays, addDays, startOfDay, getDay, isValid } from "date-fns";
import { vi } from "date-fns/locale";
import { ChevronDown, ChevronRight, Maximize2, Minimize2, Download, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

interface ProjectGanttTabProps {
    tasks: any[];
}

export default function ProjectGanttTab({ tasks }: ProjectGanttTabProps) {
    const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('day');
    const [collapsedParents, setCollapsedParents] = useState<Set<string>>(new Set());
    const [isExporting, setIsExporting] = useState(false);

    const COL_WIDTH = viewMode === 'day' ? 40 : viewMode === 'week' ? 12 : 4;
    const ROW_HEIGHT = 40;

    // 1. Memo Xử lý Dữ liệu Công tác & Thời gian tổng
    const { processedTasks, chartStart, totalDays } = useMemo(() => {
        if (!tasks || tasks.length === 0) {
            return { processedTasks: [], chartStart: new Date(), totalDays: 0 };
        }

        const today = startOfDay(new Date());

        const parseSafeDate = (d: any, fallback: Date) => {
            if (!d) return fallback;
            const parsed = new Date(d);
            return isValid(parsed) ? parsed : fallback;
        };

        const parents = tasks.filter(t => !t.parent_id);
        const children = tasks.filter(t => t.parent_id);

        let globalMinDate = today;
        let globalMaxDate = today;
        let hasValidDates = false;

        const updateGlobalDates = (start: Date, end: Date) => {
            if (!hasValidDates) {
                globalMinDate = start; globalMaxDate = end; hasValidDates = true;
            } else {
                if (start < globalMinDate) globalMinDate = start;
                if (end > globalMaxDate) globalMaxDate = end;
            }
        };

        const pTasks: any[] = [];

        if (parents.length > 0) {
            parents.forEach(parent => {
                const childTasks = children.filter(c => c.parent_id === parent.id);

                let pStart = today;
                let pEnd = today;

                if (childTasks.length > 0) {
                    const childStarts = childTasks.map(c => parseSafeDate(c.start_date, today).getTime());
                    const childEnds = childTasks.map(c => parseSafeDate(c.due_date || c.end_date, today).getTime());

                    pStart = startOfDay(new Date(Math.min(...childStarts)));
                    pEnd = startOfDay(new Date(Math.max(...childEnds)));
                } else if (parent.start_date && (parent.due_date || parent.end_date)) {
                    pStart = startOfDay(parseSafeDate(parent.start_date, today));
                    pEnd = startOfDay(parseSafeDate(parent.due_date || parent.end_date, today));
                }

                updateGlobalDates(pStart, pEnd);

                pTasks.push({
                    id: parent.id,
                    isParent: true,
                    code: parent.wbs_code || "-",
                    name: parent.name,
                    rawName: `[${parent.wbs_code || "-"}] ${parent.name}`,
                    start: pStart,
                    end: pEnd,
                    progress: parent.progress || 0,
                    isOverdue: false
                });

                childTasks.forEach(child => {
                    const cStart = startOfDay(parseSafeDate(child.start_date, today));
                    const cEnd = startOfDay(parseSafeDate(child.due_date || child.end_date, today));
                    const progress = child.progress || 0;

                    updateGlobalDates(cStart, cEnd);

                    pTasks.push({
                        id: child.id,
                        parentId: parent.id,
                        isParent: false,
                        code: child.wbs_code || "-",
                        name: child.name,
                        rawName: `[${child.wbs_code || "-"}] ${child.name}`,
                        start: cStart,
                        end: cEnd,
                        progress: progress,
                        isOverdue: today > cEnd && progress < 100
                    });
                });
            });
        } else {
            tasks.forEach(t => {
                const start = startOfDay(parseSafeDate(t.start_date, today));
                const end = startOfDay(parseSafeDate(t.due_date || t.end_date, today));
                const progress = t.progress || 0;

                updateGlobalDates(start, end);

                pTasks.push({
                    id: t.id,
                    isParent: false,
                    code: t.wbs_code || "-",
                    name: t.name,
                    rawName: `[${t.wbs_code || "-"}] ${t.name}`,
                    start,
                    end,
                    progress,
                    isOverdue: today > end && progress < 100
                });
            });
        }

        const chartStart = addDays(globalMinDate, -3);
        const chartEnd = addDays(globalMaxDate, 10);
        const totalDays = differenceInDays(chartEnd, chartStart) + 1;

        return { processedTasks: pTasks, chartStart, totalDays };
    }, [tasks]);

    // 2. Memo Tính toán Headers của Timeline theo ViewMode
    const { topHeaders, bottomHeaders, bgGrid } = useMemo(() => {
        if (totalDays <= 0) return { topHeaders: [], bottomHeaders: [], bgGrid: [] };

        const daysArr = Array.from({ length: totalDays }).map((_, i) => addDays(chartStart, i));

        let tHeaders: { label: string, days: number }[] = [];
        let bHeaders: { label: string, days: number, isHighlight?: boolean }[] = [];
        let grids: { widthDays: number, isHighlight?: boolean }[] = [];

        if (viewMode === 'day') {
            let currentMonth = "";
            let monthDaysCount = 0;
            daysArr.forEach((d, i) => {
                const mLabel = format(d, "'Tháng' M, yyyy", { locale: vi });
                if (mLabel !== currentMonth) {
                    if (currentMonth !== "") tHeaders.push({ label: currentMonth, days: monthDaysCount });
                    currentMonth = mLabel;
                    monthDaysCount = 1;
                } else {
                    monthDaysCount++;
                }
                if (i === daysArr.length - 1) tHeaders.push({ label: currentMonth, days: monthDaysCount });

                const isSunday = getDay(d) === 0;
                bHeaders.push({ label: format(d, 'd'), days: 1, isHighlight: isSunday });
                grids.push({ widthDays: 1, isHighlight: isSunday });
            });
        }
        else if (viewMode === 'week') {
            let currentMonth = "";
            let monthDaysCount = 0;
            let currentWeek = "";
            let weekDaysCount = 0;

            daysArr.forEach((d, i) => {
                const mLabel = format(d, "'Tháng' M, yyyy", { locale: vi });
                if (mLabel !== currentMonth) {
                    if (currentMonth !== "") tHeaders.push({ label: currentMonth, days: monthDaysCount });
                    currentMonth = mLabel;
                    monthDaysCount = 1;
                } else {
                    monthDaysCount++;
                }
                if (i === daysArr.length - 1) tHeaders.push({ label: currentMonth, days: monthDaysCount });

                const wLabel = `Tuần ${format(d, 'I')}`;
                if (wLabel !== currentWeek) {
                    if (currentWeek !== "") {
                        bHeaders.push({ label: currentWeek, days: weekDaysCount });
                        grids.push({ widthDays: weekDaysCount });
                    }
                    currentWeek = wLabel;
                    weekDaysCount = 1;
                } else {
                    weekDaysCount++;
                }
                if (i === daysArr.length - 1) {
                    bHeaders.push({ label: currentWeek, days: weekDaysCount });
                    grids.push({ widthDays: weekDaysCount });
                }
            });
        }
        else if (viewMode === 'month') {
            let currentYear = "";
            let yearDaysCount = 0;
            let currentMonth = "";
            let monthDaysCount = 0;

            daysArr.forEach((d, i) => {
                const yLabel = format(d, "yyyy");
                if (yLabel !== currentYear) {
                    if (currentYear !== "") tHeaders.push({ label: currentYear, days: yearDaysCount });
                    currentYear = yLabel;
                    yearDaysCount = 1;
                } else {
                    yearDaysCount++;
                }
                if (i === daysArr.length - 1) tHeaders.push({ label: currentYear, days: yearDaysCount });

                const mLabel = format(d, "'Tháng' M", { locale: vi });
                if (mLabel !== currentMonth) {
                    if (currentMonth !== "") {
                        bHeaders.push({ label: currentMonth, days: monthDaysCount });
                        grids.push({ widthDays: monthDaysCount });
                    }
                    currentMonth = mLabel;
                    monthDaysCount = 1;
                } else {
                    monthDaysCount++;
                }
                if (i === daysArr.length - 1) {
                    bHeaders.push({ label: currentMonth, days: monthDaysCount });
                    grids.push({ widthDays: monthDaysCount });
                }
            });
        }

        return { topHeaders: tHeaders, bottomHeaders: bHeaders, bgGrid: grids };
    }, [chartStart, totalDays, viewMode]);

    const visibleTasks = useMemo(() => {
        return processedTasks.filter(t => t.isParent || !collapsedParents.has(t.parentId));
    }, [processedTasks, collapsedParents]);

    const toggleCollapse = (parentId: string) => {
        setCollapsedParents(prev => {
            const next = new Set(prev);
            if (next.has(parentId)) next.delete(parentId);
            else next.add(parentId);
            return next;
        });
    };

    const toggleCollapseAll = () => {
        if (collapsedParents.size > 0) {
            setCollapsedParents(new Set());
        } else {
            const allParentIds = processedTasks.filter(t => t.isParent).map(t => t.id);
            setCollapsedParents(new Set(allParentIds));
        }
    };

    // 3. Hàm xử lý xuất PDF bằng html2canvas + jsPDF
    const handleExportPDF = async () => {
        const ganttElement = document.getElementById("gantt-export-zone");
        if (!ganttElement) return;

        setIsExporting(true);
        try {
            // Mở rộng toàn bộ chiều cao và rộng ẩn để chụp ảnh đầy đủ
            const originalMaxHeight = ganttElement.style.maxHeight;
            const originalOverflow = ganttElement.style.overflow;
            ganttElement.style.maxHeight = 'none';
            ganttElement.style.overflow = 'visible';

            const canvas = await html2canvas(ganttElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                windowWidth: ganttElement.scrollWidth,
                windowHeight: ganttElement.scrollHeight
            });

            // Khôi phục lại UI ban đầu
            ganttElement.style.maxHeight = originalMaxHeight;
            ganttElement.style.overflow = originalOverflow;

            const imgData = canvas.toDataURL("image/png");
            const pdf = new jsPDF("l", "mm", "a4"); // Khổ A4 nằm ngang

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

            pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
            pdf.save("Tien_Do_Thi_Cong.pdf");
        } catch (error) {
            console.error("Lỗi xuất PDF:", error);
            alert("Có lỗi xảy ra khi xuất PDF. Vui lòng thử lại!");
        } finally {
            setIsExporting(false);
        }
    };

    if (processedTasks.length === 0) {
        return (
            <div className="p-10 text-center text-slate-500 italic">
                Chưa có dữ liệu tiến độ để vẽ biểu đồ Gantt. Hãy đồng bộ từ Dự toán sang.
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {/* TOOLBAR: Controls */}
            <div className="flex flex-col items-center justify-between rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row dark:border-slate-800 dark:bg-[#020817]">
                <div className="flex items-center gap-2">
                    <button
                        onClick={toggleCollapseAll}
                        className="flex items-center rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                        {collapsedParents.size > 0 ? <Maximize2 className="mr-1.5 h-3.5 w-3.5" /> : <Minimize2 className="mr-1.5 h-3.5 w-3.5" />}
                        {collapsedParents.size > 0 ? "Mở rộng tất cả" : "Thu gọn tất cả"}
                    </button>

                    {/* NÚT XUẤT PDF MỚI */}
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="flex items-center rounded-md border border-blue-700 bg-blue-600 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                        {isExporting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Download className="mr-1.5 h-3.5 w-3.5" />}
                        {isExporting ? "Đang xuất..." : "Xuất PDF"}
                    </button>
                </div>

                <div className="mt-2 flex rounded-md border border-slate-200 bg-slate-100 p-1 shadow-sm sm:mt-0 dark:border-slate-700 dark:bg-slate-800">
                    <button onClick={() => setViewMode('day')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'day' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Ngày</button>
                    <button onClick={() => setViewMode('week')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'week' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Tuần</button>
                    <button onClick={() => setViewMode('month')} className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${viewMode === 'month' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-slate-100' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>Tháng</button>
                </div>
            </div>

            <Card className="border-none bg-transparent shadow-none">
                <CardContent className="p-0">
                    {/* VÙNG CUỘN CHÍNH (FIX LỖI SCROLL) */}
                    <div
                        id="gantt-export-zone"
                        className="custom-scrollbar relative max-h-[600px] w-full overflow-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#020817]"
                    >
                        <div className="flex w-max min-w-full">

                            {/* 1. BẢNG BÊN TRÁI (STICKY LEFT & CỐ ĐỊNH BACKGROUND) */}
                            <div className="sticky left-0 z-30 flex w-[410px] flex-shrink-0 flex-col border-r border-slate-200 bg-white shadow-[2px_0_5px_rgba(0,0,0,0.1)] dark:border-slate-800 dark:bg-slate-950">
                                {/* Header bảng trái (Sticky Top) */}
                                <div className="sticky top-0 z-40 flex h-[50px] items-center border-b border-slate-200 bg-slate-100 font-bold text-[11px] text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                                    <div className="flex h-full flex-1 items-center border-r border-slate-200 px-3 dark:border-slate-800">Tên công việc</div>
                                    <div className="flex h-full w-[50px] items-center justify-center border-r border-slate-200 px-1 text-center dark:border-slate-800">Số ngày</div>
                                    <div className="flex h-full w-[60px] items-center justify-center border-r border-slate-200 px-1 dark:border-slate-800">Bắt đầu</div>
                                    <div className="flex h-full w-[60px] items-center justify-center px-1">Kết thúc</div>
                                </div>

                                {/* Các dòng dữ liệu bên trái */}
                                {visibleTasks.map((t) => {
                                    const duration = differenceInDays(t.end, t.start) + 1;
                                    return (
                                        <div
                                            key={`left-${t.id}`}
                                            className={`flex border-b border-slate-200 dark:border-slate-800 text-[11px] transition-colors ${t.isParent ? 'bg-slate-50 dark:bg-slate-900 font-bold' : 'bg-white dark:bg-[#020817] hover:bg-slate-50 dark:hover:bg-slate-900/50'}`}
                                            style={{ height: ROW_HEIGHT }}
                                        >
                                            <div className={`flex-1 px-3 border-r border-slate-200 dark:border-slate-800 flex items-center truncate ${t.isParent ? '' : 'pl-7'}`} title={t.rawName}>
                                                {t.isParent && (
                                                    <button
                                                        onClick={() => toggleCollapse(t.id)}
                                                        className="mr-1.5 hover:bg-slate-200 dark:hover:bg-slate-700 rounded p-0.5 text-slate-500 transition-colors"
                                                    >
                                                        {collapsedParents.has(t.id) ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                                                    </button>
                                                )}
                                                <span className="truncate text-slate-700 dark:text-slate-300">{t.rawName}</span>
                                            </div>
                                            <div className="flex w-[50px] items-center justify-center border-r border-slate-200 px-1 font-bold text-[10px] text-slate-600 dark:border-slate-800 dark:text-slate-400">
                                                {duration}
                                            </div>
                                            <div className="flex w-[60px] items-center justify-center border-r border-slate-200 px-1 font-medium text-[10px] text-slate-500 dark:border-slate-800">
                                                {format(t.start, "dd/MM")}
                                            </div>
                                            <div className="flex w-[60px] items-center justify-center px-1 font-medium text-[10px] text-slate-500">
                                                {format(t.end, "dd/MM")}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* 2. TIMELINE BÊN PHẢI */}
                            <div className="relative flex flex-col" style={{ width: totalDays * COL_WIDTH }}>
                                {/* Header Timeline (Sticky Top) */}
                                <div className="sticky top-0 z-20 flex h-[50px] flex-col border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/80">
                                    <div className="flex h-[25px] border-b border-slate-200 dark:border-slate-800">
                                        {topHeaders.map((m, idx) => (
                                            <div key={`th-${idx}`} className="flex items-center overflow-hidden border-r border-slate-200 px-2 font-bold text-ellipsis whitespace-nowrap text-[11px] text-slate-700 dark:border-slate-800 dark:text-slate-300" style={{ width: m.days * COL_WIDTH }}>
                                                {m.label}
                                            </div>
                                        ))}
                                    </div>
                                    <div className="flex h-[25px]">
                                        {bottomHeaders.map((b, idx) => (
                                            <div key={`bh-${idx}`} className={`flex items-center justify-center text-[10px] font-medium border-r border-slate-200 dark:border-slate-800 overflow-hidden whitespace-nowrap text-ellipsis ${b.isHighlight ? 'bg-slate-200/50 dark:bg-slate-800/80 text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`} style={{ width: b.days * COL_WIDTH }}>
                                                {b.label}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Lưới Timeline (Background Grid) */}
                                <div className="pointer-events-none absolute top-[50px] bottom-0 left-0 z-0 flex">
                                    {bgGrid.map((bg, idx) => (
                                        <div key={`grid-${idx}`} className={`h-full border-r border-slate-100 dark:border-slate-800/60 ${bg.isHighlight ? 'bg-slate-50/50 dark:bg-slate-900/40' : ''}`} style={{ width: bg.widthDays * COL_WIDTH }}></div>
                                    ))}
                                </div>

                                {/* Các thanh tiến độ (Bars) */}
                                <div className="relative z-10 flex flex-col">
                                    {visibleTasks.map((t) => {
                                        const startOffset = differenceInDays(t.start, chartStart);
                                        const duration = differenceInDays(t.end, t.start) + 1;

                                        let barClass = "";
                                        let progressClass = "";
                                        let heightClass = "h-[24px] top-[8px]";

                                        if (t.isParent) {
                                            barClass = "bg-slate-700 border-slate-800 dark:bg-slate-600 rounded-sm";
                                            heightClass = "h-[10px] top-[15px]";
                                        } else {
                                            if (t.progress >= 100) {
                                                barClass = "bg-emerald-500 border-emerald-600 dark:border-emerald-400 rounded-md";
                                                progressClass = "bg-emerald-600/30 dark:bg-emerald-400/30";
                                            } else if (t.isOverdue) {
                                                barClass = "bg-rose-500 border-rose-600 dark:border-rose-400 rounded-md";
                                                progressClass = "bg-rose-600/30 dark:bg-rose-400/30";
                                            } else {
                                                barClass = "bg-blue-500 border-blue-600 dark:border-blue-400 rounded-md";
                                                progressClass = "bg-blue-600/30 dark:bg-blue-400/30";
                                            }
                                        }

                                        return (
                                            <div key={`row-${t.id}`} className={`relative border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group ${t.isParent ? 'bg-slate-50/30 dark:bg-slate-900/20' : ''}`} style={{ height: ROW_HEIGHT }}>
                                                <div
                                                    className={`absolute shadow-sm border overflow-hidden cursor-pointer transition-all duration-300 ${barClass} ${heightClass}`}
                                                    style={{ left: startOffset * COL_WIDTH, width: duration * COL_WIDTH }}
                                                >
                                                    {!t.isParent && t.progress > 0 && t.progress < 100 && (
                                                        <div className={`h-full ${progressClass}`} style={{ width: `${t.progress}%` }}></div>
                                                    )}
                                                </div>

                                                <div className="pointer-events-none invisible absolute top-[35px] z-50 opacity-0 transition-all group-hover:visible group-hover:opacity-100" style={{ left: (startOffset * COL_WIDTH) + 10 }}>
                                                    <div className="min-w-[240px] rounded-lg border border-slate-200 bg-white p-3 text-[12px] shadow-xl dark:border-slate-700 dark:bg-slate-800">
                                                        <h4 className="mb-2 font-bold text-slate-800 dark:text-slate-100">{t.rawName}</h4>
                                                        <div className="space-y-1 text-slate-600 dark:text-slate-300">
                                                            <div className="flex justify-between">
                                                                <span>Bắt đầu:</span><span className="font-semibold">{format(t.start, "EEEE, dd/MM/yyyy", { locale: vi })}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Kết thúc:</span><span className="font-semibold">{format(t.end, "EEEE, dd/MM/yyyy", { locale: vi })}</span>
                                                            </div>
                                                            <div className="flex justify-between">
                                                                <span>Thời gian:</span><span className="font-semibold text-amber-600">{duration} ngày</span>
                                                            </div>
                                                            {!t.isParent && (
                                                                <div className="mt-1 flex justify-between border-t border-slate-100 pt-1 dark:border-slate-700">
                                                                    <span>Tiến độ:</span>
                                                                    <span className={`font-bold ${t.progress >= 100 ? 'text-green-600' : 'text-blue-600'}`}>{t.progress}%</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}