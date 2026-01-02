"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UserProfile } from "@/lib/supabase/getUserProfile";
import { updateUserProfile } from "@/lib/action/profile";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Camera, User, Mail, Briefcase, MapPin, Phone } from "lucide-react";

// 1. Cập nhật Schema: dùng 'name'
const profileSchema = z.object({
    name: z.string().min(2, "Tên phải có ít nhất 2 ký tự"),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
    avatar_url: z.string().optional().nullable(),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

interface ProfileFormProps {
    initialData: UserProfile;
}

export default function ProfileForm({ initialData }: ProfileFormProps) {
    const { toast } = useToast();
    const [isPending, startTransition] = useTransition();
    const [avatarPreview, setAvatarPreview] = useState<string | null>(initialData?.avatar_url || null);

    if (!initialData) return <div>Không có dữ liệu.</div>;

    // 2. Cập nhật Default Values: dùng 'name'
    const form = useForm<ProfileFormValues>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            name: initialData.name || "",
            phone: initialData.phone || "",
            address: initialData.address || "",
            avatar_url: initialData.avatar_url || "",
        },
    });

    const onSubmit = (values: ProfileFormValues) => {
        startTransition(async () => {
            const result = await updateUserProfile(initialData.id, values);
            if (result.success) {
                toast({ title: "Thành công", description: "Đã cập nhật hồ sơ." });
            } else {
                toast({ title: "Lỗi", description: result.error, variant: "destructive" });
            }
        });
    };

    const getInitials = (name: string | null | undefined) => {
        return name ? name.trim().split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "U";
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 h-fit">
                <CardHeader className="text-center">
                    <div className="relative mx-auto w-32 h-32 mb-4">
                        <Avatar className="w-32 h-32 border-4 border-white shadow-lg">
                            <AvatarImage src={avatarPreview || ""} className="object-cover w-full h-full" />
                            <AvatarFallback className="text-3xl bg-slate-200">
                                {getInitials(initialData.name)}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <CardTitle>{initialData.name}</CardTitle>
                    <CardDescription>{initialData.email}</CardDescription>

                    <div className="mt-4 flex flex-col gap-2 text-sm text-left px-4">
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Briefcase size={16} />
                            <span>{initialData.position || "Nhân viên"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <User size={16} />
                            <span>{initialData.department || "Chưa phân phòng ban"}</span>
                        </div>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-xs">ID: {initialData.code || "N/A"}</span>
                        </div>
                    </div>
                </CardHeader>
            </Card>

            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Chỉnh sửa thông tin</CardTitle>
                    <CardDescription>Cập nhật thông tin cá nhân và liên hệ của bạn.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* 3. Cập nhật FormField: name="name" */}
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Họ và tên</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nguyễn Văn A" {...field} disabled={isPending} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormItem>
                                    <FormLabel>Email (Không thể sửa)</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Mail className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                            <Input value={initialData.email} disabled className="pl-9 bg-slate-50" />
                                        </div>
                                    </FormControl>
                                </FormItem>
                            </div>

                            {/* Các trường còn lại giữ nguyên */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Số điện thoại</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input placeholder="0901234567" {...field} value={field.value || ""} disabled={isPending} className="pl-9" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="address"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Địa chỉ</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <MapPin className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                                    <Input placeholder="Hà Nội, Việt Nam" {...field} value={field.value || ""} disabled={isPending} className="pl-9" />
                                                </div>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t">
                                <FormItem>
                                    <FormLabel>Ngày vào làm</FormLabel>
                                    <FormControl>
                                        <Input value={initialData.hire_date ? new Date(initialData.hire_date).toLocaleDateString("vi-VN") : "N/A"} disabled className="bg-slate-50" />
                                    </FormControl>
                                </FormItem>
                                <FormItem>
                                    <FormLabel>Trạng thái</FormLabel>
                                    <FormControl>
                                        <Input value={initialData.status === 'active' ? 'Đang hoạt động' : 'Nghỉ việc'} disabled className="bg-slate-50" />
                                    </FormControl>
                                </FormItem>
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Lưu thay đổi"}
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
}