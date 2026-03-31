"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Building2, MapPin, Building, CreditCard } from "lucide-react";
import { toast } from "sonner";
import { getCompanySettings, saveCompanySettings } from "@/lib/action/settingActions";

export default function CompanySettingsPage() {
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    // State lưu trữ dữ liệu form
    const [formData, setFormData] = useState({
        name: "",
        tax_code: "",
        logo_url: "",
        address: "",
        hotline: "",
        email: "",
        website: "",
        representative_name: "",
        representative_title: "",
        bank_account: "",
        bank_name: "",
        geocode: "",
        attendance_radius: 150
    });

    // Lấy dữ liệu khi vừa vào trang
    useEffect(() => {
        async function loadData() {
            setIsLoading(true);
            const data = await getCompanySettings();
            if (data) {
                setFormData({
                    name: data.name || "",
                    tax_code: data.tax_code || "",
                    logo_url: data.logo_url || "",
                    address: data.address || "",
                    hotline: data.hotline || "",
                    email: data.email || "",
                    website: data.website || "",
                    representative_name: data.representative_name || "",
                    representative_title: data.representative_title || "",
                    bank_account: data.bank_account || "",
                    bank_name: data.bank_name || "",
                    geocode: data.geocode || "",
                    attendance_radius: data.attendance_radius || 150
                });
            }
            setIsLoading(false);
        }
        loadData();
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'attendance_radius' ? Number(value) : value
        }));
    };

    const handleSave = async () => {
        if (!formData.name) {
            toast.error("Tên công ty không được để trống!");
            return;
        }

        setIsSaving(true);
        const res = await saveCompanySettings(formData);

        if (res.success) {
            toast.success(res.message);
        } else {
            toast.error(res.error);
        }
        setIsSaving(false);
    };

    if (isLoading) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-5xl mx-auto">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Cấu hình Thông tin Doanh nghiệp</h1>
                    <p className="text-sm text-slate-500">Dữ liệu này sẽ được dùng cho Báo giá, Hợp đồng và hệ thống Chấm công GPS.</p>
                </div>
                <Button onClick={handleSave} disabled={isSaving} className="bg-blue-600 hover:bg-blue-700">
                    {isSaving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu Thay Đổi
                </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* CỘT 1: THÔNG TIN CHUNG & LIÊN HỆ */}
                <div className="space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50 border-b py-4">
                            <CardTitle className="text-base flex items-center text-slate-700">
                                <Building2 className="w-4 h-4 mr-2 text-blue-600" /> Thông tin cơ bản
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Tên Công Ty <span className="text-red-500">*</span></Label>
                                <Input name="name" value={formData.name} onChange={handleChange} placeholder="VD: Công ty TNHH Kiều Gia" className="font-medium" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Mã số thuế</Label>
                                    <Input name="tax_code" value={formData.tax_code} onChange={handleChange} placeholder="VD: 0312345678" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Link Logo (URL)</Label>
                                    <Input name="logo_url" value={formData.logo_url} onChange={handleChange} placeholder="https://..." />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Người đại diện pháp luật</Label>
                                    <Input name="representative_name" value={formData.representative_name} onChange={handleChange} placeholder="Họ và tên" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Chức danh</Label>
                                    <Input name="representative_title" value={formData.representative_title} onChange={handleChange} placeholder="VD: Giám đốc" />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50 border-b py-4">
                            <CardTitle className="text-base flex items-center text-slate-700">
                                <Building className="w-4 h-4 mr-2 text-indigo-600" /> Thông tin liên hệ
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Địa chỉ trụ sở</Label>
                                <Input name="address" value={formData.address} onChange={handleChange} placeholder="Số nhà, Đường, Quận..." />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Hotline / Điện thoại</Label>
                                    <Input name="hotline" value={formData.hotline} onChange={handleChange} placeholder="VD: 0918 265 365" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email liên hệ</Label>
                                    <Input name="email" value={formData.email} onChange={handleChange} placeholder="email@company.com" />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Website</Label>
                                <Input name="website" value={formData.website} onChange={handleChange} placeholder="https://www.kieugia-construction.biz.vn" />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CỘT 2: NGÂN HÀNG & CẤU HÌNH GPS CHẤM CÔNG */}
                <div className="space-y-6">
                    <Card className="shadow-sm border-slate-200">
                        <CardHeader className="bg-slate-50 border-b py-4">
                            <CardTitle className="text-base flex items-center text-slate-700">
                                <CreditCard className="w-4 h-4 mr-2 text-emerald-600" /> Thanh toán / Ngân hàng
                            </CardTitle>
                            <CardDescription>Dùng để in lên Báo giá / Phiếu thu</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4">
                            <div className="space-y-2">
                                <Label>Ngân hàng & Chi nhánh</Label>
                                <Input name="bank_name" value={formData.bank_name} onChange={handleChange} placeholder="VD: Vietcombank - CN Bình Dương" />
                            </div>
                            <div className="space-y-2">
                                <Label>Số tài khoản</Label>
                                <Input name="bank_account" value={formData.bank_account} onChange={handleChange} placeholder="VD: 10123456789" className="font-mono" />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="shadow-sm border-orange-200">
                        <CardHeader className="bg-orange-50 border-b border-orange-100 py-4">
                            <CardTitle className="text-base flex items-center text-orange-800">
                                <MapPin className="w-4 h-4 mr-2 text-orange-600" /> Tọa độ Trụ sở & Chấm công
                            </CardTitle>
                            <CardDescription className="text-orange-600/80">Khu vực nhân viên được phép Check-in GPS</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4 pt-4 bg-orange-50/30">
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <Label className="text-slate-800">Tọa độ GPS (Vĩ độ, Kinh độ) <span className="text-red-500">*</span></Label>
                                    <a href="https://maps.google.com" target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline">
                                        Mở Google Maps
                                    </a>
                                </div>
                                <Input
                                    name="geocode"
                                    value={formData.geocode}
                                    onChange={handleChange}
                                    placeholder="VD: 10.912345, 106.718901"
                                    className="font-mono bg-white border-orange-200 focus-visible:ring-orange-500"
                                />
                                <p className="text-xs text-slate-500">
                                    Mở bản đồ, click chuột phải vào vị trí công ty và copy dòng tọa độ đầu tiên dán vào đây.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-800">Bán kính cho phép (Mét) <span className="text-red-500">*</span></Label>
                                <div className="flex items-center gap-3">
                                    <Input
                                        type="number"
                                        name="attendance_radius"
                                        value={formData.attendance_radius}
                                        onChange={handleChange}
                                        className="w-32 bg-white border-orange-200 focus-visible:ring-orange-500"
                                        min="50"
                                        step="10"
                                    />
                                    <span className="text-sm text-slate-500">Khuyến nghị: 100 - 150 mét</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}