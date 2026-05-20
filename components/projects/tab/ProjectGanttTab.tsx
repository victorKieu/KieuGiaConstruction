"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { format, differenceInDays, addDays, startOfDay, getDay, isValid } from "date-fns";
import { vi } from "date-fns/locale";

interface ProjectGanttTabProps {
    tasks: any[];
}

export default function ProjectGanttTab({ tasks }: ProjectGanttTabProps) {
    console.log("Dữ liệu tasks nhận được trong Gantt:", tasks);
    const COL_WIDTH = 40;
    const ROW_HEIGHT = 40;

    const { processedTasks, chartStart, totalDays, daysArr, monthsArr } = useMemo(() => {
        if (!tasks || tasks.length === 0) {
            return { processedTasks: [], chartStart: new Date(), totalDays: 0, daysArr: [], monthsArr: [] };
        }

        const today = startOfDay(new Date());

        // Hàm hỗ trợ parse ngày an toàn, chống crash "Invalid Date"
        const parseSafeDate = (d: any, fallback: Date) => {
            if (!d) return fallback;
            const parsed = new Date(d);
            return isValid(parsed) ? parsed : fallback;
        };

        // 1. Phân loại Task Cha (Sections) và Task Con
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

        // 2. Tính toán ngày tháng cho Hạng mục Cha dựa trên các Công tác Con
        if (parents.length > 0) {
            parents.forEach(parent => {
                const childTasks = children.filter(c => c.parent_id === parent.id);

                let pStart = today;
                let pEnd = today;

                // Tính Boundary cho Task Cha
                if (childTasks.length > 0) {
                    // ✅ Lấy due_date làm end_date
                    const childStarts = childTasks.map(c => parseSafeDate(c.start_date, today).getTime());
                    const childEnds = childTasks.map(c => parseSafeDate(c.due_date || c.end_date, today).getTime());

                    pStart = startOfDay(new Date(Math.min(...childStarts)));
                    pEnd = startOfDay(new Date(Math.max(...childEnds)));
                } else if (parent.start_date && (parent.due_date || parent.end_date)) {
                    pStart = startOfDay(parseSafeDate(parent.start_date, today));
                    pEnd = startOfDay(parseSafeDate(parent.due_date || parent.end_date, today));
                }

                updateGlobalDates(pStart, pEnd);

                // Push Task Cha
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

                // Push Task Con
                childTasks.forEach(child => {
                    // ✅ Lấy due_date làm end_date
                    const cStart = startOfDay(parseSafeDate(child.start_date, today));
                    const cEnd = startOfDay(parseSafeDate(child.due_date || child.end_date, today));
                    const progress = child.progress || 0;

                    updateGlobalDates(cStart, cEnd);

                    pTasks.push({
                        id: child.id,
                        isParent: false,
                        code: child.wbs_code || "-",
                        name: child.name,
                        rawName: `[${child.wbs_code || "-"}] ${child.name}`,
                        start: cStart,
                        end: cEnd, // Gantt sẽ dùng cEnd này để vẽ độ dài thanh
                        progress: progress,
                        isOverdue: today > cEnd && progress < 100
                    });
                });
            });
        } else {
            // Không có cấu trúc Cha-Con thì render phẳng
            tasks.forEach(t => {
                // ✅ Lấy due_date làm end_date
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

        // 3. Mở rộng biểu đồ ra trước 3 ngày và sau 10 ngày cho thoáng
        const chartStart = addDays(globalMinDate, -3);
        const chartEnd = addDays(globalMaxDate, 10);
        const totalDays = differenceInDays(chartEnd, chartStart) + 1;

        const daysArr = Array.from({ length: totalDays }).map((_, i) => addDays(chartStart, i));

        // 4. Sinh header Tháng
        let currentMonth = "";
        let monthDaysCount = 0;
        const mArr: { label: string; days: number }[] = [];

        daysArr.forEach((d, i) => {
            const mLabel = format(d, "'Tháng' M, yyyy", { locale: vi });
            if (mLabel !== currentMonth) {
                if (currentMonth !== "") mArr.push({ label: currentMonth, days: monthDaysCount });
                currentMonth = mLabel;
                monthDaysCount = 1;
            } else {
                monthDaysCount++;
            }
            if (i === daysArr.length - 1) mArr.push({ label: currentMonth, days: monthDaysCount });
        });

        return { processedTasks: pTasks, chartStart, totalDays, daysArr, monthsArr: mArr };
    }, [tasks]);

    if (processedTasks.length === 0) {
        return (
            <div className="p-10 text-center text-slate-500 italic">
                Chưa có dữ liệu tiến độ để vẽ biểu đồ Gantt. Hãy đồng bộ từ Dự toán sang.
            </div>
        );
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
                <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 custom-scrollbar shadow-sm bg-white dark:bg-[#020817]">
                    <div className="flex w-max min-w-full">

                        {/* 1. BẢNG BÊN TRÁI (STICKY) */}
                        <div className="sticky left-0 z-30 w-[330px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)] flex-shrink-0 flex flex-col">
                            <div className="flex border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 h-[50px] items-center">
                                <div className="flex-1 px-3 border-r border-slate-200 dark:border-slate-800 h-full flex items-center">Tên công việc</div>
                                <div className="w-[60px] px-1 border-r border-slate-200 dark:border-slate-800 h-full flex items-center justify-center">Bắt đầu</div>
                                <div className="w-[60px] px-1 h-full flex items-center justify-center">Kết thúc</div>
                            </div>

                            {processedTasks.map((t) => (
                                <div
                                    key={`left-${t.id}`}
                                    className={`flex border-b border-slate-200 dark:border-slate-800 text-[11px] transition-colors ${t.isParent ? 'bg-slate-100/80 dark:bg-slate-800/80 font-bold' : 'bg-white dark:bg-[#020817] hover:bg-slate-50 dark:hover:bg-slate-900'}`}
                                    style={{ height: ROW_HEIGHT }}
                                >
                                    <div className={`flex-1 px-3 border-r border-slate-200 dark:border-slate-800 flex items-center truncate ${t.isParent ? '' : 'pl-6'}`} title={t.rawName}>
                                        <span className="truncate text-slate-700 dark:text-slate-300">{t.rawName}</span>
                                    </div>
                                    <div className="w-[60px] px-1 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-500 font-medium">
                                        {format(t.start, "dd/MM")}
                                    </div>
                                    <div className="w-[60px] px-1 flex items-center justify-center text-[10px] text-slate-500 font-medium">
                                        {format(t.end, "dd/MM")}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* 2. TIMELINE BÊN PHẢI */}
                        <div className="flex flex-col relative" style={{ width: totalDays * COL_WIDTH }}>
                            <div className="h-[50px] flex flex-col border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky top-0 z-20">
                                <div className="flex h-[25px] border-b border-slate-200 dark:border-slate-800">
                                    {monthsArr.map((m, idx) => (
                                        <div key={`m-${idx}`} className="flex items-center px-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800" style={{ width: m.days * COL_WIDTH }}>
                                            {m.label}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex h-[25px]">
                                    {daysArr.map((d, idx) => {
                                        const isSunday = getDay(d) === 0;
                                        return (
                                            <div key={`d-${idx}`} className={`flex items-center justify-center text-[10px] font-medium border-r border-slate-200 dark:border-slate-800 ${isSunday ? 'bg-slate-200/50 dark:bg-slate-800/80 text-red-500 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`} style={{ width: COL_WIDTH }}>
                                                {format(d, 'd')}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            <div className="absolute top-[50px] bottom-0 left-0 flex pointer-events-none z-0">
                                {daysArr.map((d, idx) => {
                                    const isSunday = getDay(d) === 0;
                                    return (
                                        <div key={`grid-${idx}`} className={`h-full border-r border-slate-100 dark:border-slate-800/60 ${isSunday ? 'bg-slate-50/50 dark:bg-slate-900/40' : ''}`} style={{ width: COL_WIDTH }}></div>
                                    );
                                })}
                            </div>

                            <div className="relative z-10 flex flex-col">
                                {processedTasks.map((t) => {
                                    const startOffset = differenceInDays(t.start, chartStart);
                                    // +1 để bao trọn cả ngày kết thúc (duration)
                                    const duration = differenceInDays(t.end, t.start) + 1;

                                    // Render giao diện riêng cho Hạng mục Cha (Đen, mỏng) và Công tác (Màu sắc)
                                    let barClass = "";
                                    let progressClass = "";
                                    let heightClass = "h-[24px] top-[8px]"; // Task bình thường

                                    if (t.isParent) {
                                        barClass = "bg-slate-700 border-slate-800 dark:bg-slate-600 rounded-sm";
                                        heightClass = "h-[10px] top-[15px]"; // Mỏng lại cho task cha
                                    } else {
                                        if (t.progress >= 100) {
                                            barClass = "bg-green-500 border-green-600 dark:border-green-400 rounded-md";
                                            progressClass = "bg-green-600/30 dark:bg-green-400/30";
                                        } else if (t.isOverdue) {
                                            barClass = "bg-red-500 border-red-600 dark:border-red-400 rounded-md";
                                            progressClass = "bg-red-600/30 dark:bg-red-400/30";
                                        } else {
                                            barClass = "bg-blue-500 border-blue-600 dark:border-blue-400 rounded-md";
                                            progressClass = "bg-blue-600/30 dark:bg-blue-400/30";
                                        }
                                    }

                                    return (
                                        <div key={`row-${t.id}`} className={`relative border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group ${t.isParent ? 'bg-slate-50/30 dark:bg-slate-900/20' : ''}`} style={{ height: ROW_HEIGHT }}>
                                            <div
                                                className={`absolute shadow-sm border overflow-hidden cursor-pointer ${barClass} ${heightClass}`}
                                                style={{ left: startOffset * COL_WIDTH, width: duration * COL_WIDTH }}
                                            >
                                                {!t.isParent && t.progress > 0 && t.progress < 100 && (
                                                    <div className={`h-full ${progressClass}`} style={{ width: `${t.progress}%` }}></div>
                                                )}
                                            </div>

                                            {/* Tooltip Hover */}
                                            <div className="absolute top-[35px] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50 pointer-events-none" style={{ left: (startOffset * COL_WIDTH) + 10 }}>
                                                <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl rounded-lg p-3 min-w-[240px] text-[12px]">
                                                    <h4 className="font-bold text-slate-800 dark:text-slate-100 mb-2">{t.rawName}</h4>
                                                    <div className="space-y-1 text-slate-600 dark:text-slate-300">
                                                        <div className="flex justify-between">
                                                            <span>Bắt đầu:</span><span className="font-semibold">{format(t.start, "EEEE, dd/MM/yyyy", { locale: vi })}</span>
                                                        </div>
                                                        <div className="flex justify-between">
                                                            <span>Kết thúc:</span><span className="font-semibold">{format(t.end, "EEEE, dd/MM/yyyy", { locale: vi })}</span>
                                                        </div>
                                                        {!t.isParent && (
                                                            <div className="flex justify-between pt-1 mt-1 border-t border-slate-100 dark:border-slate-700">
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
    );
}