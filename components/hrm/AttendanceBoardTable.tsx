import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface AttendanceBoardProps {
    records: any[];
    daysInMonth: number;
}

export function AttendanceBoardTable({ records, daysInMonth }: AttendanceBoardProps) {
    if (!records || records.length === 0) {
        return <div className="p-8 text-center text-slate-500">Chưa có dữ liệu bảng công.</div>;
    }

    // Mảng render các ngày từ 1 -> daysInMonth
    const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    // Đổ màu theo Ký hiệu
    const getCellColor = (symbol: string) => {
        switch (symbol) {
            case 'X': return "text-emerald-700 dark:text-emerald-400 font-bold";
            case 'X/2': return "text-blue-600 dark:text-blue-400 font-bold";
            case 'P': return "text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-900/20";
            case 'K': return "text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20";
            case 'CT': return "text-indigo-600 dark:text-indigo-400 font-bold bg-indigo-50 dark:bg-indigo-900/20";
            case 'M': return "text-amber-600 dark:text-amber-400 font-bold";
            default: return "text-slate-400";
        }
    };

    return (
        <div className="w-full">
            {/* Chú thích Ký hiệu (Legend) */}
            <div className="flex flex-wrap gap-4 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center"><span className="font-bold text-emerald-600 w-6">X</span> : Đủ công</div>
                <div className="flex items-center"><span className="font-bold text-blue-600 w-8">X/2</span> : Nửa công</div>
                <div className="flex items-center"><span className="font-bold text-violet-600 w-6">P</span> : Phép (Có lương)</div>
                <div className="flex items-center"><span className="font-bold text-red-600 w-6">K</span> : Không lương</div>
                <div className="flex items-center"><span className="font-bold text-indigo-600 w-8">CT</span> : Công tác</div>
                <div className="flex items-center"><span className="font-bold text-amber-600 w-6">M</span> : Đi muộn/Về sớm</div>
            </div>

            {/* Bảng Công Matrix */}
            <div className="overflow-x-auto w-full relative">
                <Table className="min-w-max border-collapse">
                    <TableHeader>
                        <TableRow className="bg-slate-100/80 dark:bg-slate-800/80 border-b-2 border-slate-200 dark:border-slate-700">
                            {/* 2 Cột Sticky */}
                            <TableHead className="w-[80px] font-bold sticky left-0 z-20 bg-slate-100 dark:bg-slate-800 drop-shadow-[2px_0_2px_rgba(0,0,0,0.05)] border-r">Mã NV</TableHead>
                            <TableHead className="w-[180px] font-bold sticky left-[80px] z-20 bg-slate-100 dark:bg-slate-800 drop-shadow-[2px_0_2px_rgba(0,0,0,0.05)] border-r">Họ Tên</TableHead>

                            {/* Cột các ngày trong tháng */}
                            {daysArray.map(day => (
                                <TableHead key={day} className="text-center font-bold text-xs w-[35px] px-1 border-r border-slate-200 dark:border-slate-700">{day}</TableHead>
                            ))}

                            {/* Cột Tổng kết */}
                            <TableHead className="text-center font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10 min-w-[80px]">Tổng C.Hưởng</TableHead>
                            <TableHead className="text-center font-bold text-red-700 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10 min-w-[80px]">Tổng C.Nghỉ</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TooltipProvider delayDuration={100}>
                            {records.map((r) => (
                                <TableRow key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <TableCell className="font-mono text-xs text-slate-500 sticky left-0 z-10 bg-white dark:bg-slate-900 border-r">{r.employeeCode}</TableCell>
                                    <TableCell className="font-bold text-slate-800 dark:text-slate-200 sticky left-[80px] z-10 bg-white dark:bg-slate-900 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] truncate max-w-[180px]">{r.name}</TableCell>

                                    {daysArray.map(day => (
                                        <TableCell key={day} className="text-center p-0 border-r border-slate-100 dark:border-slate-800 align-middle">
                                            {r.dailyData[day]?.status ? (
                                                <Tooltip>
                                                    <TooltipTrigger className={`w-full h-full min-h-[40px] flex items-center justify-center text-xs ${getCellColor(r.dailyData[day].status)}`}>
                                                        {r.dailyData[day].status}
                                                    </TooltipTrigger>
                                                    <TooltipContent className="text-xs">
                                                        Ngày {day}: {r.dailyData[day].tooltip}
                                                    </TooltipContent>
                                                </Tooltip>
                                            ) : (
                                                <div className="w-full h-full min-h-[40px]"></div>
                                            )}
                                        </TableCell>
                                    ))}

                                    <TableCell className="text-center font-bold text-emerald-600 bg-emerald-50/30 dark:bg-emerald-900/10">{r.totalPaidDays}</TableCell>
                                    <TableCell className="text-center font-bold text-red-600 bg-red-50/30 dark:bg-red-900/10">{r.totalUnpaidDays}</TableCell>
                                </TableRow>
                            ))}
                        </TooltipProvider>
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}