"use client"; // Đánh dấu đây là client component
import { formatDate } from "@/lib/utils/utils";

import React, { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { supabase } from "@/lib/supabase"; // Đảm bảo rằng bạn đã cấu hình Supabase đúng cách
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const EmployeeDetailPage = () => {
    const router = useRouter();
    const { id } = useParams(); // Lấy id từ params
    const [employee, setEmployee] = useState<any>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [formData, setFormData] = useState<any>({}); // Dữ liệu form

    useEffect(() => {
        const fetchEmployee = async () => {
            if (!id) return; // Kiểm tra id có tồn tại không

            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .eq('id', id)
                .single();

            if (!error) {
                setEmployee(data);
                setFormData(data); // Khởi tạo dữ liệu form với dữ liệu nhân viên
            } else {
                console.error("Error fetching employee:", error);
            }
        };

        fetchEmployee();
    }, [id]); // Chỉ gọi fetchEmployee khi id thay đổi

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev: any) => ({ ...prev, [name]: value }));
    };

    const handleUpdate = async () => {
        const { error } = await supabase
            .from('employees')
            .update(formData)
            .eq('id', id);

        if (!error) {
            setEmployee(formData);
            setIsEditing(false);
        } else {
            console.error("Error updating employee:", error);
        }
    };

    const handleDelete = async () => {
        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', id);

        if (!error) {
            router.push('/app/hrm/employees'); // Trở về danh sách nhân viên sau khi xóa
        } else {
            console.error("Error deleting employee:", error);
        }
    };

    if (!employee) return <div>Loading...</div>;

    return (
        <div className="container mx-auto py-8">
            <Card>
                <CardHeader className="flex justify-between items-center">
                    <h2 className="text-xl font-bold">Chi tiết nhân viên</h2>
                    <Button onClick={() => setIsEditing(!isEditing)}>
                        {isEditing ? 'Hủy' : 'Sửa'}
                    </Button>
                    <Button variant="outline" color="destructive" onClick={handleDelete}>
                        Xóa
                    </Button>
                </CardHeader>
                <CardContent>
                    {isEditing ? (
                        <div className="flex flex-col gap-4">
                            <Input
                                name="full_name"
                                value={formData.full_name}
                                onChange={handleChange}
                                placeholder="Họ tên"
                            />
                            <Input
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Email"
                            />
                            <Input
                                name="position"
                                value={formData.position}
                                onChange={handleChange}
                                placeholder="Chức vụ"
                            />
                            <Input
                                name="department"
                                value={formData.department}
                                onChange={handleChange}
                                placeholder="Phòng ban"
                            />
                            <Input
                                name="start_date"
                                type="date"
                                value={formData.start_date ? formatDate(formData.start_date) : ""}
                                onChange={handleChange}
                                placeholder="Ngày vào làm"
                            />
                            <Button onClick={handleUpdate}>Cập nhật</Button>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-2">
                            <p><strong>Họ tên:</strong> {employee.full_name}</p>
                            <p><strong>Email:</strong> {employee.email}</p>
                            <p><strong>Chức vụ:</strong> {employee.position}</p>
                            <p><strong>Phòng ban:</strong> {employee.department}</p>
                            <p><strong>Ngày vào làm:</strong> {formatDate(employee.start_date)}</p>
                            <p><strong>Trạng thái:</strong> {employee.status}</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default EmployeeDetailPage;