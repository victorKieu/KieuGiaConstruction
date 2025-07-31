// components/hrm/EmployeesClientPage.tsx
"use client"; // Đây là Client Component

import * as React from "react";
import { useRouter } from "next/navigation"; // useRouter chỉ dùng trong Client Component
import { getEmployees } from "@/lib/action/hrmActions"; // Import Server Action để gọi từ client

// Import các component UI từ shadcn/ui
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";

// Import CreateEmployeeForm
import CreateEmployeeForm from "@/components/hrm/EmployeeForm";

// --- IMPORT CÁC INTERFACE TỪ FILE types/hrm.d.ts ---
import { Employee, GetEmployeesParams, GetEmployeesResult } from '@/types/hrm';

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
    // Khởi tạo state với dữ liệu ban đầu được truyền từ Server Component
    const [employees, setEmployees] = React.useState<Employee[]>(initialEmployees);
    const [search, setSearch] = React.useState("");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [employeesPerPage] = React.useState(5); // Có thể làm cho nó configurable nếu muốn
    const [totalEmployees, setTotalEmployees] = React.useState(initialTotalCount);
    const [selectedStatus, setSelectedStatus] = React.useState("Tất cả");
    const [selectedDepartment, setSelectedDepartment] = React.useState("Tất cả");
    const [isLoading, setIsLoading] = React.useState(false); // Ban đầu không loading vì đã có dữ liệu
    const [isFormOpen, setIsFormOpen] = React.useState(false);
    const { toast } = useToast();

    // Fetch employees khi các filter hoặc trang thay đổi
    React.useEffect(() => {
        const fetchEmployeesData = async () => {
            setIsLoading(true);
            try {
                const data = await getEmployees({
                    search: search,
                    status: selectedStatus === "Tất cả" ? undefined : selectedStatus,
                    department: selectedDepartment === "Tất cả" ? undefined : selectedDepartment,
                    page: currentPage,
                    limit: employeesPerPage,
                });
                setEmployees(data.employees || []);
                setTotalEmployees(data.totalCount || 0);
            } catch (error: any) {
                console.error("Error fetching employees:", error);
                toast({
                    title: "Lỗi",
                    description: "Không thể tải danh sách nhân viên: " + error.message,
                    variant: "destructive",
                });
            } finally {
                setIsLoading(false);
            }
        };
        // Chỉ fetch khi có sự thay đổi từ UI, không cần fetch lại dữ liệu ban đầu
        // khi component mount lần đầu vì đã có initialData.
        // Tuy nhiên, nếu bạn muốn refetch khi component mount lại vì lý do nào đó,
        // bạn có thể thêm một check `if (!initialLoadDone)` hoặc tương tự.
        // Hiện tại, logic này sẽ fetch lại khi bất kỳ dependency nào thay đổi.
        fetchEmployeesData();
    }, [search, currentPage, selectedStatus, selectedDepartment, employeesPerPage, toast]);

    const totalPages = Math.ceil(totalEmployees / employeesPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    const handleFormSuccess = () => {
        setIsFormOpen(false); // Đóng dialog
        setCurrentPage(1); // Reset về trang 1
        // useEffect sẽ tự động re-fetch khi currentPage thay đổi
        toast({
            title: "Thành công",
            description: "Nhân viên mới đã được tạo.",
            variant: "default",
        });
    };

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <div className="text-xl font-bold">Danh sách nhân viên</div>
                    <div className="flex gap-4 items-center">
                        <Input
                            placeholder="Tìm kiếm nhân viên..."
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-64"
                        />
                        <select
                            value={selectedStatus}
                            onChange={e => {
                                setSelectedStatus(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="p-2 border rounded-md"
                        >
                            {statusOptions.map(status => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                        <select
                            value={selectedDepartment}
                            onChange={e => {
                                setSelectedDepartment(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="p-2 border rounded-md"
                        >
                            {departments.map(department => (
                                <option key={department} value={department}>
                                    {department}
                                </option>
                            ))}
                        </select>
                        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
                            <DialogTrigger asChild>
                                <Button>Thêm Nhân viên</Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-[425px] md:max-w-lg lg:max-w-xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Thêm Nhân viên Mới</DialogTitle>
                                    <DialogDescription>
                                        Điền thông tin để tạo tài khoản và hồ sơ nhân viên mới.
                                    </DialogDescription>
                                </DialogHeader>
                                <CreateEmployeeForm onSuccess={handleFormSuccess} />
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="text-center py-8">Đang tải danh sách nhân viên...</div>
                    ) : (
                        <>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Avatar</TableHead>
                                        <TableHead>Mã nhân viên</TableHead>
                                        <TableHead>Họ tên</TableHead>
                                        <TableHead>Email</TableHead>
                                        <TableHead>Chức vụ</TableHead>
                                        <TableHead>Phòng ban</TableHead>
                                        <TableHead>Ngày vào làm</TableHead>
                                        <TableHead>Trạng thái</TableHead>
                                        <TableHead></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {employees.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center text-muted-foreground py-6">
                                                Không có nhân viên nào
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        employees.map(emp => (
                                            <TableRow key={emp.id}>
                                                <TableCell>
                                                    <Avatar>
                                                        {/* Sử dụng emp.avatar_url trực tiếp */}
                                                        <AvatarImage src={emp.avatar_url || undefined} alt={emp.name || "avatar"} />
                                                        <AvatarFallback>
                                                            {/* Sử dụng emp.name cho fallback */}
                                                            {(emp.name?.trim()?.split(" ").map((w: string) => w[0]).join("") || "?").toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                </TableCell>
                                                <TableCell>{emp.code || 'N/A'}</TableCell>
                                                <TableCell>{emp.name}</TableCell> {/* Sử dụng emp.name */}
                                                <TableCell>{emp.email}</TableCell>
                                                <TableCell>{emp.position}</TableCell>
                                                <TableCell>{emp.department || 'N/A'}</TableCell>
                                                <TableCell>{emp.hire_date ? new Date(emp.hire_date).toLocaleDateString() : "N/A"}</TableCell>
                                                <TableCell>{emp.status}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => router.push(`/hrm/employees/${emp.id}`)}
                                                    >
                                                        Xem
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                            {totalPages > 1 && (
                                <div className="flex justify-center mt-4">
                                    <div className="flex space-x-2">
                                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                            <Button
                                                key={page}
                                                variant={currentPage === page ? "default" : "outline"}
                                                onClick={() => paginate(page)}
                                            >
                                                {page}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}