"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { getEmployees, grantSystemAccess, revokeSystemAccess } from "@/lib/action/employeeActions";
import { Employee } from "@/types/employee";

// UI Components
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Key, ShieldCheck, Ban, Filter } from "lucide-react";
import CreateEmployeeForm from "@/components/hrm/EmployeeForm";

interface EmployeesClientPageProps {
    initialEmployees: Employee[];
    initialTotalCount: number;
    statusOptions: string[];
    departments: string[];
}

export default function EmployeesClientPage({
    initialEmployees,
    initialTotalCount,
    statusOptions,
    departments,
}: EmployeesClientPageProps) {
    const router = useRouter();
    const { toast } = useToast();

    // --- STATES ---
    const [employees, setEmployees] = React.useState<Employee[]>(initialEmployees);
    const [totalEmployees, setTotalEmployees] = React.useState(initialTotalCount);
    const [search, setSearch] = React.useState("");
    const [debouncedSearch, setDebouncedSearch] = React.useState("");
    const [selectedStatus, setSelectedStatus] = React.useState("Tất cả");
    const [selectedDepartment, setSelectedDepartment] = React.useState("Tất cả");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [isLoading, setIsLoading] = React.useState(false);
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const [processingId, setProcessingId] = React.useState<string | null>(null);

    const isFirstRender = React.useRef(true);

    // --- DEBOUNCE SEARCH ---
    React.useEffect(() => {
        const timer = setTimeout(() => setDebouncedSearch(search), 500);
        return () => clearTimeout(timer);
    }, [search]);

    // --- FETCH DATA ---
    const fetchEmployeesData = React.useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await getEmployees({
                search: debouncedSearch,
                status: selectedStatus === "Tất cả" ? undefined : selectedStatus,
                department: selectedDepartment === "Tất cả" ? undefined : selectedDepartment,
                page: currentPage,
                limit: 10,
            });
            setEmployees(data.employees || []);
            setTotalEmployees(data.totalCount || 0);
        } catch (error) {
            toast({ title: "Lỗi", description: "Không tải được danh sách nhân viên.", variant: "destructive" });
        } finally {
            setIsLoading(false);
        }
    }, [debouncedSearch, selectedStatus, selectedDepartment, currentPage, toast]);

    React.useEffect(() => {
        if (isFirstRender.current) {
            isFirstRender.current = false;
            return;
        }
        fetchEmployeesData();
    }, [fetchEmployeesData]);

    // --- ACTIONS ---
    const handleGrantAccess = async (emp: Employee) => {
        if (!emp.email) {
            toast({ title: "Thiếu Email", description: "Vui lòng cập nhật email cho nhân viên trước.", variant: "destructive" });
            return;
        }
        setProcessingId(emp.id);
        const res = await grantSystemAccess(emp.id, emp.email, 'EMPLOYEE');
        if (res.success) {
            toast({ title: "Thành công", description: res.message });
            await fetchEmployeesData();
        } else {
            toast({ title: "Lỗi", description: res.error, variant: "destructive" });
        }
        setProcessingId(null);
    };

    const handleRevokeAccess = async (emp: Employee) => {
        if (!confirm(`Bạn có chắc muốn khóa tài khoản của ${emp.name}?`)) return;
        setProcessingId(emp.id);
        const res = await revokeSystemAccess(emp.id);
        if (res.success) {
            toast({ title: "Đã khóa", description: res.message });
            await fetchEmployeesData();
        } else {
            toast({ title: "Lỗi", description: res.error, variant: "destructive" });
        }
        setProcessingId(null);
    };

    // --- HELPER: STATUS COLOR (Làm đẹp badge) ---
    const getStatusColor = (statusName?: string) => {
        const s = statusName?.toLowerCase() || "";
        if (s.includes("đang làm") || s.includes("chính thức")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
        if (s.includes("thử việc") || s.includes("tập sự")) return "bg-amber-100 text-amber-700 border-amber-200";
        if (s.includes("nghỉ") || s.includes("thôi việc")) return "bg-red-100 text-red-700 border-red-200";
        return "bg-slate-100 text-slate-700 border-slate-200";
    };

    return (
        <div className="space-y-6">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quản lý Nhân sự</h1>
                    <p className="text-sm text-slate-500">Tổng số: <span className="font-semibold text-slate-900">{totalEmployees}</span> hồ sơ nhân viên</p>
                </div>

                <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm transition-all">
                            <Plus className="w-4 h-4 mr-2" /> Thêm nhân viên
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Tạo hồ sơ nhân viên mới</DialogTitle>
                            <DialogDescription>Nhập thông tin chi tiết để tạo hồ sơ và cấp tài khoản (nếu cần).</DialogDescription>
                        </DialogHeader>
                        <CreateEmployeeForm onSuccess={() => { setIsFormOpen(false); fetchEmployeesData(); }} />
                    </DialogContent>
                </Dialog>
            </div>

            {/* Main Content Card */}
            <Card className="shadow-sm border-slate-200 overflow-hidden">
                <CardHeader className="bg-slate-50/50 border-b border-slate-100 p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Input */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Tìm kiếm theo tên, mã nhân viên, email..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 bg-white border-slate-200 focus-visible:ring-blue-500"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex gap-2">
                            <div className="relative">
                                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                                <select
                                    className="h-10 pl-8 pr-4 rounded-md border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    value={selectedStatus}
                                    onChange={(e) => { setSelectedStatus(e.target.value); setCurrentPage(1); }}
                                >
                                    <option value="Tất cả">Tất cả trạng thái</option>
                                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>

                            <select
                                className="h-10 px-4 rounded-md border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[200px]"
                                value={selectedDepartment}
                                onChange={(e) => { setSelectedDepartment(e.target.value); setCurrentPage(1); }}
                            >
                                <option value="Tất cả">Tất cả phòng ban</option>
                                {departments.map(d => <option key={d} value={d}>{d}</option>)}
                            </select>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[80px]">Avatar</TableHead>
                                <TableHead>Mã NV</TableHead>
                                <TableHead>Họ và Tên</TableHead>
                                <TableHead className="hidden md:table-cell">Phòng ban / Chức vụ</TableHead>
                                <TableHead>Trạng thái</TableHead>
                                <TableHead>Tài khoản hệ thống</TableHead>
                                <TableHead className="text-right">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow><TableCell colSpan={7} className="h-32 text-center text-slate-500">Đang tải dữ liệu...</TableCell></TableRow>
                            ) : employees.length === 0 ? (
                                <TableRow><TableCell colSpan={7} className="h-32 text-center text-slate-500">Không tìm thấy kết quả nào.</TableCell></TableRow>
                            ) : (
                                employees.map((emp) => (
                                    <TableRow key={emp.id} className="hover:bg-slate-50/80 transition-colors">
                                        <TableCell>
                                            <Avatar className="h-10 w-10 border border-slate-200">
                                                <AvatarImage src={emp.avatar_url || undefined} className="object-cover" />
                                                <AvatarFallback className="bg-blue-50 text-blue-600 font-semibold text-xs">
                                                    {(emp.name?.charAt(0) || "?").toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell>
                                            <span className="font-mono text-xs font-medium bg-slate-100 px-2 py-1 rounded text-slate-600">
                                                {emp.code || '---'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{emp.name}</span>
                                                <span className="text-xs text-slate-500">{emp.email || "Chưa cập nhật email"}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            <div className="flex flex-col text-sm">
                                                <span className="text-slate-800 font-medium">{emp.department || '---'}</span>
                                                <span className="text-slate-500 text-xs">{emp.position}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {/* ✅ BADGE TRẠNG THÁI MỚI (ĐẸP HƠN) */}
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(emp.status)}`}>
                                                {emp.status || 'Chưa XĐ'}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {emp.has_account ? (
                                                <div className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
                                                        <ShieldCheck className="w-3.5 h-3.5" /> Active
                                                    </div>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-6 w-6 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                        title="Khóa tài khoản"
                                                        onClick={() => handleRevokeAccess(emp)}
                                                        disabled={processingId === emp.id}
                                                    >
                                                        <Ban className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            ) : (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-xs border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 shadow-sm"
                                                    onClick={() => handleGrantAccess(emp)}
                                                    disabled={processingId === emp.id}
                                                >
                                                    {processingId === emp.id ? (
                                                        <span className="animate-spin mr-1">⟳</span>
                                                    ) : (
                                                        <Key className="w-3.5 h-3.5 mr-1.5" />
                                                    )}
                                                    Cấp quyền
                                                </Button>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => router.push(`/hrm/employees/${emp.id}`)}
                                                className="text-slate-500 hover:text-blue-600"
                                            >
                                                Chi tiết
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>

                {/* Pagination */}
                <div className="p-4 border-t border-slate-100 flex justify-center bg-slate-50/30">
                    <div className="flex gap-2">
                        <Button
                            variant="outline" size="sm"
                            disabled={currentPage === 1}
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="bg-white"
                        >
                            Trang trước
                        </Button>
                        <span className="flex items-center px-4 text-sm font-medium text-slate-600">
                            Trang {currentPage} / {Math.max(1, Math.ceil(totalEmployees / 10))}
                        </span>
                        <Button
                            variant="outline" size="sm"
                            disabled={currentPage >= Math.ceil(totalEmployees / 10)}
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="bg-white"
                        >
                            Trang sau
                        </Button>
                    </div>
                </div>
            </Card>
        </div>
    );
}