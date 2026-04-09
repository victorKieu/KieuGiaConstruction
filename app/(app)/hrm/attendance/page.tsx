"use client";

import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Search, Download, Loader2, Users, Clock, AlertTriangle, CheckCircle2, Plus, Save } from "lucide-react";
import { toast } from "sonner";
import { AttendanceTable, AttendanceRecord } from "@/components/hrm/AttendanceTable";
import { getAllAttendanceRecords } from "@/lib/action/attendanceActions";
import { getEmployeeOptions } from "@/lib/action/employeeActions";
import { createManualAttendance } from "@/lib/action/attendanceActions";

export default function HRMAttendancePage() {
    const currentDate = new Date();
    const [month, setMonth] = useState<string>((currentDate.getMonth() + 1).toString());
    const [year, setYear] = useState<string>(currentDate.getFullYear().toString());
    const [searchQuery, setSearchQuery] = useState("");

    const [records, setRecords] = useState<AttendanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, onTime: 0, late: 0 });

    // STATES CHO CHẤM CÔNG THỦ CÔNG
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [attendanceType, setAttendanceType] = useState<"WORKING" | "LEAVE">("WORKING");
    const manualFormRef = useRef<HTMLFormElement>(null);

    // ✅ STATES CHO COMBOBOX NHÂN VIÊN
    const [employeeList, setEmployeeList] = useState<{ id: string, code: string, name: string }[]>([]);
    const [selectedEmpId, setSelectedEmpId] = useState<string>("");

    useEffect(() => {
        loadData();
    }, [month, year]);

    // Tự động kéo danh sách nhân viên khi Popup được mở lần đầu
    useEffect(() => {
        if (isManualModalOpen && employeeList.length === 0) {
            getEmployeeOptions().then(data => setEmployeeList(data));
        }
        if (!isManualModalOpen) {
            // Reset state khi đóng popup
            setSelectedEmpId("");
            setAttendanceType("WORKING");
        }
    }, [isManualModalOpen]);

    const loadData = async () => {
        setIsLoading(true);
        try {
            const data = await getAllAttendanceRecords(parseInt(month), parseInt(year), searchQuery);
            setRecords(data);

            const total = data.length;
            const onTime = data.filter(r => r.status === 'Đủ công').length;
            const late = data.filter(r => r.status === 'Đi trễ').length;
            setStats({ total, onTime, late });
        } catch (error) {
            toast.error("Lỗi khi tải dữ liệu chấm công.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') loadData();
    };

    const handleManualSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!manualFormRef.current) return;

        if (!selectedEmpId) {
            toast.error("Vui lòng chọn một nhân viên hợp lệ từ danh sách.");
            return;
        }

        setIsSubmitting(true);
        const formData = new FormData(manualFormRef.current);

        try {
            // ✅ GỌI API THẬT
            const result = await createManualAttendance(formData);

            if (result.success) {
                toast.success(result.message);
                setIsManualModalOpen(false); // Đóng popup
                loadData(); // Tự động load lại bảng ở dưới
            } else {
                toast.error(result.error); // Hiển thị lỗi nếu DB từ chối
            }
        } catch (error) {
            toast.error("Lỗi hệ thống khi ghi nhận công.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const inputStyle = "w-full border rounded-md p-2 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm";

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Actions */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Bảng Tổng Hợp Chấm Công</h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 transition-colors">Quản lý và điều chỉnh thời gian làm việc của nhân sự</p>
                </div>

                <div className="flex gap-2 w-full sm:w-auto">
                    <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="flex-1 sm:flex-none border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-900 dark:text-blue-400 dark:hover:bg-blue-900/20">
                                <Plus className="w-4 h-4 mr-2" /> Chấm công thủ công
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[500px] dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">Ghi nhận / Điều chỉnh Công</DialogTitle>
                            </DialogHeader>

                            <form ref={manualFormRef} onSubmit={handleManualSubmit} className="space-y-4 mt-4">

                                {/* ✅ COMBOBOX TÌM KIẾM NHÂN VIÊN */}
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Nhân viên *</label>
                                    <div className="relative">
                                        <input
                                            list="employee-datalist"
                                            placeholder="Gõ mã hoặc tên để tìm..."
                                            className={inputStyle}
                                            required
                                            onChange={(e) => {
                                                // So khớp chuỗi nhập vào với danh sách để lấy ra UUID thật
                                                const match = employeeList.find(emp => `${emp.code} - ${emp.name}` === e.target.value);
                                                setSelectedEmpId(match ? match.id : "");
                                            }}
                                        />
                                        <datalist id="employee-datalist">
                                            {employeeList.map(emp => (
                                                <option key={emp.id} value={`${emp.code} - ${emp.name}`} />
                                            ))}
                                        </datalist>
                                        {/* Hidden input chứa UUID thực sự gửi lên Database */}
                                        <input type="hidden" name="employee_id" value={selectedEmpId} />
                                    </div>
                                    {!selectedEmpId && (
                                        <p className="text-[11px] text-red-500">Vui lòng gõ và chọn nhân viên từ danh sách hiển thị.</p>
                                    )}
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Ngày ghi nhận *</label>
                                    <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className={inputStyle} />
                                </div>

                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Loại ghi nhận</label>
                                    <div className="flex gap-4 mt-2">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="record_type" value="WORKING" checked={attendanceType === "WORKING"} onChange={() => setAttendanceType("WORKING")} className="w-4 h-4 text-blue-600" />
                                            <span className="text-sm">Đi làm thực tế</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                            <input type="radio" name="record_type" value="LEAVE" checked={attendanceType === "LEAVE"} onChange={() => setAttendanceType("LEAVE")} className="w-4 h-4 text-emerald-600" />
                                            <span className="text-sm">Báo nghỉ / Vắng mặt</span>
                                        </label>
                                    </div>
                                </div>

                                {attendanceType === "WORKING" ? (
                                    <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">Giờ vào (Check-in) *</label>
                                            <input type="time" name="check_in_time" required className={inputStyle} />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">Giờ ra (Check-out) *</label>
                                            <input type="time" name="check_out_time" required className={inputStyle} />
                                        </div>
                                        <div className="col-span-2 text-xs text-slate-500">
                                            Dành cho nhân sự không có App hoặc quên quét vân tay/khuôn mặt.
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 space-y-3">
                                        <div className="space-y-1">
                                            <label className="text-sm font-medium">Trạng thái nghỉ *</label>
                                            <select name="leave_status" required className={inputStyle}>
                                                <option value="">-- Chọn lý do nghỉ --</option>
                                                <option value="NGHI_CA">Nghỉ ca (Theo lịch sắp xếp)</option>
                                                <option value="NGHI_PHEP">Nghỉ phép năm (Có lương)</option>
                                                <option value="KHONG_PHEP">Nghỉ không phép (Không lương)</option>
                                                <option value="OM_DAU">Nghỉ ốm đau / Thai sản</option>
                                            </select>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                            * Hệ thống sẽ tự động ghi đè trạng thái của ngày này nếu đã có dữ liệu trước đó.
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1">
                                    <label className="text-sm font-medium">Ghi chú / Lý do điều chỉnh</label>
                                    <textarea name="note" rows={2} className={inputStyle} placeholder="Nhập lý do điều chỉnh để lưu log..." />
                                </div>

                                <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
                                    <Button type="button" variant="outline" onClick={() => setIsManualModalOpen(false)}>Hủy</Button>
                                    <Button type="submit" disabled={isSubmitting || !selectedEmpId} className="bg-blue-600 hover:bg-blue-700 text-white">
                                        {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                                        Xác nhận lưu
                                    </Button>
                                </div>
                            </form>
                        </DialogContent>
                    </Dialog>

                    <Button className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors">
                        <Download className="w-4 h-4 mr-2" /> Xuất Excel
                    </Button>
                </div>
            </div>

            {/* Thống kê nhanh (Cards) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="shadow-sm border-blue-100 dark:border-blue-900/50 bg-blue-50/50 dark:bg-blue-900/10 transition-colors">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-1">Tổng lượt chấm công</p>
                            <h3 className="text-3xl font-bold text-blue-900 dark:text-blue-100">{stats.total}</h3>
                        </div>
                        <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-full transition-colors"><Users className="w-6 h-6 text-blue-600 dark:text-blue-400" /></div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-emerald-100 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-900/10 transition-colors">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-1">Đúng giờ / Đủ công</p>
                            <h3 className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{stats.onTime}</h3>
                        </div>
                        <div className="p-3 bg-emerald-100 dark:bg-emerald-900/30 rounded-full transition-colors"><CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-400" /></div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm border-orange-100 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-900/10 transition-colors">
                    <CardContent className="p-6 flex items-center justify-between">
                        <div>
                            <p className="text-sm font-medium text-orange-600 dark:text-orange-400 mb-1">Đi trễ / Về sớm</p>
                            <h3 className="text-3xl font-bold text-orange-900 dark:text-orange-100">{stats.late}</h3>
                        </div>
                        <div className="p-3 bg-orange-100 dark:bg-orange-900/30 rounded-full transition-colors"><AlertTriangle className="w-6 h-6 text-orange-600 dark:text-orange-400" /></div>
                    </CardContent>
                </Card>
            </div>

            {/* Bảng dữ liệu & Bộ lọc */}
            <Card className="shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-colors">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 py-4 transition-colors">
                    <div className="flex flex-col md:flex-row justify-between gap-4">
                        {/* Cụm Tìm kiếm */}
                        <div className="relative w-full md:w-[300px]">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400 dark:text-slate-500" />
                            <Input
                                placeholder="Tìm mã NV hoặc tên... (Enter để lọc)"
                                className="pl-9 bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 focus-visible:ring-blue-500 transition-colors"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={handleSearch}
                            />
                        </div>

                        {/* Cụm Lọc Thời gian */}
                        <div className="flex gap-2">
                            <Select value={month} onValueChange={setMonth}>
                                <SelectTrigger className="w-[130px] bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors">
                                    <Clock className="w-4 h-4 mr-2 text-slate-400 dark:text-slate-500" />
                                    <SelectValue placeholder="Tháng" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(m => (
                                        <SelectItem key={m} value={m.toString()}>Tháng {m}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={year} onValueChange={setYear}>
                                <SelectTrigger className="w-[110px] bg-white dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors">
                                    <SelectValue placeholder="Năm" />
                                </SelectTrigger>
                                <SelectContent>
                                    {[2024, 2025, 2026, 2027].map(y => (
                                        <SelectItem key={y} value={y.toString()}>Năm {y}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Button variant="outline" onClick={loadData} className="px-3 dark:border-slate-800 dark:bg-slate-950 dark:hover:bg-slate-900 dark:text-slate-200 transition-colors">
                                Lọc
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-12 flex justify-center flex-col items-center">
                            <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-blue-500 mb-4" />
                            <p className="text-slate-500 dark:text-slate-400">Đang tải dữ liệu chấm công...</p>
                        </div>
                    ) : records.length === 0 ? (
                        <div className="p-12 text-center text-slate-500 dark:text-slate-400 bg-white dark:bg-slate-900 transition-colors">
                            <Users className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
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