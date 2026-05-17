"use client";

import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/utils";
import { format, differenceInDays, addDays, startOfDay, getDay } from "date-fns";
import { vi } from "date-fns/locale";

interface ProjectGanttTabProps {
    tasks: any[];
}

export default function ProjectGanttTab({ tasks }: ProjectGanttTabProps) {
    // Độ rộng của 1 ô (1 ngày)
    const COL_WIDTH = 40;
    const ROW_HEIGHT = 40;

    const { processedTasks, chartStart, chartEnd, totalDays, daysArr, monthsArr } = useMemo(() => {
        if (!tasks || tasks.length === 0) {
            return { processedTasks: [], chartStart: new Date(), chartEnd: new Date(), totalDays: 0, daysArr: [], monthsArr: [] };
        }

        const today = startOfDay(new Date());

        // Chuẩn hóa dữ liệu Task và tìm khoảng thời gian biểu đồ
        let minDate = startOfDay(new Date(tasks[0].start_date || new Date()));
        let maxDate = startOfDay(new Date(tasks[0].end_date || new Date()));

        const pTasks = tasks.map((t) => {
            const start = startOfDay(new Date(t.start_date || new Date()));
            const end = startOfDay(new Date(t.end_date || new Date()));
            const progress = t.progress || 0;
            const isOverdue = today > end && progress < 100;

            if (start < minDate) minDate = start;
            if (end > maxDate) maxDate = end;

            return {
                id: t.id,
                code: t.wbs_code || "-",
                name: t.name,
                rawName: `[${t.wbs_code || "-"}] ${t.name}`,
                start,
                end,
                progress,
                isOverdue,
            };
        });

        // Mở rộng biểu đồ ra trước 5 ngày và sau 10 ngày để nhìn thoáng hơn
        const cStart = addDays(minDate, -5);
        const cEnd = addDays(maxDate, 10);
        const tDays = differenceInDays(cEnd, cStart) + 1;

        // Sinh mảng các ngày
        const dArr = Array.from({ length: tDays }).map((_, i) => addDays(cStart, i));

        // Gom nhóm các ngày theo Tháng / Năm để làm Header Dòng 1
        let currentMonth = "";
        let monthDaysCount = 0;
        const mArr: { label: string; days: number }[] = [];

        dArr.forEach((d, i) => {
            const mLabel = format(d, "'Tháng' M, yyyy", { locale: vi });
            if (mLabel !== currentMonth) {
                if (currentMonth !== "") {
                    mArr.push({ label: currentMonth, days: monthDaysCount });
                }
                currentMonth = mLabel;
                monthDaysCount = 1;
            } else {
                monthDaysCount++;
            }
            if (i === dArr.length - 1) {
                mArr.push({ label: currentMonth, days: monthDaysCount });
            }
        });

        return {
            processedTasks: pTasks,
            chartStart: cStart,
            chartEnd: cEnd,
            totalDays: tDays,
            daysArr: dArr,
            monthsArr: mArr,
        };
    }, [tasks]);

    if (processedTasks.length === 0) {
        return (
            <div className="p-10 text-center text-slate-500 italic">
                Chưa có dữ liệu tiến độ để vẽ biểu đồ Gantt.
            </div>
        );
    }

    return (
        <Card className="border-none shadow-none bg-transparent">
            <CardContent className="p-0">
                {/* Vùng chứa có thanh cuộn ngang - Bọc toàn bộ bảng và timeline */}
                <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 custom-scrollbar shadow-sm bg-white dark:bg-[#020817]">
                    <div className="flex w-max min-w-full">

                        {/* ========================================= */}
                        {/* 1. BẢNG BÊN TRÁI (STICKY KHÔNG BỊ TRÔI) */}
                        {/* ========================================= */}
                        <div className="sticky left-0 z-30 w-[310px] bg-slate-50 dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-[2px_0_5px_rgba(0,0,0,0.05)] flex-shrink-0 flex flex-col">
                            {/* Header Bảng */}
                            <div className="flex border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-700 dark:text-slate-300 h-[50px] items-center">
                                <div className="flex-1 px-3 border-r border-slate-200 dark:border-slate-800 h-full flex items-center">Tên công việc</div>
                                <div className="w-[65px] px-1 border-r border-slate-200 dark:border-slate-800 h-full flex items-center justify-center">Bắt đầu</div>
                                <div className="w-[65px] px-1 h-full flex items-center justify-center">Kết thúc</div>
                            </div>

                            {/* Các hàng dữ liệu */}
                            {processedTasks.map((t) => (
                                <div key={`left-${t.id}`} className="flex border-b border-slate-200 dark:border-slate-800 text-[11px] bg-white dark:bg-[#020817] hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors" style={{ height: ROW_HEIGHT }}>
                                    <div className="flex-1 px-3 border-r border-slate-200 dark:border-slate-800 flex items-center truncate" title={t.rawName}>
                                        <span className="truncate font-medium text-slate-700 dark:text-slate-300">{t.rawName}</span>
                                    </div>
                                    <div className="w-[65px] px-1 border-r border-slate-200 dark:border-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                                        {formatDate(t.start)}
                                    </div>
                                    <div className="w-[65px] px-1 flex items-center justify-center text-[10px] text-slate-500">
                                        {formatDate(t.end)}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* ========================================= */}
                        {/* 2. KHU VỰC TIMELINE BÊN PHẢI */}
                        {/* ========================================= */}
                        <div className="flex flex-col relative" style={{ width: totalDays * COL_WIDTH }}>

                            {/* --- HEADER TRỤC THỜI GIAN (2 DÒNG) --- */}
                            <div className="h-[50px] flex flex-col border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 sticky top-0 z-20">
                                {/* Dòng 1: Tháng / Năm */}
                                <div className="flex h-[25px] border-b border-slate-200 dark:border-slate-800">
                                    {monthsArr.map((m, idx) => (
                                        <div key={`m-${idx}`} className="flex items-center px-2 text-[11px] font-bold text-slate-700 dark:text-slate-300 border-r border-slate-200 dark:border-slate-800" style={{ width: m.days * COL_WIDTH }}>
                                            {m.label}
                                        </div>
                                    ))}
                                </div>
                                {/* Dòng 2: Chỉ hiển thị Số Ngày */}
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

                            {/* --- BACKGROUND LƯỚI EXCEL VÀ HIGHLIGHT CHỦ NHẬT --- */}
                            <div className="absolute top-[50px] bottom-0 left-0 flex pointer-events-none z-0">
                                {daysArr.map((d, idx) => {
                                    const isSunday = getDay(d) === 0;
                                    return (
                                        <div key={`grid-${idx}`} className={`h-full border-r border-slate-100 dark:border-slate-800/60 ${isSunday ? 'bg-slate-50/50 dark:bg-slate-900/40' : ''}`} style={{ width: COL_WIDTH }}></div>
                                    );
                                })}
                            </div>

                            {/* --- CÁC THANH TIẾN ĐỘ (BARS) --- */}
                            <div className="relative z-10 flex flex-col">
                                {processedTasks.map((t) => {
                                    // Tính toán vị trí và độ dài thanh Gantt
                                    const startOffset = differenceInDays(t.start, chartStart);
                                    const duration = differenceInDays(t.end, t.start) + 1; // +1 để bao gồm cả ngày kết thúc

                                    // Phân loại màu sắc
                                    let barColor = "bg-blue-500 border-blue-600 dark:border-blue-400";
                                    let progressColor = "bg-blue-600/30 dark:bg-blue-400/30";
                                    if (t.progress >= 100) {
                                        barColor = "bg-green-500 border-green-600 dark:border-green-400";
                                        progressColor = "bg-green-600/30 dark:bg-green-400/30";
                                    } else if (t.isOverdue) {
                                        barColor = "bg-red-500 border-red-600 dark:border-red-400";
                                        progressColor = "bg-red-600/30 dark:bg-red-400/30";
                                    }

                                    return (
                                        <div key={`row-${t.id}`} className="relative border-b border-slate-100 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group" style={{ height: ROW_HEIGHT }}>

                                            {/* THANH GANTT CHÍNH */}
                                            <div
                                                className={`absolute top-[8px] h-[24px] rounded-md shadow-sm border overflow-hidden cursor-pointer ${barColor}`}
                                                style={{ left: startOffset * COL_WIDTH, width: duration * COL_WIDTH }}
                                            >
                                                {/* Hiển thị % chìm bên trong thanh nếu có tiến độ */}
                                                {t.progress > 0 && t.progress < 100 && (
                                                    <div className={`h-full ${progressColor}`} style={{ width: `${t.progress}%` }}></div>
                                                )}
                                            </div>

                                            {/* TOOLTIP XỊN XÒ (Chỉ hiện khi hover vào hàng) */}
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
                                                        <div className="flex justify-between pt-1 mt-1 border-t border-slate-100 dark:border-slate-700">
                                                            <span>Tiến độ:</span>
                                                            <span className={`font-bold ${t.progress >= 100 ? 'text-green-600' : 'text-blue-600'}`}>{t.progress}%</span>
                                                        </div>
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