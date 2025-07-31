// components/hrm/CreateEmployeeForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createFullEmployeeAccount } from "@/lib/action/hrmActions"; // Import action
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react"; // Import icon loading

// Zod Schema cho form (tương tự schema trong hrmActions nhưng có thể khác đôi chút cho client-side validation)
const formSchema = z.object({
    email: z.string().email("Email không hợp lệ."),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự."),
    fullName: z.string().min(1, "Tên đầy đủ không được để trống."),
    position: z.string().min(1, "Chức vụ không được để trống."),
    department: z.string().optional().nullable(),
    hireDate: z.string().optional().nullable(),
    birthday: z.string().optional().nullable(),
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEmployeeFormProps {
    onSuccess: () => void; // Callback khi tạo thành công
}

export default function CreateEmployeeForm({ onSuccess }: CreateEmployeeFormProps) {
    const { toast } = useToast();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            email: "",
            password: "",
            fullName: "",
            position: "",
            department: "",
            hireDate: "",
            birthday: "",
            phone: "",
            address: "",
        },
    });

    const onSubmit = async (values: FormValues) => {
        setIsSubmitting(true);
        const formData = new FormData();
        for (const key in values) {
            if (values[key as keyof FormValues] !== null && values[key as keyof FormValues] !== undefined) {
                formData.append(key, String(values[key as keyof FormValues]));
            }
        }

        try {
            const response = await createFullEmployeeAccount(formData);

            if (response.success) {
                toast({
                    title: "Thành công",
                    description: response.message,
                    variant: "default",
                });
                form.reset(); // Reset form sau khi thành công
                onSuccess(); // Gọi callback để đóng dialog và refresh list
            } else {
                toast({
                    title: "Lỗi",
                    description: response.error,
                    variant: "destructive",
                });
            }
        } catch (error: any) {
            console.error("Lỗi không mong muốn:", error);
            toast({
                title: "Lỗi",
                description: "Đã xảy ra lỗi không mong muốn: " + error.message,
                variant: "destructive",
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                                <Input placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mật khẩu</FormLabel>
                            <FormControl>
                                <Input type="password" placeholder="••••••••" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="fullName"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tên đầy đủ</FormLabel>
                            <FormControl>
                                <Input placeholder="Nguyễn Văn A" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="position"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Chức vụ</FormLabel>
                            <FormControl>
                                <Input placeholder="Nhân viên" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="department"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Phòng ban (Tùy chọn)</FormLabel>
                            <FormControl>
                                <Input placeholder="Phòng Kỹ thuật" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="hireDate"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ngày vào làm (Tùy chọn)</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="birthday"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ngày sinh (Tùy chọn)</FormLabel>
                            <FormControl>
                                <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Số điện thoại (Tùy chọn)</FormLabel>
                            <FormControl>
                                <Input placeholder="0901234567" {...field} />
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
                            <FormLabel>Địa chỉ (Tùy chọn)</FormLabel>
                            <FormControl>
                                <Input placeholder="123 Đường ABC, Quận 1, TP.HCM" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Đang tạo...
                        </>
                    ) : (
                        "Tạo Nhân viên"
                    )}
                </Button>
            </form>
        </Form>
    );
}