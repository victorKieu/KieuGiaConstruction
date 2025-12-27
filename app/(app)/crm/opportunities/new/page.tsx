"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast"; // Hoặc đường dẫn tới hook toast của bạn

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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// IMPORT SERVER ACTION ĐÃ VIẾT Ở BÀI TRƯỚC
import { createOpportunityAction } from "@/lib/action/opportunity";

export default function NewOpportunityPage() {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Lấy customer_id từ URL (ví dụ: /new?customer_id=123)
    const customerId = searchParams.get("customer_id");

    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        value: "",
        stage: "new",
        expected_close_date: "",
        description: "",
    });

    // Nếu không có customer_id, báo lỗi hoặc redirect
    useEffect(() => {
        if (!customerId) {
            toast({
                title: "Thiếu thông tin",
                description: "Vui lòng chọn khách hàng trước khi tạo cơ hội.",
                variant: "destructive",
            });
            // router.push("/crm/customers"); // Uncomment nếu muốn tự động quay lại
        }
    }, [customerId, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!customerId) return;
        setLoading(true);

        try {
            // GỌI TRỰC TIẾP SERVER ACTION (Thay vì fetch API)
            const res = await createOpportunityAction({
                title: formData.title,
                customer_id: customerId,
                value: formData.value, // Action sẽ tự convert sang number
                stage: formData.stage,
                expected_close_date: formData.expected_close_date,
                description: formData.description,
            });

            if (res.success) {
                toast({
                    title: "Thành công",
                    description: "Đã tạo cơ hội bán hàng mới.",
                    className: "bg-green-600 text-white border-none",
                });
                // Quay lại trang chi tiết khách hàng
                router.push(`/crm/customers/${customerId}`);
            } else {
                toast({
                    title: "Lỗi",
                    description: res.error || "Không thể tạo cơ hội.",
                    variant: "destructive",
                });
            }
        } catch (error) {
            console.error("Submit Error:", error);
            toast({
                title: "Lỗi hệ thống",
                description: "Đã xảy ra lỗi không mong muốn.",
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-2xl mx-auto">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild>
                    <Link href={customerId ? `/crm/customers/${customerId}` : "/crm/customers"}>
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <h2 className="text-3xl font-bold tracking-tight">Tạo cơ hội mới</h2>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Thông tin cơ hội</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Tên cơ hội */}
                        <div className="space-y-2">
                            <Label htmlFor="title">Tên cơ hội <span className="text-red-500">*</span></Label>
                            <Input
                                id="title"
                                placeholder="VD: Cung cấp vật liệu xây dựng dự án A"
                                required
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Giá trị */}
                            <div className="space-y-2">
                                <Label htmlFor="value">Giá trị dự kiến (VNĐ)</Label>
                                <Input
                                    id="value"
                                    type="number"
                                    placeholder="0"
                                    min="0"
                                    value={formData.value}
                                    onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                                />
                            </div>

                            {/* Ngày dự kiến chốt */}
                            <div className="space-y-2">
                                <Label htmlFor="date">Ngày dự kiến chốt</Label>
                                <Input
                                    id="date"
                                    type="date"
                                    value={formData.expected_close_date}
                                    onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Giai đoạn */}
                        <div className="space-y-2">
                            <Label htmlFor="stage">Giai đoạn</Label>
                            <Select
                                value={formData.stage}
                                onValueChange={(val) => setFormData({ ...formData, stage: val })}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Chọn giai đoạn" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="new">Mới</SelectItem>
                                    <SelectItem value="qualification">Đánh giá</SelectItem>
                                    <SelectItem value="proposal">Gửi báo giá</SelectItem>
                                    <SelectItem value="negotiation">Đàm phán</SelectItem>
                                    <SelectItem value="closed_won">Thắng thầu</SelectItem>
                                    <SelectItem value="closed_lost">Thất bại</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Mô tả */}
                        <div className="space-y-2">
                            <Label htmlFor="description">Mô tả chi tiết</Label>
                            <Textarea
                                id="description"
                                placeholder="Ghi chú thêm về yêu cầu của khách hàng..."
                                className="min-h-[100px]"
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => router.back()}
                                disabled={loading}
                            >
                                Hủy bỏ
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Lưu cơ hội
                            </Button>
                        </div>

                    </form>
                </CardContent>
            </Card>
        </div>
    );
}