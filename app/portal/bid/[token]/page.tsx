"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { getBidDataByToken, submitBidAction } from "@/lib/action/procurement"; // Cập nhật đường dẫn action
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, FileCheck2, AlertCircle, Building2, Clock, Send, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

// Hàm format tiền tệ
const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

export default function BidEntryPortal() {
    const params = useParams();
    const token = params.token as string;

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<any>(null);

    // State lưu giá trị nhập vào: { [rfq_item_id]: unit_price }
    const [prices, setPrices] = useState<Record<string, number>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            const res = await getBidDataByToken(token);
            if (res.success && res.data) {
                setData(res.data);

                // Nạp giá cũ nếu đã từng báo giá
                const initialPrices: Record<string, number> = {};
                if (res.data.existingBids.length > 0) {
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

    const handlePriceChange = (itemId: string, value: string) => {
        // Chỉ cho phép nhập số
        const numValue = parseInt(value.replace(/[^0-9]/g, "")) || 0;
        setPrices(prev => ({ ...prev, [itemId]: numValue }));
    };

    // Tính tổng giá trị gói thầu dựa trên những gì NCC đã nhập
    const grandTotal = useMemo(() => {
        if (!data) return 0;
        return data.items.reduce((sum: number, item: any) => {
            const price = prices[item.id] || 0;
            return sum + (price * Number(item.purchase_quantity));
        }, 0);
    }, [prices, data]);

    const handleSubmit = async () => {
        if (grandTotal === 0) {
            toast.warning("Vui lòng nhập đơn giá ít nhất 1 sản phẩm trước khi gửi!");
            return;
        }

        setIsSubmitting(true);

        // Chuẩn bị payload theo đúng format của hàm submitBidAction anh viết
        const bids = data.items.map((item: any) => ({
            rfq_item_id: item.id,
            unit_price: prices[item.id] || 0,
            delivery_time_days: 0 // Có thể mở rộng input này sau nếu cần
        }));

        const payload = {
            rfq_id: data.rfq.id,
            supplier_id: data.supplier.id,
            bids: bids
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

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full p-8 text-center shadow-lg border-red-200">
                    <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Không thể truy cập</h2>
                    <p className="text-slate-500">{error}</p>
                </Card>
            </div>
        );
    }

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                <Card className="max-w-md w-full p-8 text-center shadow-xl border-t-4 border-t-green-500">
                    <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle2 className="w-10 h-10" />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-3">Báo giá đã được ghi nhận!</h2>
                    <p className="text-slate-600 mb-6">Cảm ơn <strong>{data.supplier.name}</strong> đã gửi báo giá cho dự án. Kieu Gia Construction sẽ liên hệ lại trong thời gian sớm nhất.</p>
                    <p className="text-sm text-slate-400">Bạn có thể đóng tab này lại.</p>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-100 dark:bg-slate-950 pb-28 md:pb-24 font-sans">
            {/* Header */}
            <div className="bg-indigo-600 text-white p-6 shadow-md">
                <div className="max-w-3xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-xl md:text-2xl font-bold mb-1">{data.rfq.title}</h1>
                        <p className="text-indigo-200 text-sm flex items-center">
                            <Building2 className="w-4 h-4 mr-2" /> Xin chào, {data.supplier.name}
                        </p>
                    </div>
                    <div className="bg-indigo-800/50 rounded-lg p-3 w-fit">
                        <p className="text-xs text-indigo-300 uppercase font-semibold flex items-center mb-1">
                            <Clock className="w-3 h-3 mr-1" /> Hạn nộp báo giá
                        </p>
                        <p className="font-mono text-sm md:text-base font-bold text-amber-300">
                            {new Date(data.rfq.deadline).toLocaleString('vi-VN')}
                        </p>
                    </div>
                </div>
            </div>

            {/* Danh sách vật tư */}
            <div className="max-w-3xl mx-auto p-4 mt-2 space-y-4">
                <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 p-3 rounded-lg text-sm mb-4 border border-blue-100 dark:border-blue-800">
                    <strong>Hướng dẫn:</strong> Vui lòng nhập "Đơn giá" (VNĐ) cho các mặt hàng bạn có thể cung cấp. Các mặt hàng không cung cấp hãy để trống hoặc nhập 0.
                </div>

                {data.items.map((item: any, index: number) => {
                    const price = prices[item.id] || 0;
                    const total = price * Number(item.purchase_quantity);

                    return (
                        <Card key={item.id} className="p-4 shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <div className="flex items-start gap-2 mb-2">
                                        <span className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-500 w-6 h-6 rounded text-xs font-bold shrink-0">{index + 1}</span>
                                        <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">{item.item_name || item.material_name}</h3>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-600 dark:text-slate-400 ml-8">
                                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">ĐVT: <strong>{item.purchase_unit}</strong></span>
                                        <span>Số lượng: <strong className="text-indigo-600 dark:text-indigo-400 text-base">{Number(item.purchase_quantity).toLocaleString()}</strong></span>
                                    </div>
                                </div>

                                <div className="md:w-64 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase">Nhập Đơn giá (VNĐ)</label>
                                    <Input
                                        type="text"
                                        inputMode="numeric"
                                        placeholder="0"
                                        className="text-right font-bold text-lg h-11 bg-white dark:bg-slate-900 border-indigo-200 focus:border-indigo-500"
                                        value={price === 0 ? "" : price.toLocaleString('en-US')}
                                        onChange={(e) => handlePriceChange(item.id, e.target.value)}
                                    />
                                    <div className="flex justify-between items-center mt-2">
                                        <span className="text-xs text-slate-500">Thành tiền:</span>
                                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">
                                            {total > 0 ? formatCurrency(total) : "-"}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Thanh công cụ Submit (Sticky Bottom) */}
            <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
                <div className="max-w-3xl mx-auto p-4 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="w-full md:w-auto text-center md:text-left">
                        <p className="text-xs text-slate-500 font-semibold uppercase">Tổng giá trị chào thầu</p>
                        <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">
                            {formatCurrency(grandTotal)}
                        </p>
                    </div>
                    <Button
                        size="lg"
                        onClick={handleSubmit}
                        disabled={isSubmitting || grandTotal === 0}
                        className="w-full md:w-auto bg-emerald-600 hover:bg-emerald-700 text-white font-bold h-12 md:px-12 shadow-lg"
                    >
                        {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                        Gửi Báo Giá Xác Nhận
                    </Button>
                </div>
            </div>
        </div>
    );
}