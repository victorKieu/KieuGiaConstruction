"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, CalendarDays, Calculator, FileSpreadsheet, Search, Loader2, Filter, DollarSign, Users, Clock, ShieldAlert, PiggyBank, Landmark, MapPin, Route, Edit, RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/utils";
import { exportToExcel } from "@/lib/utils/exportExcel";

// Import Component giao diện (Đảm bảo đường dẫn đúng với dự án của bạn)
import { PayrollTable, PayrollRecord } from "@/components/hrm/PayrollTable";
import { AttendanceBoardTable } from "@/components/hrm/AttendanceBoardTable";

// Import API Backend
import { getPayrollByMonth, getMonthlyAttendanceBoard, getAllowanceRecords, syncTravelDistances } from "@/lib/action/payrollActions";

export default function PayrollPage() {
    const [isSyncing, setIsSyncing] = useState(false);
    
    const handleSyncDistances = async () => {
        setIsSyncing(true);
        const res = await syncTravelDistances(month, year); // Gọi hàm vừa tạo ở bước 1
        if (res.success) {
            toast.success(res.message);
            fetchData(); // Tải lại toàn bộ bảng sau khi tính xong
        } else {
            toast.error(res.error);
        }
        setIsSyncing(false);
    };

    // 1. QUẢN LÝ TRẠNG THÁI (STATE)
    const currentMonth = (new Date().getMonth() + 1).toString();
    const currentYear = new Date().getFullYear().toString();

    const [month, setMonth] = useState(currentMonth);
    const [year, setYear] = useState(currentYear);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedDepartment, setSelectedDepartment] = useState("Tất cả"); // ✅ State lọc phòng ban
    const [isLoading, setIsLoading] = useState(false);

    // State lưu trữ dữ liệu gốc từ API
    const [payrollData, setPayrollData] = useState<PayrollRecord[]>([]);
    const [boardData, setBoardData] = useState<any[]>([]);
    const [daysInMonth, setDaysInMonth] = useState(30);
    // State mới cho Công tác phí
    const [allowanceRecords, setAllowanceRecords] = useState<any[]>([]);
    // Export Excel
    const handleExportAllowance = () => {
        if (allowanceRecords.length === 0) return toast.error("Không có dữ liệu để xuất!");

        // Định dạng lại dữ liệu để lên Excel đẹp và dễ đọc
        const dataToExport = allowanceRecords.map(rec => ({
            "Mã Nhân Viên": rec.employeeCode,
            "Họ và Tên": rec.name,
            "Hình thức": rec.allowanceType === 'flat_rate' ? 'Khoán cố định' : 'Tính theo Km',
            "Tổng Km thực tế": rec.allowanceType === 'per_km' ? rec.totalKm : '-',
            "Định mức (VNĐ)": rec.rate,
            "Thành tiền (VNĐ)": rec.totalAmount,
        }));

        exportToExcel(
            dataToExport,
            `Bang_Ke_Cong_Tac_Phi_T${month}_${year}`,
            "CongTacPhi"
        );
        toast.success("Đã xuất file Excel Công tác phí!");
    };
    const handleExportPayroll = () => {
        if (payrollData.length === 0) return toast.error("Bảng lương đang trống!");

        const dataToExport = payrollData.map(p => ({
            "Mã NV": p.employeeCode,
            "Họ Tên": p.name,
            "Lương Cơ Bản": p.baseSalary,
            "Phụ cấp": p.allowances,
            "Tăng ca (VNĐ)": p.otAmount,
            "Thưởng": p.bonus,
            "Bảo hiểm": p.insuranceDeduction,
            "Thuế TNCN": p.taxDeduction,
            "Thực nhận": p.netSalary,
        }));

        exportToExcel(
            dataToExport,
            `Bang_Luong_Thang_${month}_${year}`,
            "BangLuong"
        );
    };
    // 2. GỌI API (FETCH DATA)
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [payrollRes, boardRes, allowanceData] = await Promise.all([
                getPayrollByMonth(parseInt(month), parseInt(year)),
                getMonthlyAttendanceBoard(parseInt(month), parseInt(year)),
                getAllowanceRecords(month, year)
            ]);

            if (payrollRes.success) setPayrollData(payrollRes.data);
            else toast.error(payrollRes.error);

            if (boardRes.success) {
                setBoardData(boardRes.data);
                setDaysInMonth(boardRes.daysInMonth);
            } else toast.error(boardRes.error);
            if (allowanceData) {
                setAllowanceRecords(allowanceData);
            }
        } catch (error) {
            toast.error("Có lỗi xảy ra khi tải dữ liệu.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [month, year]);

    // 3. XỬ LÝ LỌC & TÍNH TOÁN DASHBOARD (Dùng useMemo để tối ưu hiệu năng)
    const { filteredPayroll, filteredBoard, departments, payrollMetrics, attendanceMetrics } = useMemo(() => {
        // Lấy danh sách phòng ban duy nhất từ dữ liệu
        const depts = Array.from(new Set(payrollData.map(emp => emp.department).filter(Boolean)));

        // --- LỌC BẢNG LƯƠNG ---
        // Yêu cầu: Bỏ qua người có ngày công thực tế = 0
        let fPayroll = payrollData.filter(emp => emp.actualDays > 0);

        if (selectedDepartment !== "Tất cả") {
            fPayroll = fPayroll.filter(emp => emp.department === selectedDepartment);
        }
        if (searchTerm) {
            fPayroll = fPayroll.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        // Tính toán Dashboard Lương
        const pMetrics = fPayroll.reduce((acc, curr) => ({
            totalNet: acc.totalNet + curr.netSalary,
            totalGross: acc.totalGross + curr.grossSalary,
            totalTax: acc.totalTax + curr.taxDeduction,
            totalInsurance: acc.totalInsurance + curr.insuranceDeduction
        }), { totalNet: 0, totalGross: 0, totalTax: 0, totalInsurance: 0 });

        // --- LỌC BẢNG CÔNG ---
        // Bỏ qua người không có ngày hưởng lương hoặc không có ngày nghỉ nào được ghi nhận
        let fBoard = boardData.filter(emp => (emp.totalPaidDays > 0 || emp.totalUnpaidDays > 0));

        if (selectedDepartment !== "Tất cả") {
            fBoard = fBoard.filter(emp => emp.department === selectedDepartment);
        }
        if (searchTerm) {
            fBoard = fBoard.filter(emp => emp.name.toLowerCase().includes(searchTerm.toLowerCase()) || emp.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()));
        }

        // Tính toán Dashboard Công
        const aMetrics = fPayroll.reduce((acc, curr) => ({
            totalOT: acc.totalOT + curr.otHours,
            totalDays: acc.totalDays + curr.actualDays
        }), { totalOT: 0, totalDays: 0 });

        return {
            filteredPayroll: fPayroll,
            filteredBoard: fBoard,
            departments: depts,
            payrollMetrics: pMetrics,
            attendanceMetrics: {
                totalEmployees: fBoard.length,
                totalOT: aMetrics.totalOT,
                avgDays: fBoard.length ? (aMetrics.totalDays / fBoard.length).toFixed(1) : 0
            }
        };
    }, [payrollData, boardData, searchTerm, selectedDepartment]);

    // 4. GIAO DIỆN (RENDER)
    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-[1400px] mx-auto p-4 md:p-6 transition-colors">
            {/* Header Trang & Bộ lọc Global */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Kỳ Lương & Chấm Công</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Tháng {month} / {year}</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Filter Tháng/Năm */}
                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <CalendarDays className="w-4 h-4 text-slate-400 ml-2" />
                        <Select value={month} onValueChange={setMonth}>
                            <SelectTrigger className="w-[100px] border-none shadow-none focus:ring-0 bg-transparent h-8">
                                <SelectValue placeholder="Tháng" />
                            </SelectTrigger>
                            <SelectContent>
                                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (<SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>))}
                            </SelectContent>
                        </Select>
                        <div className="w-px h-4 bg-slate-300 dark:bg-slate-600 mx-1"></div>
                        <Select value={year} onValueChange={setYear}>
                            <SelectTrigger className="w-[90px] border-none shadow-none focus:ring-0 bg-transparent h-8">
                                <SelectValue placeholder="Năm" />
                            </SelectTrigger>
                            <SelectContent>
                                {["2024", "2025", "2026", "2027"].map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* ✅ Bộ lọc Phòng Ban */}
                    <div className="flex items-center bg-slate-50 dark:bg-slate-950 p-1.5 rounded-lg border border-slate-200 dark:border-slate-700">
                        <Filter className="w-4 h-4 text-slate-400 ml-2" />
                        <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                            <SelectTrigger className="w-[160px] border-none shadow-none focus:ring-0 bg-transparent h-8">
                                <SelectValue placeholder="Tất cả phòng ban" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="Tất cả">Tất cả phòng ban</SelectItem>
                                {departments.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Thanh tìm kiếm nhanh */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <Input
                            placeholder="Tìm nhân sự..."
                            className="pl-9 h-11 dark:bg-slate-950 border-slate-200 dark:border-slate-700"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>
            </div>

            {/* Vùng Tabs chính */}
            <Tabs defaultValue="payroll" className="w-full">
                <TabsList className="grid w-full grid-cols-3 lg:w-[600px] bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                    <TabsTrigger value="payroll" className="rounded-lg ..."><Calculator className="w-4 h-4 mr-2" /> Bảng Lương</TabsTrigger>
                    <TabsTrigger value="attendance" className="rounded-lg ..."><CalendarDays className="w-4 h-4 mr-2" /> Bảng Công</TabsTrigger>
                    <TabsTrigger value="allowance" className="rounded-lg data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-emerald-600 dark:data-[state=active]:text-emerald-400 data-[state=active]:shadow-sm">
                        <MapPin className="w-4 h-4 mr-2" /> Công tác phí
                    </TabsTrigger>
                </TabsList>

                {/* ========================================================================================= */}
                {/* TAB 1: BẢNG LƯƠNG & DASHBOARD LƯƠNG */}
                {/* ========================================================================================= */}
                <TabsContent value="payroll" className="space-y-4">
                    {/* ✅ DASHBOARD PHÂN TÍCH LƯƠNG */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card className="bg-blue-50/50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/30">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400"><DollarSign className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng Thực Lãnh (Net)</p>
                                    <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(payrollMetrics.totalNet)}</h3>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-emerald-50/50 dark:bg-emerald-900/10 border-emerald-100 dark:border-emerald-900/30">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-600 dark:text-emerald-400"><PiggyBank className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng Thu Nhập (Gross)</p>
                                    <h3 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">{formatCurrency(payrollMetrics.totalGross)}</h3>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-rose-50/50 dark:bg-rose-900/10 border-rose-100 dark:border-rose-900/30">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-rose-100 dark:bg-rose-900/50 rounded-lg text-rose-600 dark:text-rose-400"><ShieldAlert className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng Trừ Bảo Hiểm</p>
                                    <h3 className="text-xl font-bold text-rose-700 dark:text-rose-400">{formatCurrency(payrollMetrics.totalInsurance)}</h3>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-lg text-amber-600 dark:text-amber-400"><Landmark className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng Thuế TNCN</p>
                                    <h3 className="text-xl font-bold text-amber-700 dark:text-amber-400">{formatCurrency(payrollMetrics.totalTax)}</h3>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                        {/* ✅ THÊM HEADER VÀ NÚT XUẤT EXCEL CHO BẢNG LƯƠNG */}
                        <CardHeader className="flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 py-3">
                            <CardTitle className="text-base font-bold text-slate-700 dark:text-slate-200 flex items-center">
                                <FileSpreadsheet className="w-4 h-4 mr-2 text-blue-600" /> Chi tiết Bảng Lương
                            </CardTitle>
                            <Button
                                variant="outline"
                                onClick={handleExportPayroll}
                                className="h-8 text-xs border-blue-200 text-blue-700 hover:bg-blue-100"
                            >
                                <Download className="w-3 h-3 mr-1.5" /> Xuất Excel
                            </Button>
                        </CardHeader>

                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-20 flex flex-col justify-center items-center text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4" /> Đang tính toán bảng lương...
                                </div>
                            ) : (
                                <PayrollTable records={filteredPayroll} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ========================================================================================= */}
                {/* TAB 2: BẢNG CÔNG & DASHBOARD CHẤM CÔNG */}
                {/* ========================================================================================= */}
                <TabsContent value="attendance" className="space-y-4">
                    {/* ✅ DASHBOARD PHÂN TÍCH CHẤM CÔNG */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <Card className="bg-indigo-50/50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-900/30">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg text-indigo-600 dark:text-indigo-400"><Users className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Nhân sự phát sinh công</p>
                                    <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400">{attendanceMetrics.totalEmployees} <span className="text-sm font-normal text-slate-500">người</span></h3>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-teal-50/50 dark:bg-teal-900/10 border-teal-100 dark:border-teal-900/30">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-teal-100 dark:bg-teal-900/50 rounded-lg text-teal-600 dark:text-teal-400"><CalendarDays className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">TB Ngày công / Người</p>
                                    <h3 className="text-xl font-bold text-teal-700 dark:text-teal-400">{attendanceMetrics.avgDays} <span className="text-sm font-normal text-slate-500">ngày</span></h3>
                                </div>
                            </CardContent>
                        </Card>
                        <Card className="bg-orange-50/50 dark:bg-orange-900/10 border-orange-100 dark:border-orange-900/30">
                            <CardContent className="p-4 flex items-center gap-4">
                                <div className="p-3 bg-orange-100 dark:bg-orange-900/50 rounded-lg text-orange-600 dark:text-orange-400"><Clock className="w-6 h-6" /></div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Tổng giờ Tăng ca (OT)</p>
                                    <h3 className="text-xl font-bold text-orange-700 dark:text-orange-400">{attendanceMetrics.totalOT} <span className="text-sm font-normal text-slate-500">giờ</span></h3>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-20 flex flex-col justify-center items-center text-slate-500">
                                    <Loader2 className="w-8 h-8 animate-spin mb-4" /> Đang tổng hợp bảng công...
                                </div>
                            ) : (
                                <AttendanceBoardTable records={filteredBoard} daysInMonth={daysInMonth} />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
                {/* ========================================= */}
                {/* TAB 3: BẢNG KÊ CÔNG TÁC PHÍ (XĂNG XE)       */}
                {/* ========================================= */}
                <TabsContent value="allowance" className="space-y-4 mt-4">
                    <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900">
                        <CardHeader className="bg-emerald-50 dark:bg-emerald-900/10 border-b dark:border-slate-800 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-emerald-700 dark:text-emerald-500 flex items-center">
                                    <Route className="w-5 h-5 mr-2" /> Bảng kê Công tác phí (Xăng xe)
                                </CardTitle>
                                <p className="text-sm text-slate-500 mt-1">Dữ liệu tự động tính từ lịch sử quét mặt GPS tại các công trình.</p>
                            </div>
                            <div className="flex gap-2">
                                {/* NÚT ĐỒNG BỘ MỚI */}
                                <Button
                                    variant="outline"
                                    onClick={handleSyncDistances}
                                    disabled={isSyncing}
                                    className="h-8 text-xs bg-white text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 border-emerald-200"
                                >
                                    {isSyncing ? <Loader2 className="w-3 h-3 mr-1.5 animate-spin" /> : <RefreshCcw className="w-3 h-3 mr-1.5" />}
                                    Tính lại số Km
                                </Button>
                                <Button
                                    variant="outline"
                                    onClick={handleExportAllowance} // ✅ Gắn hàm vào đây
                                    className="h-8 text-xs border-emerald-200 text-emerald-700 hover:bg-emerald-100"
                                >
                                    <Download className="w-3 h-3 mr-1.5" /> Xuất Excel
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="p-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-500" /></div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs text-slate-600 uppercase bg-slate-100 dark:bg-slate-800">
                                            <tr>
                                                <th className="px-4 py-3">Mã NV</th>
                                                <th className="px-4 py-3">Họ và Tên</th>
                                                <th className="px-4 py-3 text-center">Hình thức</th>
                                                <th className="px-4 py-3 text-right">Tổng Km (Thực tế)</th>
                                                <th className="px-4 py-3 text-right">Định mức</th>
                                                <th className="px-4 py-3 text-right">Thành Tiền</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                                            {allowanceRecords.map(rec => (
                                                <tr key={rec.id} className="bg-white dark:bg-slate-900 hover:bg-slate-50">
                                                    <td className="px-4 py-3 font-mono text-slate-500">{rec.employeeCode}</td>
                                                    <td className="px-4 py-3 font-bold">{rec.name}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {rec.allowanceType === 'flat_rate' ?
                                                            <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">KHOÁN</span> :
                                                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-[10px] font-bold">THEO KM</span>
                                                        }
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-medium">
                                                        {rec.allowanceType === 'per_km' ? `${rec.totalKm} km` : '-'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right text-slate-500">
                                                        {formatCurrency(rec.rate)}{rec.allowanceType === 'per_km' ? '/km' : '/tháng'}
                                                    </td>
                                                    <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                                        {formatCurrency(rec.totalAmount)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}