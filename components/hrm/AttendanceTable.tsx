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

// ✅ Cập nhật Interface: Thêm trường location (Tọa độ GPS)
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

    // Hàm render Badge màu sắc theo trạng thái
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Đủ công':
                return <Badge className="bg-emerald-500 hover:bg-emerald-600">Đủ công</Badge>;
            case 'Đi trễ':
            case 'Về sớm':
                return <Badge className="bg-amber-500 hover:bg-amber-600">{status}</Badge>;
            case 'Nửa công':
                return <Badge className="bg-blue-500 hover:bg-blue-600">Nửa công</Badge>;
            case 'Vắng mặt':
            case 'Nghỉ phép':
                return <Badge className="bg-rose-500 hover:bg-rose-600">{status}</Badge>;
            default:
                return <Badge variant="outline" className="text-slate-500">{status}</Badge>;
        }
    };

    // Trạng thái khi chưa có dữ liệu
    if (!records || records.length === 0) {
        return (
            <div className="p-12 text-center text-slate-500 flex flex-col items-center justify-center bg-white rounded-b-lg">
                <Clock className="w-12 h-12 mb-3 text-slate-300" />
                <p>Chưa có dữ liệu chấm công.</p>
            </div>
        );
    }

    return (
        <div className="w-full overflow-x-auto bg-white rounded-b-lg">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-100 border-b-2 border-slate-200">
                        <TableHead className="w-[120px] font-bold text-slate-700">Ngày</TableHead>
                        <TableHead className="w-[100px] font-bold text-slate-700">Mã NV</TableHead>
                        <TableHead className="min-w-[180px] font-bold text-slate-700">Họ tên</TableHead>
                        <TableHead className="w-[120px] text-center font-bold text-slate-700">Giờ vào</TableHead>
                        <TableHead className="w-[120px] text-center font-bold text-slate-700">Giờ ra</TableHead>
                        <TableHead className="min-w-[200px] font-bold text-slate-700">Vị trí (GPS)</TableHead>
                        <TableHead className="w-[120px] text-right font-bold text-slate-700">Trạng thái</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {records.map((r) => (
                        <TableRow key={r.id} className="hover:bg-slate-50 transition-colors">
                            {/* Ngày */}
                            <TableCell className="font-medium text-slate-700">
                                {r.date}
                            </TableCell>

                            {/* Mã NV */}
                            <TableCell className="font-mono text-xs font-bold text-slate-500">
                                {r.employeeCode}
                            </TableCell>

                            {/* Tên NV */}
                            <TableCell className="font-bold text-slate-800">
                                {r.name}
                            </TableCell>

                            {/* Giờ vào */}
                            <TableCell className="text-center">
                                {r.checkIn ? (
                                    <div className="flex items-center justify-center gap-1.5 text-emerald-700 font-bold bg-emerald-50 py-1 rounded-md border border-emerald-100">
                                        <LogIn className="w-3.5 h-3.5" /> {r.checkIn}
                                    </div>
                                ) : (
                                    <span className="text-slate-300">-</span>
                                )}
                            </TableCell>

                            {/* Giờ ra */}
                            <TableCell className="text-center">
                                {r.checkOut ? (
                                    <div className="flex items-center justify-center gap-1.5 text-orange-700 font-bold bg-orange-50 py-1 rounded-md border border-orange-100">
                                        <LogOut className="w-3.5 h-3.5" /> {r.checkOut}
                                    </div>
                                ) : (
                                    <span className="text-slate-300">-</span>
                                )}
                            </TableCell>

                            {/* Vị trí GPS */}
                            <TableCell>
                                {r.location ? (
                                    <div className="flex items-center text-xs text-slate-600 bg-slate-100 py-1 px-2 rounded-md w-fit">
                                        <MapPin className="w-3.5 h-3.5 mr-1.5 text-blue-600 flex-shrink-0" />
                                        <span className="truncate max-w-[180px]" title={r.location}>{r.location}</span>
                                    </div>
                                ) : (
                                    <span className="text-xs text-slate-400 italic">Không ghi nhận GPS</span>
                                )}
                            </TableCell>

                            {/* Trạng thái */}
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