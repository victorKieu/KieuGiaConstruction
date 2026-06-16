"use client";

import React, { useMemo, useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Medal, AlertCircle, Trophy, Gavel, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { awardRfqAction } from "@/lib/action/procurement"; // Ta sẽ tạo action này ở Bước 2

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

interface BidData {
    rfq?: any; // Thêm rfq để lấy id
    items: any[];
    suppliers: any[];
    bids?: any[];
    matrix?: any[];
}

export default function BidTabulation({ data }: { data: BidData }) {
    const items = data?.items || [];
    const suppliers = data?.suppliers || [];
    const bids = data?.bids || data?.matrix || [];
    const rfqId = data?.rfq?.id;

    const [isAwarding, setIsAwarding] = useState<string | null>(null);

    const lowestPrices = useMemo(() => {
        const result: Record<string, number> = {};
        items.forEach(item => {
            const itemBids = bids.filter(b => (b.rfq_item_id === item.id || b.item_id === item.id) && Number(b.unit_price || b.price || 0) > 0);
            if (itemBids.length > 0) {
                result[item.id] = Math.min(...itemBids.map(b => Number(b.unit_price || b.price || 0)));
            }
        });
        return result;
    }, [items, bids]);

    // TÍNH TOÁN LOGIC MỚI: Đếm số lượng item đã báo giá
    const supplierStats = useMemo(() => {
        const stats: Record<string, { total: number, bidCount: number, isComplete: boolean }> = {};
        suppliers.forEach(supp => {
            const suppId = supp.supplier_id || supp.id;
            let total = 0;
            let count = 0;

            items.forEach(item => {
                const bid = bids.find(b => (b.rfq_item_id === item.id || b.item_id === item.id) && b.supplier_id === suppId);
                const price = Number(bid?.unit_price || bid?.price || 0);
                if (price > 0) {
                    total += price * Number(item.purchase_quantity || 0);
                    count++;
                }
            });
            stats[suppId] = { total, bidCount: count, isComplete: count === items.length };
        });
        return stats;
    }, [items, suppliers, bids]);

    // LOGIC TÌM NCC RẺ NHẤT MỚI: Ưu tiên NCC báo giá đầy đủ
    const winningSupplierId = useMemo(() => {
        let minTotal = Infinity;
        let winner = null;

        // Vòng 1: Tìm người rẻ nhất trong nhóm báo đủ 100% mặt hàng
        Object.entries(supplierStats).forEach(([suppId, stat]) => {
            if (stat.isComplete && stat.total > 0 && stat.total < minTotal) {
                minTotal = stat.total;
                winner = suppId;
            }
        });

        // Vòng 2: Nếu không có ai báo đủ 100%, mới tìm người rẻ nhất nói chung
        if (!winner) {
            Object.entries(supplierStats).forEach(([suppId, stat]) => {
                if (stat.total > 0 && stat.total < minTotal) {
                    minTotal = stat.total;
                    winner = suppId;
                }
            });
        }
        return winner;
    }, [supplierStats]);

    const handleAward = async (supplierId: string, suppName: string) => {
        if (!rfqId) {
            toast.error("Không tìm thấy mã Gói thầu!");
            return;
        }

        const stat = supplierStats[supplierId];
        if (!stat.isComplete) {
            const confirmPartial = window.confirm(`CẢNH BÁO: ${suppName} chưa báo giá đủ các mặt hàng (${stat.bidCount}/${items.length}). Bạn vẫn muốn chốt chọn nhà cung cấp này?`);
            if (!confirmPartial) return;
        } else {
            const confirmFull = window.confirm(`Bạn chắc chắn muốn chốt gói thầu này cho ${suppName} với giá ${formatCurrency(stat.total)}?`);
            if (!confirmFull) return;
        }

        setIsAwarding(supplierId);
        const res = await awardRfqAction(rfqId, supplierId);
        if (res.success) {
            toast.success("Đã chốt nhà cung cấp thành công!");
            window.location.reload(); // Reload để cập nhật trạng thái mới nhất
        } else {
            toast.error("Lỗi khi chốt thầu: " + res.error);
        }
        setIsAwarding(null);
    };

    if (!suppliers || suppliers.length === 0) return <div className="text-center p-12">Chưa có dữ liệu</div>;

    return (
        <Card className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden rounded-xl">
            <div className="overflow-x-auto custom-scrollbar">
                <Table className="w-full relative">
                    <TableHeader className="bg-slate-100 dark:bg-slate-900 border-b-2 border-slate-300 dark:border-slate-700">
                        <TableRow>
                            <TableHead rowSpan={2} className="min-w-[50px] text-center font-bold border-r border-slate-300 dark:border-slate-700">STT</TableHead>
                            <TableHead rowSpan={2} className="min-w-[250px] font-bold border-r border-slate-300 dark:border-slate-700">Nội dung vật tư</TableHead>
                            <TableHead rowSpan={2} className="min-w-[100px] text-right font-bold border-r border-slate-300 dark:border-slate-700">Khối lượng</TableHead>

                            {suppliers.map(supp => {
                                const suppId = supp.supplier_id || supp.id;
                                const suppName = supp.supplier?.name || supp.name || "NCC";
                                const stat = supplierStats[suppId];

                                return (
                                    <TableHead key={suppId} colSpan={2} className={`text-center font-bold border-r border-slate-300 dark:border-slate-700 ${winningSupplierId === suppId ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' : ''}`}>
                                        <div className="flex flex-col items-center justify-center py-2">
                                            <span className="text-base uppercase tracking-wide truncate max-w-[200px]" title={suppName}>{suppName}</span>

                                            {/* HIỂN THỊ TRẠNG THÁI BÁO GIÁ (Đủ hay Thiếu) */}
                                            <span className={`text-xs mt-1 ${stat.isComplete ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                Báo giá: {stat.bidCount}/{items.length} mục
                                            </span>

                                            {winningSupplierId === suppId && stat.isComplete && (
                                                <Badge className="mt-1 bg-emerald-500 text-white border-none shadow-sm text-[10px]">
                                                    <Trophy className="w-3 h-3 mr-1" /> Rẻ nhất toàn gói
                                                </Badge>
                                            )}
                                        </div>
                                    </TableHead>
                                );
                            })}
                        </TableRow>
                        <TableRow>
                            {suppliers.map(supp => (
                                <React.Fragment key={`${supp.supplier_id || supp.id}-sub`}>
                                    <TableHead className="min-w-[120px] text-right text-xs font-semibold bg-slate-50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800">Đơn giá</TableHead>
                                    <TableHead className="min-w-[140px] text-right text-xs font-semibold bg-slate-50 dark:bg-slate-900/50 border-r border-slate-300 dark:border-slate-700">Thành tiền</TableHead>
                                </React.Fragment>
                            ))}
                        </TableRow>
                    </TableHeader>

                    <TableBody>
                        {/* Vòng lặp items giữ nguyên như cũ, tôi rút gọn để tiết kiệm không gian... */}
                        {items.map((item, index) => {
                            const minPrice = lowestPrices[item.id];
                            return (
                                <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                    <TableCell className="text-center font-medium text-slate-500 border-r border-slate-200 dark:border-slate-800">{index + 1}</TableCell>
                                    <TableCell className="border-r border-slate-200 dark:border-slate-800">
                                        <div className="font-bold text-slate-800 dark:text-slate-200">{item.item_name || item.material_name}</div>
                                        <div className="text-xs text-slate-500">ĐVT: {item.purchase_unit}</div>
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400 border-r border-slate-300 dark:border-slate-700 bg-blue-50/30 dark:bg-blue-900/10 text-base">
                                        {Number(item.purchase_quantity).toLocaleString('en-US')}
                                    </TableCell>
                                    {suppliers.map(supp => {
                                        const suppId = supp.supplier_id || supp.id;
                                        const bid = bids.find(b => (b.rfq_item_id === item.id || b.item_id === item.id) && b.supplier_id === suppId);
                                        const unitPrice = bid ? Number(bid.unit_price || bid.price || 0) : 0;
                                        const isLowest = unitPrice > 0 && unitPrice === minPrice;
                                        const total = unitPrice * Number(item.purchase_quantity);
                                        return (
                                            <React.Fragment key={`${item.id}-${suppId}`}>
                                                <TableCell className={`text-right border-r border-slate-200 dark:border-slate-800 ${isLowest ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50/30' : 'text-slate-600'}`}>
                                                    {unitPrice > 0 ? <div className="flex items-center justify-end gap-1">{isLowest && <Medal className="w-3 h-3 text-emerald-500" />}{unitPrice.toLocaleString('en-US')}</div> : "-"}
                                                </TableCell>
                                                <TableCell className={`text-right border-r border-slate-300 dark:border-slate-700 font-semibold ${isLowest ? 'text-emerald-700 bg-emerald-50/50' : 'text-slate-700 dark:text-slate-300'}`}>
                                                    {total > 0 ? formatCurrency(total) : "-"}
                                                </TableCell>
                                            </React.Fragment>
                                        );
                                    })}
                                </TableRow>
                            );
                        })}
                    </TableBody>

                    <TableBody>
                        <TableRow className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700">
                            <TableCell colSpan={3} className="text-right font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest border-r border-slate-300 dark:border-slate-700">
                                Tổng Giá Trị & Chốt Thầu
                            </TableCell>
                            {suppliers.map(supp => {
                                const suppId = supp.supplier_id || supp.id;
                                const suppName = supp.supplier?.name || supp.name;
                                const stat = supplierStats[suppId];
                                const isWinner = winningSupplierId === suppId;

                                return (
                                    <TableCell key={`${suppId}-total`} colSpan={2} className={`text-center p-4 border-r border-slate-300 dark:border-slate-700 ${isWinner ? 'bg-emerald-100/50 dark:bg-emerald-900/20' : ''}`}>
                                        <div className={`font-extrabold text-xl mb-3 ${isWinner ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                            {stat.total > 0 ? formatCurrency(stat.total) : "-"}
                                        </div>

                                        {/* NÚT CHỐT GIÁ CHO TỪNG NCC */}
                                        <Button
                                            onClick={() => handleAward(suppId, suppName)}
                                            disabled={isAwarding !== null || stat.total === 0}
                                            className={`w-full font-bold shadow-sm ${isWinner ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                        >
                                            {isAwarding === suppId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4 mr-2" />}
                                            {isWinner ? "Chốt NCC Tốt Nhất" : "Chốt Chọn"}
                                        </Button>
                                    </TableCell>
                                );
                            })}
                        </TableRow>
                    </TableBody>
                </Table>
            </div>
        </Card>
    );
}