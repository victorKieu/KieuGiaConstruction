"use client";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from "@/lib/supabase";
import { formatDate } from "@/lib/utils/utils";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
// Import thêm Select của Shadcn hoặc dùng HTML select thường
// Ở đây mình dùng HTML select + Tailwind cho đơn giản và ít lỗi component

// 1. Interface cho Dictionary (Phòng ban)
interface SysDictionary {
    id: string;
    name: string;
    code: string;
}

// 2. Cập nhật Interface Employee (Dùng department_id)
interface Employee {
    id: string;
    name: string;
    email: string;
    position: string;
    department_id: string | null; // Quan trọng: dùng ID thay vì string tên
    department_name?: string; // Tên phòng ban (lấy từ join) để hiển thị lúc xem
    start_date: string | null;
    status: string;
}

const EmployeeDetailPage = () => {
    const router = useRouter();
    const params = useParams();
    const id = params?.id as string;
    const { toast } = useToast();

    const [employee, setEmployee] = useState<Employee | null>(null);
    const [departments, setDepartments] = useState<SysDictionary[]>([]); // State chứa list phòng ban
    const [isLoading, setIsLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // 3. Form Data lưu department_id
    const [formData, setFormData] = useState<Partial<Employee>>({
        name: '',
        email: '',
        position: '',
        department_id: '', // Lưu ID
        start_date: '',
    });

    useEffect(() => {
        const fetchData = async () => {
            if (!id) return;
            setIsLoading(true);

            try {
                // 1. Lấy danh sách phòng ban cho Dropdown
                const { data: dictData } = await supabase
                    .from('sys_dictionaries')
                    .select('id, name, code')
                    .eq('type', 'department'); // Đảm bảo 'department' khớp với code trong DB

                if (dictData) setDepartments(dictData);

                // 2. Lấy thông tin nhân viên (KHÔNG JOIN nũa để tránh lỗi)
                const { data: empData, error: empError } = await supabase
                    .from('employees')
                    .select('*') // Lấy hết các cột cơ bản, bao gồm department_id
                    .eq('id', id)
                    .single();

                if (empError) throw empError;

                if (empData) {
                    // 3. Tự tìm tên phòng ban từ list dictData đã lấy ở bước 1
                    // (Thay vì bắt Database join, ta tự join bằng JS)
                    const deptName = dictData?.find(d => d.id === empData.department_id)?.name || "Chưa cập nhật";

                    // Map dữ liệu
                    const mappedEmployee: Employee = {
                        ...empData,
                        department_name: deptName, // Gán tên vừa tìm được
                        department_id: empData.department_id
                    };

                    setEmployee(mappedEmployee);
                    setFormData({
                        name: mappedEmployee.name,
                        email: mappedEmployee.email,
                        position: mappedEmployee.position,
                        department_id: mappedEmployee.department_id || "",
                        start_date: mappedEmployee.start_date
                    });
                }
            } catch (error: any) {
                console.error("Lỗi tải dữ liệu:", JSON.stringify(error, null, 2));
                toast({
                    title: "Lỗi",
                    description: "Không tải được dữ liệu: " + (error.message || "Lỗi không xác định"),
                    variant: "destructive"
                });
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [id, toast]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async () => {
        if (!employee) return;

        // 4. Gửi department_id lên Server
        const { error } = await supabase
            .from('employees')
            .update({
                name: formData.name,
                email: formData.email,
                position: formData.position,
                department_id: formData.department_id === "" ? null : formData.department_id, // Cập nhật cột ID
                start_date: formData.start_date
            })
            .eq('id', employee.id);

        if (!error) {
            // Cập nhật lại UI Client: Cần tìm tên phòng ban dựa vào ID mới chọn để hiển thị đẹp
            const selectedDept = departments.find(d => d.id === formData.department_id);

            setEmployee({
                ...employee,
                ...formData,
                department_name: selectedDept?.name || "Chưa cập nhật"
            } as Employee);

            setIsEditing(false);
            toast({ title: "Thành công", description: "Đã cập nhật." });
        } else {
            console.error("Update Error:", error);
            toast({ title: "Lỗi", description: error.message, variant: "destructive" });
        }
    };

    // ... (Giữ nguyên hàm handleDelete và getInputValueDate)
    const handleDelete = async () => {/* Code cũ */ };
    const getInputValueDate = (d: string | null | undefined) => d ? d.split('T')[0] : "";

    if (isLoading) return <div>Loading...</div>;
    if (!employee) return <div>Not found</div>;

    return (
        <div className="container mx-auto py-8 max-w-2xl">
            <Card>
                <CardHeader className="flex flex-row justify-between items-center">
                    <h2 className="text-xl font-bold">Chi tiết nhân viên</h2>
                    <Button variant={isEditing ? "outline" : "default"} onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? 'Hủy bỏ' : 'Chỉnh sửa'}
                    </Button>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="flex flex-col gap-4">
                            {/* Các Input khác giữ nguyên */}
                            <div>
                                <label className="text-sm font-medium mb-1 block">Họ tên</label>
                                <Input name="name" value={formData.name || ""} onChange={handleChange} />
                            </div>

                            {/* --- THAY ĐỔI: DROPDOWN CHỌN PHÒNG BAN --- */}
                            <div>
                                <label className="text-sm font-medium mb-1 block">Phòng ban</label>
                                <select
                                    name="department_id"
                                    value={formData.department_id || ""}
                                    onChange={handleChange}
                                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                >
                                    <option value="">-- Chọn phòng ban --</option>
                                    {departments.map((dept) => (
                                        <option key={dept.id} value={dept.id}>
                                            {dept.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            {/* ------------------------------------------ */}

                            <div>
                                <label className="text-sm font-medium mb-1 block">Email</label>
                                <Input name="email" value={formData.email || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Chức vụ</label>
                                <Input name="position" value={formData.position || ""} onChange={handleChange} />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Ngày vào làm</label>
                                <Input name="start_date" type="date" value={getInputValueDate(formData.start_date)} onChange={handleChange} />
                            </div>
                            <Button className="mt-2" onClick={handleUpdate}>Lưu thay đổi</Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {/* Hiển thị thông tin (View Mode) */}
                            <div className="grid grid-cols-3 gap-2 border-b pb-2">
                                <span className="font-semibold text-gray-500">Họ tên:</span>
                                <span className="col-span-2">{employee.name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b pb-2">
                                <span className="font-semibold text-gray-500">Phòng ban:</span>
                                {/* Hiển thị tên phòng ban (đã join), không hiển thị ID */}
                                <span className="col-span-2">{employee.department_name}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b pb-2">
                                <span className="font-semibold text-gray-500">Email:</span>
                                <span className="col-span-2">{employee.email}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b pb-2">
                                <span className="font-semibold text-gray-500">Chức vụ:</span>
                                <span className="col-span-2">{employee.position}</span>
                            </div>
                            <div className="grid grid-cols-3 gap-2 border-b pb-2">
                                <span className="font-semibold text-gray-500">Ngày vào làm:</span>
                                <span className="col-span-2">
                                    {employee.start_date ? formatDate(employee.start_date) : "Chưa cập nhật"}
                                </span>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default EmployeeDetailPage;