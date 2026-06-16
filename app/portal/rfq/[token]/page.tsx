"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerPublicSupplierAction } from "@/lib/action/procurement"; // Đảm bảo đúng path
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Phone, Briefcase, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PublicRfqPortal() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [rfqInfo, setRfqInfo] = useState<{ title: string; deadline: string } | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const checkToken = async () => {
            const supabase = createClient();

            // 1. Kiểm tra xem đây có phải là Token của bảng rfq_suppliers (Private Link) không?
            const { data: inv, error: invError } = await supabase
                .from('rfq_suppliers')
                .select('token')
                .eq('token', token)
                .single();

            if (inv) {
                // ĐÂY LÀ LINK RIÊNG: Đẩy thẳng vào bảng giá
                router.replace(`/portal/bid/${token}`);
                return;
            }

            // 2. Nếu không phải Link Riêng, mới tiến hành load Form Đăng Ký (Public Link)
            const { data: rfq, error: rfqError } = await supabase
                .from('rfqs')
                .select('title, deadline, status')
                .eq('public_token', token) // Dùng cột public_token
                .single();

            if (rfq && rfq.status === 'published') {
                setRfqInfo({ title: rfq.title, deadline: rfq.deadline });
            } else {
                // Không tìm thấy gì cả -> Link hỏng
                setRfqInfo(null);
            }
            setLoading(false);
        };

        checkToken();
    }, [token, router]);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name") as string,
            phone: formData.get("phone") as string,
            tax_code: formData.get("tax_code") as string,
            email: formData.get("email") as string,
        };

        const res = await registerPublicSupplierAction(token, data);

        if (res.success && res.privateToken) {
            toast.success("Xác thực thành công!");
            router.push(`/portal/bid/${res.privateToken}`);
        } else {
            toast.error("Lỗi: " + (res.error || "Không thể đăng ký"));
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

    // Nếu không có rfqInfo, hiện thông báo lỗi
    if (!rfqInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full p-8 text-center border-red-100 shadow-lg">
                    <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Đường dẫn không hợp lệ</h2>
                    <p className="text-slate-500">Gói thầu này không tồn tại hoặc đã đóng.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
            <Card className="max-w-lg w-full p-6 md:p-8 shadow-xl border-t-4 border-t-indigo-600 bg-white rounded-xl">
                {/* ... (Giữ nguyên phần form bên dưới của bạn) ... */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Cổng Chào Giá Vật Tư</h1>
                    <p className="text-slate-600 font-medium">Kieu Gia Construction</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
                    <p className="font-bold text-indigo-900">{rfqInfo.title}</p>
                    <p className="text-sm text-amber-700 mt-2">Hạn nộp: {new Date(rfqInfo.deadline).toLocaleString('vi-VN')}</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Các Input của anh ... */}
                    <div className="space-y-1.5">
                        <Label>Tên Doanh nghiệp <span className="text-red-500">*</span></Label>
                        <Input name="name" required placeholder="VD: VLXD ABC..." />
                    </div>
                    <div className="space-y-1.5">
                        <Label>SĐT liên hệ <span className="text-red-500">*</span></Label>
                        <Input name="phone" required placeholder="0909xxxxxx" />
                    </div>
                    <Button type="submit" disabled={isSubmitting} className="w-full mt-4 bg-indigo-600">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : "Truy cập bảng nhập giá"}
                    </Button>
                </form>
            </Card>
        </div>
    );
}