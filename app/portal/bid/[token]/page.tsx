"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { getBidDataByToken, submitBidAction } from "@/lib/action/procurement";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Building2, Clock, Send, CheckCircle2, MapPin, Navigation, Info, Landmark, Map } from "lucide-react";
import { toast } from "sonner";
import { generateGoogleMapsDirLink } from "@/lib/utils/gmaps";
import { formatVNDate } from "@/lib/utils/date";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export default function BidEntryPortal() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    const [prices, setPrices] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isLocating, setIsLocating] = useState(false);

    // State lưu trữ thông tin NCC (Bao gồm cả Tên tài khoản - bank_account_name)
    const [supplierInfo, setSupplierInfo] = useState({
        name: "", tax_code: "", phone: "", email: "", address: "",
        contact_person: "", bank_account: "", bank_name: "", bank_account_name: "",
        latitude: null as number | null, longitude: null as number | null
    });

    useEffect(() => {
        const fetchData = async () => {
            const res = await getBidDataByToken(token);
            if (res.success && res.data) {
                setData(res.data);

                const sup = res.data.supplier;
                if (sup) {
                    setSupplierInfo({
                        name: sup.name || "",
                        tax_code: sup.tax_code || "",
                        phone: sup.phone || "",
                        email: sup.email || "",
                        address: sup.address || "",
                        contact_person: sup.contact_person || "",
                        bank_account: sup.bank_account || "",
                        bank_name: sup.bank_name || "",
                        bank_account_name: sup.bank_account_name || "",
                        latitude: sup.latitude || null,
                        longitude: sup.longitude || null,
                    });
                }

                const initialPrices: Record<string, number> = {};
                if (res.data.existingBids && res.data.existingBids.length > 0) {
                    res.data.existingBids.forEach((bid: any) => {
                        initialPrices[bid.rfq_item_id] = Number(bid.unit_price);
                    });
                }
                setPrices(initialPrices);
            } else {
                setError(res.error || "Có lỗi xảy ra");
            }
            setLoading(false);
        };
        fetchData();
    }, [token]);

    useEffect(() => {
        const markAsViewed = async () => {
            const { createClient } = await import("@/lib/supabase/client");
            const supabase = createClient();
            await supabase.from('rfq_suppliers').update({ status: 'viewed' }).eq('token', token).eq('status', 'pending');
        };
        if (token) markAsViewed();
    }, [token]);

    const handleGetLocation = () => {
        setIsLocating(true);
        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setSupplierInfo(prev => ({
                        ...prev,
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude
                    }));
                    toast.success("Đã lấy tọa độ vị trí thành công!");
                    setIsLocating(false);
                },
                (error) => {
                    toast.error("Không thể lấy vị trí. Vui lòng cấp quyền truy cập định vị cho trình duyệt.");
                    setIsLocating(false);
                },
                { enableHighAccuracy: true, timeout: 10000 }
            );
        } else {
            toast.error("Trình duyệt của bạn không hỗ trợ định vị GPS.");
            setIsLocating(false);
        }
    };

    const handleSupplierChange = (field: string, value: string) => {
        setSupplierInfo(prev => ({ ...prev, [field]: value }));
    };

    const handlePriceChange = (itemId: string, value: string) => {
        const numValue = parseInt(value.replace(/[^0-9]/g, "")) || 0;
        setPrices(prev => ({ ...prev, [itemId]: numValue }));
    };

    const grandTotal = useMemo(() => {
        if (!data) return 0;
        return data.items.reduce((sum: number, item: any) => {
            const price = prices[item.id] || 0;
            return sum + (price * Number(item.purchase_quantity));
        }, 0);
    }, [prices, data]);

    const handleSubmit = async () => {
        if (grandTotal === 0) return toast.warning("Vui lòng nhập đơn giá ít nhất 1 sản phẩm trước khi gửi!");
        if (!supplierInfo.name || !supplierInfo.phone) return toast.warning("Vui lòng kiểm tra lại Tên doanh nghiệp và Số điện thoại!");

        setIsSubmitting(true);
        const bids = data.items.map((item: any) => ({
            rfq_item_id: item.id, unit_price: prices[item.id] || 0, delivery_time_days: 0
        }));

        const payload = {
            rfq_id: data.rfq.id,
            supplier_id: data.supplier.id,
            bids: bids,
            // ✅ ĐÃ FIX TS ERROR: Ép kiểu latitude và longitude sang string | undefined
            profileData: {
                ...supplierInfo,
                latitude: supplierInfo.latitude !== null ? String(supplierInfo.latitude) : undefined,
                longitude: supplierInfo.longitude !== null ? String(supplierInfo.longitude) : undefined,
            }
        };

        const res = await submitBidAction(payload);
        if (res.success) {
            toast.success("Đã gửi báo giá thành công!");
            setIsSuccess(true);
        } else {
            toast.error("Lỗi khi nộp báo giá: " + res.error);
        }
        setIsSubmitting(false);
    };

    if (loading) return <div className="flex min-h-screen items-center justify-center bg-slate-50"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    if (error) return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-red-200 bg-white p-8 text-center shadow-lg">
                <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
                <h2 className="mb-2 text-xl font-bold text-slate-800">Không thể truy cập</h2>
                <p className="text-slate-500">{error}</p>
            </Card>
        </div>
    );
    if (isSuccess) return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-t-4 border-t-green-500 bg-white p-8 text-center shadow-xl">
                <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600"><CheckCircle2 className="h-10 w-10" /></div>
                <h2 className="mb-3 text-2xl font-bold text-slate-800">Báo giá đã được ghi nhận!</h2>
                <p className="mb-6 text-slate-600">Cảm ơn <strong>{supplierInfo.name}</strong> đã gửi báo giá cho dự án.</p>
            </Card>
        </div>
    );
    if (data?.rfq?.status === 'completed') return (
        <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
            <Card className="w-full max-w-md border-slate-200 bg-white p-8 text-center shadow-lg">
                <CheckCircle2 className="mx-auto mb-4 h-16 w-16 text-slate-400" />
                <h2 className="mb-2 text-xl font-bold text-slate-800">Gói thầu đã kết thúc</h2>
                <p className="text-slate-500">Cảm ơn bạn đã quan tâm. Gói thầu này đã hoàn tất quá trình chọn lựa nhà cung cấp.</p>
            </Card>
        </div>
    );

    const isPastDeadline = new Date() > new Date(data?.rfq?.deadline);
    const hasSubmittedBid = data?.existingBids && data?.existingBids.length > 0;
    if (isPastDeadline && !hasSubmittedBid) return (
        <div className="min-h-screen bg-slate-50 p-4 font-sans md:p-8">
            <Card className="mx-auto max-w-md border-red-200 bg-red-50">
                <CardContent className="mt-4 p-6 text-center font-bold text-red-600">
                    <Clock className="mx-auto mb-3 h-12 w-12 text-red-500" />
                    Đã hết hạn nộp thầu
                </CardContent>
            </Card>
        </div>
    );

    const projectInfo = data?.rfq?.project;
    const projectAddress = projectInfo?.address;
    const mapLink = generateGoogleMapsDirLink({
        address: projectAddress || projectInfo?.name,
        geocode: projectInfo?.geocode
    });

    // Toàn bộ các class bên dưới đã được dọn sạch tiền tố `dark:` để cố định ở Light Mode
    return (
        <div className="min-h-screen bg-slate-50 pb-32 font-sans text-slate-900 transition-colors duration-500 md:pb-24">
            <div className="mx-auto max-w-7xl space-y-6 p-4 md:p-8">
                <div className="flex flex-col items-center justify-between gap-4 border-b border-slate-200 pb-6 md:flex-row">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md"><Building2 className="h-6 w-6" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Cổng Nhập Giá Kín (Private RFQ)</h1>
                            <p className="text-sm text-slate-500">Kính chào: <span className="font-semibold text-slate-700">{data.supplier.name}</span></p>
                        </div>
                    </div>
                    <Badge className="animate-pulse border-none bg-indigo-500 px-3 py-1 text-white shadow-sm">Đang mở báo giá</Badge>
                </div>

                <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">

                    {/* CỘT TRÁI: THÔNG TIN DỰ ÁN & FORM CẬP NHẬT DOANH NGHIỆP */}
                    <div className="space-y-6 lg:col-span-1">
                        <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader className="border-b border-slate-100 pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-400 uppercase">
                                    <Info className="h-4 w-4 text-indigo-500" /> Yêu cầu giao hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 text-sm">
                                <div>
                                    <span className="mb-0.5 block text-xs text-slate-400">Địa chỉ Dự án / Gói thầu</span>
                                    <p className="text-base font-bold text-slate-800">{data.rfq.title}</p>
                                    {projectInfo?.address && (
                                        <p className="mt-1 flex items-start gap-1 text-sm font-medium text-indigo-600">
                                            <MapPin className="mt-0.5 h-4 w-4 shrink-0" /> {projectInfo.address}
                                        </p>
                                    )}
                                </div>
                                {projectInfo?.address && (
                                    <a href={mapLink} target="_blank" rel="noopener noreferrer" className="flex w-full items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 py-3 text-sm font-bold text-indigo-600 shadow-sm transition-all hover:bg-indigo-100">
                                        <Navigation className="h-4 w-4" /> Xem bản đồ thi công
                                    </a>
                                )}
                                <div className="flex items-center gap-3 rounded-xl border border-orange-100 bg-orange-50 p-3">
                                    <Clock className="h-5 w-5 shrink-0 text-orange-500" />
                                    <div>
                                        <span className="mb-0.5 block text-xs font-bold text-orange-800 uppercase">Hạn chót báo giá</span>
                                        <p className="font-bold text-orange-600">{formatVNDate(data.rfq.deadline)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-slate-200 bg-white shadow-sm">
                            <CardHeader className="border-b border-slate-100 bg-slate-50/50 pb-3">
                                <CardTitle className="flex items-center gap-2 text-sm font-bold tracking-wider text-slate-700 uppercase">
                                    <Building2 className="h-4 w-4 text-blue-600" /> Xác nhận thông tin NCC
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4 p-4 text-sm">
                                <div className="space-y-3">
                                    <div><Label className="text-xs text-slate-500">Tên Doanh Nghiệp <span className="text-red-500">*</span></Label><Input value={supplierInfo.name} onChange={e => handleSupplierChange('name', e.target.value)} className="h-9 mt-1 bg-white text-slate-900 border-slate-200" /></div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><Label className="text-xs text-slate-500">Mã số thuế</Label><Input value={supplierInfo.tax_code} onChange={e => handleSupplierChange('tax_code', e.target.value)} className="h-9 mt-1 bg-white text-slate-900 border-slate-200" /></div>
                                        <div><Label className="text-xs text-slate-500">Điện thoại <span className="text-red-500">*</span></Label><Input value={supplierInfo.phone} onChange={e => handleSupplierChange('phone', e.target.value)} className="h-9 mt-1 bg-white text-slate-900 border-slate-200" /></div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div><Label className="text-xs text-slate-500">Người đại diện</Label><Input value={supplierInfo.contact_person} onChange={e => handleSupplierChange('contact_person', e.target.value)} className="h-9 mt-1 bg-white text-slate-900 border-slate-200" /></div>
                                        <div><Label className="text-xs text-slate-500">Email</Label><Input type="email" value={supplierInfo.email} onChange={e => handleSupplierChange('email', e.target.value)} className="h-9 mt-1 bg-white text-slate-900 border-slate-200" /></div>
                                    </div>
                                    <div><Label className="text-xs text-slate-500">Địa chỉ kinh doanh</Label><Input value={supplierInfo.address} onChange={e => handleSupplierChange('address', e.target.value)} className="h-9 mt-1 bg-white text-slate-900 border-slate-200" /></div>

                                    <div className="border-t border-slate-100 pt-3">
                                        <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-500"><Landmark className="h-3.5 w-3.5" /> Kế toán / Hóa đơn</h4>
                                        <div className="grid grid-cols-1 gap-3">
                                            <div><Label className="text-xs text-slate-500">Ngân hàng</Label><Input placeholder="VD: Vietcombank" value={supplierInfo.bank_name} onChange={e => handleSupplierChange('bank_name', e.target.value)} className="h-9 mt-1 bg-white text-slate-900 border-slate-200" /></div>
                                            <div><Label className="text-xs text-slate-500">Số tài khoản</Label><Input value={supplierInfo.bank_account} onChange={e => handleSupplierChange('bank_account', e.target.value)} className="h-9 mt-1 bg-white text-slate-900 border-slate-200" /></div>
                                            <div><Label className="text-xs text-slate-500">Tên tài khoản</Label><Input placeholder="VD: CONG TY TNHH ABC" value={supplierInfo.bank_account_name} onChange={e => handleSupplierChange('bank_account_name', e.target.value)} className="h-9 mt-1 uppercase bg-white text-slate-900 border-slate-200" /></div>
                                        </div>
                                    </div>

                                    <div className="border-t border-slate-100 pt-3">
                                        <h4 className="mb-2 flex items-center gap-1 text-xs font-bold text-slate-500"><Map className="h-3.5 w-3.5" /> Tọa độ GPS Nhà cung cấp</h4>
                                        {supplierInfo.latitude && supplierInfo.longitude ? (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex items-center justify-between rounded-lg border border-emerald-100 bg-emerald-50 p-2.5">
                                                    <div className="flex items-center gap-2">
                                                        <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
                                                        <div>
                                                            <p className="text-xs font-bold text-emerald-800">Đã cập nhật tọa độ</p>
                                                            <p className="font-mono text-[10px] text-emerald-600">
                                                                {supplierInfo.latitude.toFixed(6)}, {supplierInfo.longitude.toFixed(6)}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <Button type="button" variant="outline" size="sm" onClick={handleGetLocation} disabled={isLocating} className="h-8 border-emerald-200 bg-white px-2 text-[11px] text-emerald-700 hover:bg-emerald-100">
                                                        {isLocating ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <MapPin className="mr-1 h-3 w-3" />}
                                                        Cập nhật lại
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col gap-2">
                                                <div className="flex flex-col gap-2 rounded-lg border border-amber-100 bg-amber-50 p-3">
                                                    <div className="flex gap-2">
                                                        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                                                        <p className="text-xs text-amber-800">Hệ thống chưa có tọa độ vị trí của bạn để tiện cho việc giao nhận sau này.</p>
                                                    </div>
                                                    <Button type="button" onClick={handleGetLocation} disabled={isLocating} className="h-9 w-full bg-blue-600 text-xs text-white shadow-sm hover:bg-blue-700">
                                                        {isLocating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MapPin className="mr-2 h-4 w-4" />}
                                                        Bấm để cấp quyền lấy tọa độ hiện tại
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="hidden rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 shadow-sm lg:block">
                            <span className="mb-1 flex items-center gap-2 font-bold text-amber-600"><AlertCircle className="h-4 w-4" /> LƯU Ý:</span>
                            Đơn giá nhập phải là giá <strong>CHƯA BAO GỒM VAT</strong>. Các mặt hàng không cung cấp hãy để trống.
                        </div>
                    </div>

                    {/* CỘT PHẢI: BẢNG NHẬP GIÁ */}
                    <div className="space-y-4 lg:col-span-2">
                        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800 shadow-sm lg:hidden">
                            <span className="mb-1 flex items-center gap-2 font-bold text-amber-600"><AlertCircle className="h-4 w-4" /> LƯU Ý:</span>
                            Đơn giá nhập phải là giá <strong>CHƯA BAO GỒM VAT</strong>. Các mặt hàng không cung cấp hãy để trống.
                        </div>

                        {data.items.map((item: any, index: number) => {
                            const price = prices[item.id] || 0;
                            const total = price * Number(item.purchase_quantity);
                            return (
                                <Card key={item.id} className="overflow-hidden border-slate-200 bg-white p-4 shadow-sm transition-all hover:border-indigo-200">
                                    <div className="flex flex-col gap-4 sm:flex-row">
                                        <div className="flex-1">
                                            <div className="mb-3 flex items-start gap-3">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-500">{index + 1}</span>
                                                <div>
                                                    <h3 className="text-base font-bold text-slate-800">{item.item_name || item.material_name}</h3>
                                                    <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                                                        <span className="rounded-md bg-slate-100 px-2.5 py-1">ĐVT: <strong>{item.purchase_unit}</strong></span>
                                                        <span>Số lượng: <strong className="text-base text-indigo-600">{Number(item.purchase_quantity).toLocaleString()}</strong></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="rounded-xl border border-slate-200/60 bg-slate-50 p-3.5 sm:w-64">
                                            <label className="mb-2 block text-xs font-bold tracking-wider text-slate-500 uppercase">Nhập Đơn giá (VNĐ)</label>
                                            <Input type="text" inputMode="numeric" placeholder="0" className="h-12 border-indigo-200 bg-white text-right text-lg font-bold text-slate-900 shadow-inner placeholder:text-slate-300 focus:border-indigo-500" value={price === 0 ? "" : price.toLocaleString('en-US')} onChange={(e) => handlePriceChange(item.id, e.target.value)} />
                                            <div className="mt-3 flex items-center justify-between border-t border-dashed border-slate-200 pt-3">
                                                <span className="text-xs font-semibold text-slate-500">Thành tiền:</span>
                                                <span className="text-sm font-bold text-slate-800">{total > 0 ? formatCurrency(total) : "-"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 z-50 w-full border-t border-slate-200 bg-white shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)]">
                <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 p-4 md:flex-row md:px-8">
                    <div className="flex w-full items-center justify-between gap-8 md:w-auto md:justify-start">
                        <div>
                            <p className="mb-1 text-xs font-bold tracking-wider text-slate-500 uppercase">Tổng giá trị chào thầu</p>
                            <p className="text-2xl font-black text-emerald-600">{formatCurrency(grandTotal)}</p>
                        </div>
                    </div>
                    <Button size="lg" onClick={handleSubmit} disabled={isSubmitting || grandTotal === 0} className="h-12 w-full rounded-xl bg-emerald-600 text-base font-bold text-white shadow-md hover:bg-emerald-700 md:w-auto md:px-12">
                        {isSubmitting ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />} Gửi Báo Giá Xác Nhận
                    </Button>
                </div>
            </div>
        </div>
    );
}