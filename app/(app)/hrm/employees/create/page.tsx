// app/(app)/hrm/employees/create/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { createEmployeeAuthAndProfile } from "@/lib/action/hrmActions"; // Import Server Action mới
import { useFormStatus } from "react-dom"; // Hook để kiểm tra trạng thái form submission

// Component này chỉ để hiển thị trạng thái loading của form
function SubmitButton() {
    const { pending } = useFormStatus();
    return (
        <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Đang tạo nhân viên..." : "Tạo nhân viên mới"}
        </Button>
    );
}

export default function CreateEmployeeAccountPage() {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Sử dụng state cho các input nếu bạn cần kiểm soát chúng (ví dụ: validation realtime)
    // Nếu không, bạn có thể để các input không được kiểm soát và truy cập trực tiếp bằng FormData
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [position, setPosition] = useState("");
    const [phone, setPhone] = useState("");
    const [address, setAddress] = useState("");
    const [department, setDepartment] = useState("");
    const [hireDate, setHireDate] = useState("");
    const [birthday, setBirthday] = useState("");

    const handleSubmit = async (formData: FormData) => {
        setError(null);
        setSuccessMessage(null);

        const result = await createEmployeeAuthAndProfile(formData);

        if (result.success) {
            setSuccessMessage(result.message);
            // Reset form sau khi hoàn tất
            setEmail("");
            setPassword("");
            setFullName("");
            setPosition("");
            setPhone("");
            setAddress("");
            setDepartment("");
            setHireDate("");
            setBirthday("");

            // Chuyển hướng đến danh sách nhân viên sau một thời gian ngắn
            setTimeout(() => {
                router.push("/hrm/employees");
            }, 2000);
        } else {
            setError(result.error || "Có lỗi xảy ra.");
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100 p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-2xl font-bold text-center">
                        Cấp tài khoản Nhân viên
                    </CardTitle>
                    <CardDescription className="text-center">
                        Tạo tài khoản login và hồ sơ chi tiết cho nhân viên mới.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}
                    {successMessage && <p className="text-green-500 text-sm mb-4 text-center">{successMessage}</p>}

                    <form action={handleSubmit} className="space-y-4">
                        <div>
                            <Label htmlFor="fullName">Tên đầy đủ</Label>
                            <Input
                                id="fullName"
                                name="fullName" // Quan trọng: thêm thuộc tính name
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                name="email" // Quan trọng: thêm thuộc tính name
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="password">Mật khẩu tạm thời</Label>
                            <Input
                                id="password"
                                name="password" // Quan trọng: thêm thuộc tính name
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="position">Chức vụ</Label>
                            <Input
                                id="position"
                                name="position" // Quan trọng: thêm thuộc tính name
                                type="text"
                                value={position}
                                onChange={(e) => setPosition(e.target.value)}
                                required
                            />
                        </div>
                        <div>
                            <Label htmlFor="department">Phòng ban</Label>
                            <Input
                                id="department"
                                name="department"
                                type="text"
                                value={department}
                                onChange={(e) => setDepartment(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="hire_date">Ngày tuyển dụng</Label>
                            <Input
                                id="hire_date"
                                name="hire_date"
                                type="date"
                                value={hireDate}
                                onChange={(e) => setHireDate(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="birthday">Ngày sinh</Label>
                            <Input
                                id="birthday"
                                name="birthday"
                                type="date"
                                value={birthday}
                                onChange={(e) => setBirthday(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="phone">Số điện thoại</Label>
                            <Input
                                id="phone"
                                name="phone" // Quan trọng: thêm thuộc tính name
                                type="text"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                            />
                        </div>
                        <div>
                            <Label htmlFor="address">Địa chỉ</Label>
                            <Input
                                id="address"
                                name="address" // Quan trọng: thêm thuộc tính name
                                type="text"
                                value={address}
                                onChange={(e) => setAddress(e.target.value)}
                            />
                        </div>
                        <SubmitButton />
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}