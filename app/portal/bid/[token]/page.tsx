"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams } from "next/navigation";
import { getBidDataByToken, submitBidAction } from "@/lib/action/procurement";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, Building2, Clock, Send, CheckCircle2, MapPin, Navigation, Info } from "lucide-react";
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

    useEffect(() => {
        const fetchData = async () => {
            const res = await getBidDataByToken(token);
            if (res.success && res.data) {
                setData(res.data);
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
        setIsSubmitting(true);
        const bids = data.items.map((item: any) => ({
            rfq_item_id: item.id, unit_price: prices[item.id] || 0, delivery_time_days: 0
        }));
        const payload = { rfq_id: data.rfq.id, supplier_id: data.supplier.id, bids: bids };
        const res = await submitBidAction(payload);
        if (res.success) {
            toast.success("Đã gửi báo giá thành công!");
            setIsSuccess(true);
        } else {
            toast.error("Lỗi khi nộp báo giá: " + res.error);
        }
        setIsSubmitting(false);
    };

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;
    if (error) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="max-w-md w-full p-8 text-center shadow-lg border-red-200 bg-white">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Không thể truy cập</h2>
                <p className="text-slate-500">{error}</p>
            </Card>
        </div>
    );
    if (isSuccess) return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="max-w-md w-full p-8 text-center shadow-xl border-t-4 border-t-green-500 bg-white">
                <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6"><CheckCircle2 className="w-10 h-10" /></div>
                <h2 className="text-2xl font-bold text-slate-800 mb-3">Báo giá đã được ghi nhận!</h2>
                <p className="text-slate-600 mb-6">Cảm ơn <strong>{data.supplier.name}</strong> đã gửi báo giá cho dự án.</p>
            </Card>
        </div>
    );
    if (data?.rfq?.status === 'completed') return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <Card className="max-w-md w-full p-8 text-center shadow-lg border-slate-200 bg-white">
                <CheckCircle2 className="w-16 h-16 text-slate-400 mx-auto mb-4" />
                <h2 className="text-xl font-bold text-slate-800 mb-2">Gói thầu đã kết thúc</h2>
                <p className="text-slate-500">Cảm ơn bạn đã quan tâm. Gói thầu này đã hoàn tất quá trình chọn lựa nhà cung cấp.</p>
            </Card>
        </div>
    );

    const isPastDeadline = new Date() > new Date(data?.rfq?.deadline);
    const hasSubmittedBid = data?.existingBids && data?.existingBids.length > 0;
    if (isPastDeadline && !hasSubmittedBid) return (
        <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans">
            <Card className="border-red-200 bg-red-50 max-w-md mx-auto">
                <CardContent className="p-6 text-center text-red-600 font-bold mt-4">
                    <Clock className="w-12 h-12 text-red-500 mx-auto mb-3" />
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

    return (
        <div className="min-h-screen bg-slate-50 pb-28 md:pb-24 font-sans text-slate-900 transition-colors duration-500">
            <div className="max-w-7xl mx-auto space-y-6 p-4 md:p-8">
                <div className="flex flex-col md:flex-row items-center justify-between border-b pb-6 gap-4">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-md"><Building2 className="w-6 h-6" /></div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Cổng Nhập Giá Kín (Private RFQ)</h1>
                            <p className="text-sm text-slate-500">Kính chào: <span className="font-semibold text-slate-700">{data.supplier.name}</span></p>
                        </div>
                    </div>
                    <Badge className="bg-indigo-500 text-white animate-pulse px-3 py-1 border-none shadow-sm">Đang mở báo giá</Badge>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                    <div className="lg:col-span-1">
                        <Card className="border-slate-200 shadow-sm bg-white">
                            <CardHeader className="pb-3 border-b border-slate-100">
                                <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-indigo-500" /> Yêu cầu giao hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 space-y-4 text-sm">
                                <div>
                                    <span className="text-xs text-slate-400 block mb-0.5">Địa chỉ Dự án / Gói thầu</span>
                                    <p className="font-bold text-slate-800 text-base">{data.rfq.title}</p>

                                    {/* THÔNG MINH BÁO LỖI NẾU THIẾU PROJECT INFO */}
                                    {projectInfo?.address ? (
                                        <p className="font-medium text-indigo-600 text-sm mt-1 flex items-start gap-1">
                                            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
                                            {projectInfo.address}
                                        </p>
                                    ) : (
                                        <div className="mt-2 p-2 bg-red-50 text-red-600 text-[11px] rounded border border-red-100 leading-tight">
                                            <strong>Chưa lấy được địa chỉ:</strong><br />
                                            {data.rfq.project_id
                                                ? "Bị chặn quyền đọc (RLS) bảng Dự án."
                                                : "Gói thầu này cũ, chưa có ID Dự án. Bạn hãy tạo Gói thầu MỚI để test."}
                                        </div>
                                    )}
                                </div>

                                {projectInfo?.address && (
                                    <a href={mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-sm rounded-xl transition-all border border-indigo-200 shadow-sm">
                                        <Navigation className="w-4 h-4" /> Xem bản đồ thi công
                                    </a>
                                )}

                                <div className="flex items-center gap-3 bg-orange-50 p-3 rounded-xl border border-orange-100">
                                    <Clock className="w-5 h-5 text-orange-500 shrink-0" />
                                    <div>
                                        <span className="text-xs font-bold text-orange-800 uppercase block mb-0.5">Hạn chót báo giá</span>
                                        <p className="font-bold text-orange-600">{formatVNDate(data.rfq.deadline)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                        <div className="mt-4 bg-amber-50 text-amber-800 p-4 rounded-xl text-sm border border-amber-200 font-medium shadow-sm">
                            <span className="flex items-center gap-2 text-amber-600 font-bold mb-1"><AlertCircle className="w-4 h-4" /> LƯU Ý QUAN TRỌNG:</span>
                            Tất cả đơn giá quý vị nhập phải là giá <strong>CHƯA BAO GỒM THUẾ VAT</strong>. Các mặt hàng không cung cấp hãy để trống hoặc nhập 0.
                        </div>
                    </div>

                    <div className="lg:col-span-2 space-y-4">
                        {data.items.map((item: any, index: number) => {
                            const price = prices[item.id] || 0;
                            const total = price * Number(item.purchase_quantity);
                            return (
                                <Card key={item.id} className="p-4 shadow-sm border-slate-200 bg-white overflow-hidden transition-all hover:border-indigo-200">
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-start gap-3 mb-3">
                                                <span className="flex items-center justify-center bg-slate-100 text-slate-500 w-7 h-7 rounded-md text-xs font-bold shrink-0">{index + 1}</span>
                                                <div>
                                                    <h3 className="font-bold text-slate-800 text-base">{item.item_name || item.material_name}</h3>
                                                    <div className="flex items-center gap-4 text-sm text-slate-600 mt-2">
                                                        <span className="bg-slate-100 px-2.5 py-1 rounded-md">ĐVT: <strong>{item.purchase_unit}</strong></span>
                                                        <span>Số lượng: <strong className="text-indigo-600 text-base">{Number(item.purchase_quantity).toLocaleString()}</strong></span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="sm:w-64 bg-slate-50 p-3.5 rounded-xl border border-slate-200/60">
                                            <label className="block text-xs font-bold text-slate-500 mb-2 uppercase tracking-wider">Nhập Đơn giá (VNĐ)</label>
                                            <Input type="text" inputMode="numeric" placeholder="0" className="text-right font-bold text-lg h-12 bg-white border-indigo-200 focus:border-indigo-500 text-slate-900 placeholder:text-slate-300 shadow-inner" value={price === 0 ? "" : price.toLocaleString('en-US')} onChange={(e) => handlePriceChange(item.id, e.target.value)} />
                                            <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-200 border-dashed">
                                                <span className="text-xs font-semibold text-slate-500">Thành tiền:</span>
                                                <span className="font-bold text-sm text-slate-800">{total > 0 ? formatCurrency(total) : "-"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 shadow-[0_-10px_15px_-3px_rgba(0,0,0,0.05)] z-50">
                <div className="max-w-7xl mx-auto p-4 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="w-full md:w-auto flex items-center justify-between md:justify-start gap-8">
                        <div>
                            <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1">Tổng giá trị chào thầu</p>
                            <p className="text-2xl font-black text-emerald-600">{formatCurrency(grandTotal)}</p>
                        </div>
                    </div>
                    <Button size="lg" onClick={handleSubmit} disabled={isSubmitting || grandTotal === 0} className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 md:px-12 shadow-md rounded-xl text-base">
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />} Gửi Báo Giá Xác Nhận
                    </Button>
                </div>
            </div>
        </div>
    );
}