"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { toast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { createActivityAction } from "@/lib/action/activity";
// Import type từ schema để dùng ép kiểu
import { ActivityFormValues } from "@/lib/schemas/activity";

interface CustomerOption {
    id: string;
    name: string;
}

// Định nghĩa kiểu ActivityType để dùng lại cho gọn
type ActivityType = "call" | "meeting" | "email" | "task" | "other";

export function NewActivityForm({ customers }: { customers: CustomerOption[] }) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const preSelectedCustomerId = searchParams.get("customer_id") || "";

    const [loading, setLoading] = useState(false);

    // State giữ nguyên là string để binding với Input HTML dễ dàng
    const [formData, setFormData] = useState({
        title: "",
        activity_type: "call",
        customer_id: preSelectedCustomerId,
        scheduled_at: "",
        description: "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.customer_id) {
            toast({ title: "Lỗi", description: "Vui lòng chọn khách hàng", variant: "destructive" });
            setLoading(false);
            return;
        }

        if (!formData.scheduled_at) {
            toast({ title: "Lỗi", description: "Vui lòng chọn thời gian", variant: "destructive" });
            setLoading(false);
            return;
        }

        try {
            // --- KHẮC PHỤC LỖI TS2345 Ở ĐÂY ---
            // Chúng ta tạo một object mới chuẩn format mà Server Action yêu cầu
            const payload: ActivityFormValues = {
                title: formData.title,
                description: formData.description,
                customer_id: formData.customer_id,

                // 1. Ép kiểu chuỗi sang kiểu Union Type cụ thể
                activity_type: formData.activity_type as ActivityType,

                // 2. Chuyển chuỗi thời gian sang Date Object
                scheduled_at: new Date(formData.scheduled_at)
            };

            const res = await createActivityAction(payload);

            if (res.success) {
                toast({ title: "Thành công", description: "Đã tạo hoạt động mới", className: "bg-green-600 text-white" });
                router.push("/crm/activities");
            } else {
                toast({ title: "Lỗi", description: res.error, variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Lỗi hệ thống", description: "Vui lòng thử lại sau", variant: "destructive" });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* ... (Phần code giao diện giữ nguyên không đổi) ... */}
                    <div className="space-y-2">
                        <Label>Khách hàng <span className="text-red-500">*</span></Label>
                        <Select
                            value={formData.customer_id}
                            onValueChange={(val) => setFormData({ ...formData, customer_id: val })}
                            disabled={!!preSelectedCustomerId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn khách hàng..." />
                            </SelectTrigger>
                            <SelectContent>
                                {customers.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label>Tiêu đề <span className="text-red-500">*</span></Label>
                        <Input
                            required
                            placeholder="VD: Gọi điện tư vấn báo giá"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Loại hoạt động</Label>
                            <Select
                                // TypeScript sẽ hiểu value này là string, vẫn khớp với Select UI
                                value={formData.activity_type}
                                onValueChange={(val) => setFormData({ ...formData, activity_type: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="call">Cuộc gọi</SelectItem>
                                    <SelectItem value="meeting">Cuộc họp</SelectItem>
                                    <SelectItem value="email">Email</SelectItem>
                                    <SelectItem value="task">Nhiệm vụ</SelectItem>
                                    <SelectItem value="other">Khác</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Thời gian thực hiện <span className="text-red-500">*</span></Label>
                            <Input
                                required
                                type="datetime-local"
                                value={formData.scheduled_at}
                                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Mô tả chi tiết</Label>
                        <Textarea
                            placeholder="Ghi chú nội dung..."
                            className="h-32"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" type="button" asChild>
                            <Link href="/crm/activities">Hủy bỏ</Link>
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Lưu hoạt động
                        </Button>
                    </div>

                </form>
            </CardContent>
        </Card>
    );
}