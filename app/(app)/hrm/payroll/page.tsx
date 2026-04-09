"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Download, CalendarDays, Calculator, FileSpreadsheet, Search, Loader2, Filter, DollarSign, Users, Clock, ShieldAlert, PiggyBank, Landmark } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/utils";

// Import Component giao diện (Đảm bảo đường dẫn đúng với dự án của bạn)
import { PayrollTable, PayrollRecord } from "@/components/hrm/PayrollTable";
import { AttendanceBoardTable } from "@/components/hrm/AttendanceBoardTable";

// Import API Backend
import { getPayrollByMonth, getMonthlyAttendanceBoard } from "@/lib/action/payrollActions";

export default function PayrollPage() {
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

    // 2. GỌI API (FETCH DATA)
    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [payrollRes, boardRes] = await Promise.all([
                getPayrollByMonth(parseInt(month), parseInt(year)),
                getMonthlyAttendanceBoard(parseInt(month), parseInt(year))
            ]);

            if (payrollRes.success) setPayrollData(payrollRes.data);
            else toast.error(payrollRes.error);

            if (boardRes.success) {
                setBoardData(boardRes.data);
                setDaysInMonth(boardRes.daysInMonth);
            } else toast.error(boardRes.error);
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
                <TabsList className="mb-4">
                    <TabsTrigger value="payroll" className="font-semibold px-6"><Calculator className="w-4 h-4 mr-2" /> Bảng Lương</TabsTrigger>
                    <TabsTrigger value="attendance" className="font-semibold px-6"><FileSpreadsheet className="w-4 h-4 mr-2" /> Bảng Công</TabsTrigger>
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
            </Tabs>
        </div>
    );
}