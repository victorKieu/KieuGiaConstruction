"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, Download, Loader2, Users, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";
import { AttendanceTable, AttendanceRecord } from "@/components/hrm/AttendanceTable";
import { getAllAttendanceRecords } from "@/lib/action/attendanceActions";

export default function HRMAttendancePage() {
    // Khởi tạo tháng/năm hiện tại
    const currentDate = new Date();
    const [month, setMonth] = useState<string>((currentDate.getMonth() + 1).toString());
    const [year, setYear] = useState<string>(currentDate.getFullYear().toString());
    const [searchQuery, setSearchQuery] = useState("");

    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Thống kê nhanh
    const [stats, setStats] = useState({ total: 0, onTime: 0, late: 0 });

    useEffect(() => {
        loadData();
    }, [month, year]); // Tự động load lại khi sếp đổi tháng/năm

    const loadData = async () => {
        setIsLoading(true);
        const data = await getAllAttendanceRecords(parseInt(month), parseInt(year), searchQuery);
        setRecords(data);

        // Tính toán thống kê
        const total = data.length;
        const onTime = data.filter(r => r.status === 'Đủ công').length;
        const late = data.filter(r => r.status === 'Đi trễ').length;
        setStats({ total, onTime, late });

        setIsLoading(false);
    };

    // Xử lý khi gõ tìm kiếm và bấm Enter
    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            loadData();
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Bảng Tổng Hợp Chấm Công</h1>
                    <p className="text-sm text-slate-500">Quản lý thời gian làm việc của toàn bộ nhân sự trong công ty</p>
                </div>
                <Button className="bg-emerald-600 hover:bg-emerald-700">
                    <Download className="w-4 h-4 mr-2" /> Xuất Excel (Tính lương)
                </Button>
            </div>

            {/* Thống kê nhanh (Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm border-blue-100 bg-blue-50/50">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600 mb-1">Tổng lượt chấm công</p>
                            <h3 className="text-3xl font-bold text-blue-900">{stats.total}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 rounded-full"><Users className="w-6 h-6 text-blue-600" /></div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-emerald-100 bg-emerald-50/50">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-emerald-600 mb-1">Đúng giờ / Đủ công</p>
                            <h3 className="text-3xl font-bold text-emerald-900">{stats.onTime}</h3>
                        </div>
                        <div className="p-3 bg-emerald-100 rounded-full"><CheckCircle2 className="w-6 h-6 text-emerald-600" /></div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-orange-100 bg-orange-50/50">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-orange-600 mb-1">Đi trễ / Về sớm</p>
                            <h3 className="text-3xl font-bold text-orange-900">{stats.late}</h3>
                        </div>
                        <div className="p-3 bg-orange-100 rounded-full"><AlertTriangle className="w-6 h-6 text-orange-600" /></div>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng dữ liệu & Bộ lọc */}
            <Card className="shadow-sm border-slate-200">
                <CardHeader className="bg-slate-50 border-b py-4">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        {/* Cụm Tìm kiếm */}
                        <div className="relative w-full md:w-[300px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Tìm mã NV hoặc tên... (Enter để lọc)"
                                className="pl-9 bg-white"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearch}
                            />
                        </div>

                        {/* Cụm Lọc Thời gian */}
                        <div className="flex gap-2">
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger className="w-[130px] bg-white">
                                    <Clock className="w-4 h-4 mr-2 text-slate-400" />
                                    <SelectValue placeholder="Tháng" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                        <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[110px] bg-white">
                                    <SelectValue placeholder="Năm" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <SelectItem key={y} value={y.toString()}>Năm {y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button variant="outline" onClick={loadData} className="px-3">
                                Lọc
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 flex justify-center flex-col items-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
                            <p className="text-slate-500">Đang tải dữ liệu chấm công...</p>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 bg-white">
                            <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                            <p>Không có dữ liệu chấm công nào trong tháng {month}/{year}.</p>
                        </div>
                    ) : (
                        <AttendanceTable records={records} />
                    )}
                </CardContent>
            </Card>
        </div>
    );
}