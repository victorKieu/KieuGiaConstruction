import React from "react";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { MapPin, Clock, LogIn, LogOut } from "lucide-react";
import { format, parseISO, isValid } from "date-fns";

export interface AttendanceRecord {
    id: string;
    date: string;
    employeeCode: string;
    name: string;
    checkIn: string;
    checkOut: string;
    status: string;
    location?: string;
}

interface AttendanceTableProps {
    records: AttendanceRecord[];
}

export const AttendanceTable: React.FC<AttendanceTableProps> = ({ records }) => {

    // ✅ Hàm render Badge màu sắc theo trạng thái (Hỗ trợ Dark Mode mượt mà)
    const getStatusBadge = (status: string) => {
        if (status.includes('Đủ công'))
            return <Badge className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30 dark:hover:bg-emerald-500/30 transition-colors">Đủ công</Badge>;
        if (status.includes('Đi muộn') || status.includes('Về sớm') || status.includes('Đi trễ'))
            return <Badge className="bg-amber-500 hover:bg-amber-600 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30 dark:hover:bg-amber-500/30 transition-colors">{status}</Badge>;
        if (status.includes('Nửa công'))
            return <Badge className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/30 dark:hover:bg-blue-500/30 transition-colors">Nửa công</Badge>;
        if (status.includes('Tăng ca (OT)'))
            return <Badge className="bg-teal-500 hover:bg-teal-600 dark:bg-teal-500/20 dark:text-teal-400 dark:border-teal-500/30 dark:hover:bg-teal-500/30 transition-colors">Tăng ca (OT)</Badge>;
        if (status.includes('Nghỉ (P)') || status.includes('Nghỉ lễ/Tết (L)'))
            return <Badge className="bg-violet-500 hover:bg-violet-600 dark:bg-violet-500/20 dark:text-violet-400 dark:border-violet-500/30 dark:hover:bg-violet-500/30 transition-colors">{status}</Badge>;
        if (status.includes('Nghỉ không lương (UL)') || status.includes('Vắng mặt'))
            return <Badge className="bg-rose-500 hover:bg-rose-600 dark:bg-rose-500/20 dark:text-rose-400 dark:border-rose-500/30 dark:hover:bg-rose-500/30 transition-colors">{status}</Badge>;
        if (status.includes('Công tác (CT)'))
            return <Badge className="bg-indigo-500 hover:bg-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400 dark:border-indigo-500/30 dark:hover:bg-indigo-500/30 transition-colors">Công tác (CT)</Badge>;
        if (status.includes('Quên chấm công (QC)'))
            return <Badge className="bg-slate-600 hover:bg-slate-700 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30 dark:hover:bg-slate-500/30 transition-colors">Quên CC (QC)</Badge>;
        if (status.includes('Đang làm việc'))
            return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50 animate-pulse dark:bg-blue-500/10 dark:text-blue-400 dark:border-blue-500/30 transition-colors">Đang làm việc</Badge>;

        // Default
        return <Badge variant="outline" className="text-slate-500 dark:text-slate-400 dark:border-slate-700 transition-colors">{status}</Badge>;
    };

    const formatDisplayDate = (dateString: string) => {
        if (!dateString) return "-";
        try {
            const parsedDate = new Date(dateString);
            if (isValid(parsedDate)) {
                return format(parsedDate, 'dd/MM/yyyy');
            }
            return dateString;
        } catch (e) {
            return dateString;
        }
    };

    if (!records || records.length === 0) {
        return (
            <div className="p-12 text-center text-slate-500 dark:text-slate-400 flex flex-col items-center justify-center bg-white dark:bg-slate-900 rounded-b-lg transition-colors">
                <Clock className="w-12 h-12 mb-3 text-slate-300 dark:text-slate-600" />
                <p>Chưa có dữ liệu chấm công.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto bg-white dark:bg-slate-900 rounded-b-lg shadow-sm border border-slate-200 dark:border-slate-800 transition-colors">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-100 dark:bg-slate-800/50 border-b-2 border-slate-200 dark:border-slate-800 transition-colors">
                        <TableHead className="w-[120px] font-bold text-slate-700 dark:text-slate-200">Ngày</TableHead>
                        <TableHead className="w-[100px] font-bold text-slate-700 dark:text-slate-200">Mã NV</TableHead>
                        <TableHead className="min-w-[180px] font-bold text-slate-700 dark:text-slate-200">Họ tên</TableHead>
                        <TableHead className="w-[120px] text-center font-bold text-slate-700 dark:text-slate-200">Giờ vào</TableHead>
                        <TableHead className="w-[120px] text-center font-bold text-slate-700 dark:text-slate-200">Giờ ra</TableHead>
                        <TableHead className="min-w-[200px] font-bold text-slate-700 dark:text-slate-200">Vị trí (GPS)</TableHead>
                        <TableHead className="w-[120px] text-right font-bold text-slate-700 dark:text-slate-200">Trạng thái</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {records.map((r) => (
                        <TableRow key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-slate-200 dark:border-slate-800 transition-colors">
                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">
                                {formatDisplayDate(r.date)}
                            </TableCell>

                            <TableCell className="font-mono text-xs font-bold text-slate-500 dark:text-slate-400">
                                {r.employeeCode}
                            </TableCell>

                            <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                                {r.name}
                            </TableCell>

                            <TableCell className="text-center">
                                {r.checkIn ? (
                                    <div className="flex items-center justify-center gap-1.5 text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-500/10 py-1 rounded-md border border-emerald-100 dark:border-emerald-500/20 transition-colors">
                                        <LogIn className="w-3.5 h-3.5" /> {r.checkIn}
                                    </div>
                                ) : (
                                    <span className="text-slate-300 dark:text-slate-600">-</span>
                                )}
                            </TableCell>

                            <TableCell className="text-center">
                                {r.checkOut ? (
                                    <div className="flex items-center justify-center gap-1.5 text-orange-700 dark:text-orange-400 font-bold bg-orange-50 dark:bg-orange-500/10 py-1 rounded-md border border-orange-100 dark:border-orange-500/20 transition-colors">
                                        <LogOut className="w-3.5 h-3.5" /> {r.checkOut}
                                    </div>
                                ) : (
                                    <span className="text-slate-300 dark:text-slate-600">-</span>
                                )}
                            </TableCell>

                            <TableCell>
                                {r.location ? (
                                    <div className="flex items-center text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 py-1 px-2 rounded-md w-fit transition-colors">
                                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                                        <span className="truncate max-w-[180px]" title={r.location}>{r.location}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 dark:text-slate-500 italic">Không ghi nhận GPS</span>
                                )}
                            </TableCell>

                            <TableCell className="text-right">
                                {getStatusBadge(r.status)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
};

export default AttendanceTable;