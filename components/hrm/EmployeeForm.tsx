// components/hrm/CreateEmployeeForm.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { createFullEmployeeAccount } from "@/lib/action/hrmActions"; // Đảm bảo đường dẫn này đúng
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";

// Zod Schema
const formSchema = z.object({
    email: z.string().email("Email không hợp lệ."),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự."),
    fullName: z.string().min(1, "Tên đầy đủ không được để trống."),
    position: z.string().min(1, "Chức vụ không được để trống."),
    // Các trường optional: sử dụng .or(z.literal('')) để cho phép chuỗi rỗng từ input
    department: z.string().optional().or(z.literal('')),
    hireDate: z.string().optional().or(z.literal('')),
    birthday: z.string().optional().or(z.literal('')),
    phone: z.string().optional().or(z.literal('')),
    address: z.string().optional().or(z.literal('')),
});

type FormValues = z.infer<typeof formSchema>;

interface CreateEmployeeFormProps {
    onSuccess: () => void;
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

        // Chuyển đổi values sang FormData
        Object.entries(values).forEach(([key, value]) => {
            if (value) { // Chỉ append nếu có giá trị (tránh gửi chuỗi rỗng hoặc null/undefined không cần thiết)
                formData.append(key, String(value));
            }
        });

        try {
            const response = await createFullEmployeeAccount(formData);

            if (response.success) {
                toast({
                    title: "Thành công",
                    description: response.message,
                    variant: "default",
                });
                form.reset();
                onSuccess();
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
                title: "Lỗi hệ thống",
                description: "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.",
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
                            <FormLabel>Email <span className="text-red-500">*</span></FormLabel>
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
                            <FormLabel>Mật khẩu <span className="text-red-500">*</span></FormLabel>
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
                            <FormLabel>Tên đầy đủ <span className="text-red-500">*</span></FormLabel>
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
                            <FormLabel>Chức vụ <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input placeholder="Nhân viên Kinh doanh" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="department"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Phòng ban</FormLabel>
                                <FormControl>
                                    <Input placeholder="Phòng Kỹ thuật" {...field} />
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
                                <FormLabel>Số điện thoại</FormLabel>
                                <FormControl>
                                    <Input placeholder="0901234567" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="hireDate"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ngày vào làm</FormLabel>
                                <FormControl>
                                    {/* Input type="date" cần value là string YYYY-MM-DD. 
                                        Nếu field.value là undefined/null, React sẽ warning component đổi từ uncontrolled sang controlled.
                                        DefaultValues đã xử lý việc này, nhưng thêm || '' để chắc chắn. */}
                                    <Input type="date" {...field} value={field.value || ''} />
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
                                <FormLabel>Ngày sinh</FormLabel>
                                <FormControl>
                                    <Input type="date" {...field} value={field.value || ''} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="address"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Địa chỉ</FormLabel>
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