// components/profile/ProfileForm.tsx
"use client";

import type { UserProfile } from '@/types/userProfile';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface ProfileFormProps {
    initialData: UserProfile;
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
    const getInitials = (name: string | null | undefined) => {
        if (!name) return "U";
        return name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase()
            .substring(0, 2);
    };

    const displayName = initialData.name || initialData.email || 'Người dùng';
    const displayAvatarUrl = initialData.avatar_url || "/placeholder.svg";

    return (
        <Card className="max-w-3xl mx-auto shadow-lg">
            <CardHeader>
                <CardTitle className="text-2xl">Thông tin Profile của bạn</CardTitle>
                <CardDescription>
                    Xem và quản lý thông tin cá nhân của bạn.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col items-center mb-6">
                    <Avatar className="h-24 w-24 mb-4">
                        <AvatarImage src={displayAvatarUrl} alt={displayName} />
                        <AvatarFallback className="text-3xl">{getInitials(displayName)}</AvatarFallback>
                    </Avatar>
                    <h2 className="text-xl font-semibold mb-1">{displayName}</h2>
                    <p className="text-muted-foreground">{initialData.email}</p>
                </div>

                <Separator className="my-6" />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <Label htmlFor="name">Tên hiển thị</Label>
                        <Input id="name" type="text" value={displayName} readOnly className="mt-1" />
                    </div>
                    <div>
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" value={initialData.email || ''} readOnly className="mt-1" />
                    </div>
                    {initialData.user_type === 'employee' && (
                        <>
                            <div>
                                <Label htmlFor="position">Vị trí</Label>
                                <Input id="position" type="text" value={initialData.position || 'N/A'} readOnly className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="department">Phòng ban</Label>
                                <Input id="department" type="text" value={initialData.department_id || 'N/A'} readOnly className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="hire_date">Ngày tuyển dụng</Label>
                                <Input id="hire_date" type="text" value={initialData.hire_date ? new Date(initialData.hire_date).toLocaleDateString() : 'N/A'} readOnly className="mt-1" />
                            </div>
                            {/* Thêm các trường khác của employee nếu cần */}
                        </>
                    )}
                    {initialData.user_type === 'customer' && (
                        <>
                            <div>
                                <Label htmlFor="contact_person">Người liên hệ</Label>
                                <Input id="contact_person" type="text" value={initialData.contact_person || 'N/A'} readOnly className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="contact_phone">Số điện thoại liên hệ</Label>
                                <Input id="contact_phone" type="text" value={initialData.contact_phone || 'N/A'} readOnly className="mt-1" />
                            </div>
                            <div>
                                <Label htmlFor="contact_address">Địa chỉ liên hệ</Label>
                                <Input id="contact_address" type="text" value={initialData.contact_address || 'N/A'} readOnly className="mt-1" />
                            </div>
                            {/* Thêm các trường khác của customer nếu cần */}
                        </>
                    )}
                    {/* Các trường chung khác (ví dụ: phone) */}
                    <div>
                        <Label htmlFor="phone">Số điện thoại</Label>
                        <Input id="phone" type="text" value={initialData.phone || 'N/A'} readOnly className="mt-1" />
                    </div>
                    {/* Thêm các trường chung khác mà bạn muốn hiển thị */}
                </div>
                {/* Bạn có thể thêm nút "Chỉnh sửa" nếu muốn tính năng này */}
                {/* <Button className="mt-6 w-full">Chỉnh sửa thông tin</Button> */}
            </CardContent>
        </Card>
    );
}