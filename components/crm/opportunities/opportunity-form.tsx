"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner"; // Hoặc use-toast tùy bạn

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { createOpportunityAction, updateOpportunityAction } from "@/lib/action/opportunity";

interface OpportunityFormProps {
    customerId?: string; // Dùng khi tạo mới từ trang khách hàng
    initialData?: any;   // Dùng khi sửa
    opportunityId?: string;
}

export function OpportunityForm({ customerId, initialData, opportunityId }: OpportunityFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Khởi tạo state từ dữ liệu cũ hoặc mặc định
    const [formData, setFormData] = useState({
        title: initialData?.title || "",
        value: initialData?.value || "",
        stage: initialData?.stage || "new",
        expected_close_date: initialData?.expected_close_date || "",
        description: initialData?.description || "",
        customer_id: initialData?.customer_id || customerId || "",
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            let res;
            if (opportunityId) {
                // Sửa
                res = await updateOpportunityAction(opportunityId, formData);
            } else {
                // Thêm mới
                res = await createOpportunityAction(formData);
            }

            if (res.success) {
                toast.success(opportunityId ? "Đã cập nhật cơ hội" : "Đã tạo cơ hội mới");
                router.back();
                router.refresh();
            } else {
                toast.error(res.error || "Có lỗi xảy ra");
            }
        } catch (error) {
            toast.error("Lỗi hệ thống");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Card>
            <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Tên cơ hội */}
                    <div className="space-y-2">
                        <Label>Tên cơ hội <span className="text-red-500">*</span></Label>
                        <Input
                            required
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Giá trị (VNĐ)</Label>
                            <Input
                                type="number"
                                min="0"
                                value={formData.value}
                                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Ngày dự kiến chốt</Label>
                            <Input
                                type="date"
                                value={formData.expected_close_date}
                                onChange={(e) => setFormData({ ...formData, expected_close_date: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Giai đoạn</Label>
                        <Select
                            value={formData.stage}
                            onValueChange={(val) => setFormData({ ...formData, stage: val })}
                        >
                            <SelectTrigger><SelectValue /></SelectTrigger>
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

                    <div className="space-y-2">
                        <Label>Mô tả</Label>
                        <Textarea
                            className="min-h-[100px]"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => router.back()}>Hủy</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Lưu lại
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}