"use client"; // Đảm bảo có dòng này ở trên cùng

import * as React from "react";
import { useRouter } from "next/navigation"; // Import `useRouter` từ `next/navigation`
import { supabase } from "@/lib/supabase";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";

const statusOptions = ["Tất cả", "Đang làm", "Nghỉ việc", "Thử việc"];
const departments = ["Tất cả", "Phòng A", "Phòng B", "Phòng C"]; // Chỉnh sửa danh sách này cho phù hợp

export default function EmployeesPage() {
    const router = useRouter(); // Sử dụng router từ `next/navigation`
    const [employees, setEmployees] = React.useState<any[]>([]);
    const [search, setSearch] = React.useState("");
    const [currentPage, setCurrentPage] = React.useState(1);
    const [employeesPerPage] = React.useState(5);
    const [totalEmployees, setTotalEmployees] = React.useState(0);
    const [selectedStatus, setSelectedStatus] = React.useState("Tất cả");
    const [selectedDepartment, setSelectedDepartment] = React.useState("Tất cả");

    // Fetch employees
    React.useEffect(() => {
        const fetchEmployees = async () => {
            let query = supabase
                .from("employees")
                .select("*", { count: 'exact' })
                .range((currentPage - 1) * employeesPerPage, currentPage * employeesPerPage - 1)
                .order("created_at", { ascending: false });

            if (search) {
                query = query.ilike("full_name", `%${search}%`);
            }
            if (selectedStatus !== "Tất cả") {
                query = query.eq("status", selectedStatus);
            }
            if (selectedDepartment !== "Tất cả") {
                query = query.eq("department", selectedDepartment);
            }

            const { data, error, count } = await query;
            if (!error) {
                setEmployees(data || []);
                setTotalEmployees(count || 0);
            } else {
                console.error("Error fetching employees:", error);
            }
        };
        fetchEmployees();
    }, [search, currentPage, selectedStatus, selectedDepartment]);

    const totalPages = Math.ceil(totalEmployees / employeesPerPage);

    const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                    <div className="text-xl font-bold">Danh sách nhân viên</div>
                    <div className="flex gap-4">
                        <Input
                            placeholder="Tìm kiếm nhân viên..."
                            value={search}
                            onChange={e => {
                                setSearch(e.target.value);
                                setCurrentPage(1);
                            }}
                            className="w-64"
                        />
                        {/* Filter status */}
                        <select
                            value={selectedStatus}
                            onChange={e => {
                                setSelectedStatus(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            {statusOptions.map(status => (
                                <option key={status} value={status}>
                                    {status}
                                </option>
                            ))}
                        </select>
                        {/* Filter department */}
                        <select
                            value={selectedDepartment}
                            onChange={e => {
                                setSelectedDepartment(e.target.value);
                                setCurrentPage(1);
                            }}
                        >
                            {departments.map(department => (
                                <option key={department} value={department}>
                                    {department}
                                </option>
                            ))}
                        </select>
                    </div>
                </CardHeader>
                <CardContent>
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
                                                <AvatarImage src={emp.avatar_url || undefined} alt={emp.full_name || "avatar"} />
                                                <AvatarFallback>
                                                    {(emp.full_name?.trim()?.split(" ").map((w: any[]) => w[0]).join("") || emp.name?.[0] || "?").toUpperCase()}
                                                </AvatarFallback>
                                            </Avatar>
                                        </TableCell>
                                        <TableCell>{emp.code || emp.name}</TableCell>
                                        <TableCell>{emp.full_name || emp.name}</TableCell>
                                        <TableCell>{emp.email}</TableCell>
                                        <TableCell>{emp.position}</TableCell>
                                        <TableCell>{emp.department}</TableCell>
                                        <TableCell>{emp.start_date ? new Date(emp.start_date).toLocaleDateString() : ""}</TableCell>
                                        <TableCell>{emp.status}</TableCell>
                                        <TableCell>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => router.push(`/hrm/employees/${emp.id}`)} // Chuyển hướng đến trang chi tiết
                                            >
                                                Xem
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                    <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={paginate} />
                </CardContent>
            </Card>
        </div>
    );
}
