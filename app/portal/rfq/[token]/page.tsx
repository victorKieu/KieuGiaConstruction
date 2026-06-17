"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { registerPublicSupplierAction, verifySupplierByTaxCode } from "@/lib/action/procurement";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Building2, Phone, Briefcase, FileText, Search, ShieldCheck, User } from "lucide-react";
import { toast } from "sonner";

export default function UnifiedRfqPortal() {
    const params = useParams();
    const router = useRouter();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [rfqInfo, setRfqInfo] = useState<{ title: string; deadline: string } | null>(null);

    // Quản lý Step: 1 (Nhập MST) -> 2 (Nhập thông tin mới)
    const [step, setStep] = useState<1 | 2>(1);
    const [taxCode, setTaxCode] = useState("");
    const [isChecking, setIsChecking] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        const initializePortal = async () => {
            const supabase = createClient();
            // Lấy info gói thầu từ Public Token
            const { data: rfq } = await supabase
                .from('rfqs')
                .select('title, deadline, status')
                .eq('public_token', token)
                .single();

            if (rfq && rfq.status !== 'completed') {
                setRfqInfo({ title: rfq.title, deadline: rfq.deadline });
            }
            setLoading(false);
        };
        initializePortal();
    }, [token]);

    // BƯỚC 1: Xử lý kiểm tra MST
    const handleCheckTaxCode = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!taxCode) return toast.warning("Vui lòng nhập Mã số thuế, nếu không có MST vui lòng nhập số điện thoại");

        setIsChecking(true);
        const res = await verifySupplierByTaxCode(token, taxCode);
        setIsChecking(false);

        if (res.error) {
            toast.error(res.error);
            return;
        }

        if (res.exists && res.privateToken) {
            toast.success("Xác thực thành công. Đang chuyển đến bảng giá!");
            router.push(`/portal/bid/${res.privateToken}`);
        } else {
            toast.info("Nhà cung cấp mới. Vui lòng bổ sung thông tin liên hệ.");
            setStep(2); // Chuyển sang bước điền full form
        }
    };

    // BƯỚC 2: Xử lý đăng ký mới
    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        const data = {
            name: formData.get("name") as string,
            contact_person: formData.get("contact_person") as string, // THÊM MỚI
            phone: formData.get("phone") as string,
            tax_code: taxCode,
            email: formData.get("email") as string,
        };

        const res = await registerPublicSupplierAction(token, data);
        if (res.success && res.privateToken) {
            toast.success("Đăng ký thành công!");
            router.push(`/portal/bid/${res.privateToken}`);
        } else {
            toast.error("Lỗi: " + (res.error || "Không thể đăng ký"));
            setIsSubmitting(false);
        }
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600" /></div>;

    if (!rfqInfo) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full p-8 text-center border-red-100 shadow-lg bg-white">
                    <FileText className="w-16 h-16 text-red-400 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Đường dẫn không hợp lệ</h2>
                    <p className="text-slate-500">Gói thầu này không tồn tại hoặc đã chốt xong.</p>
                </Card>
            </div>
        );
    }

    return (
        // Đã xóa toàn bộ dark: classes, fix cứng nền sáng
        <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4 font-sans text-slate-900">
            <Card className="max-w-lg w-full p-6 md:p-8 shadow-xl border-t-4 border-t-indigo-600 bg-white rounded-xl">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-50 text-indigo-600 rounded-2xl mb-4 shadow-inner">
                        <Briefcase className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-extrabold text-slate-800 mb-2">Cổng Chào Giá Vật Tư</h1>
                    <p className="text-slate-600 font-medium">Kieu Gia Construction</p>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-4 mb-6">
                    <p className="text-xs text-indigo-500 font-semibold uppercase tracking-wider mb-1">Gói thầu đang mở</p>
                    <p className="font-bold text-indigo-900">{rfqInfo.title}</p>
                </div>

                {step === 1 ? (
                    <form onSubmit={handleCheckTaxCode} className="space-y-4">
                        <div className="space-y-1.5">
                            <Label className="text-slate-700 font-semibold">Vui lòng nhập Mã số thuế hoặc số điện thoại để bắt đầu</Label>
                            <div className="relative">
                                <Search className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                <Input
                                    value={taxCode}
                                    onChange={(e) => setTaxCode(e.target.value)}
                                    required
                                    placeholder="Ví dụ: 031xxxxxxx"
                                    className="pl-10 h-12 bg-slate-50 text-slate-900 text-base placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                        <Button type="submit" disabled={isChecking} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold mt-4">
                            {isChecking ? <Loader2 className="animate-spin mr-2" /> : "Kiểm tra dữ liệu"}
                        </Button>
                    </form>
                ) : (
                        <form onSubmit={handleRegister} className="space-y-4 animate-in fade-in zoom-in duration-300">
                            <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm mb-4 border border-green-200 flex items-start gap-2">
                                <ShieldCheck className="w-5 h-5 shrink-0" />
                                <p>Mã số thuế <strong>{taxCode}</strong> chưa có trong hệ thống. Vui lòng cung cấp thêm thông tin để nhận bảng khối lượng.</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-slate-700 font-semibold">Tên Doanh nghiệp / Cửa hàng <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <Building2 className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <Input name="name" required placeholder="VD: Vật liệu xây dựng ABC..." className="pl-10 h-11 bg-slate-50 text-slate-900 placeholder:text-slate-400" />
                                </div>
                            </div>

                            {/* THÊM MỚI: TRƯỜNG NGƯỜI LIÊN HỆ */}
                            <div className="space-y-1.5">
                                <Label className="text-slate-700 font-semibold">Người liên hệ <span className="text-red-500">*</span></Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                    <Input name="contact_person" required placeholder="Họ và tên người phụ trách báo giá..." className="pl-10 h-11 bg-slate-50 text-slate-900 placeholder:text-slate-400" />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <Label className="text-slate-700 font-semibold">Số điện thoại liên hệ <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 w-5 h-5 text-slate-400" />
                                        <Input name="phone" required placeholder="0909 xxx xxx" className="pl-10 h-11 bg-slate-50 text-slate-900 placeholder:text-slate-400" />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-slate-700 font-semibold">Email (Tùy chọn)</Label>
                                    <Input name="email" type="email" placeholder="email@congty.com" className="h-11 bg-slate-50 text-slate-900 placeholder:text-slate-400" />
                                </div>
                            </div>

                            <Button type="submit" disabled={isSubmitting} className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white text-base font-bold mt-6 shadow-md">
                                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : "Truy cập bảng nhập giá"}
                            </Button>
                        </form>
                )}
            </Card>
        </div>
    );
}