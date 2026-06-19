"use client";

import React, { useMemo, useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Medal, Trophy, Gavel, Loader2, SplitSquareHorizontal, CheckSquare, Wand2, Printer, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { awardRfqAction, awardSplitRfqAction, unawardRfqAction } from "@/lib/action/procurement";
import { readMoneyToText } from "@/lib/utils/readNumber";

const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
};

interface BidData {
    rfq?: any;
    items: any[];
    suppliers: any[];
    bids?: any[];
    matrix?: any[];
}

export default function BidTabulation({ data, rfqId: propRfqId }: { data: BidData, rfqId?: string }) {
    const params = useParams();
    const router = useRouter();
    const rfqId = propRfqId || data?.rfq?.id || (params?.id as string);

    const items = data?.items || [];
    const suppliers = data?.suppliers || [];
    const bids = data?.bids || data?.matrix || [];

    const isDataAwarded = data?.rfq?.status === 'completed' || bids.some((b: any) => b.is_selected === true);

    const [localIsAwarded, setLocalIsAwarded] = useState<boolean>(isDataAwarded);
    const [isAwarding, setIsAwarding] = useState<string | null>(null);
    const [showPrintPreview, setShowPrintPreview] = useState(false);

    const [awardMode, setAwardMode] = useState<'full' | 'split'>(() => {
        const selectedSuppliers = new Set(bids.filter((b: any) => b.is_selected).map((b: any) => b.supplier_id));
        return selectedSuppliers.size > 1 ? 'split' : 'full';
    });

    const [selections, setSelections] = useState<Record<string, string>>(() => {
        const savedSelections: Record<string, string> = {};
        bids.forEach((bid: any) => {
            if (bid.is_selected) savedSelections[bid.rfq_item_id || bid.item_id] = bid.supplier_id;
        });
        return savedSelections;
    });

    useEffect(() => {
        router.refresh();
    }, [router]);

    useEffect(() => {
        const checkAwarded = data?.rfq?.status === 'completed' || bids.some((b: any) => b.is_selected === true);
        setLocalIsAwarded(checkAwarded);

        const newSelections: Record<string, string> = {};
        bids.forEach((bid: any) => {
            if (bid.is_selected) newSelections[bid.rfq_item_id || bid.item_id] = bid.supplier_id;
        });
        setSelections(newSelections);

        const uniqueSupps = new Set(Object.values(newSelections));
        if (uniqueSupps.size > 1) setAwardMode('split');
        else if (uniqueSupps.size === 1) setAwardMode('full');

    }, [data?.rfq?.status, bids]);

    const awardDate = localIsAwarded ? new Date(data?.rfq?.updated_at || Date.now()) : null;

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

    const winningSupplierId = useMemo(() => {
        if (localIsAwarded && awardMode === 'full') {
            const selectedSupps = Object.values(selections);
            if (selectedSupps.length > 0) return selectedSupps[0];
        }

        let minTotal = Infinity;
        let winner = null;
        Object.entries(supplierStats).forEach(([suppId, stat]) => {
            if (stat.isComplete && stat.total > 0 && stat.total < minTotal) {
                minTotal = stat.total; winner = suppId;
            }
        });
        if (!winner) {
            Object.entries(supplierStats).forEach(([suppId, stat]) => {
                if (stat.total > 0 && stat.total < minTotal) {
                    minTotal = stat.total; winner = suppId;
                }
            });
        }
        return winner;
    }, [supplierStats, localIsAwarded, awardMode, selections]);

    // LẤY TÊN NHÀ CUNG CẤP TRÚNG THẦU ĐỂ HIỂN THỊ LÊN BANNER
    const winningSupplierName = useMemo(() => {
        if (awardMode === 'full' && winningSupplierId) {
            const supp = suppliers.find(s => (s.supplier_id || s.id) === winningSupplierId);
            return supp?.supplier?.name || supp?.name || "N/A";
        }
        return "N/A";
    }, [awardMode, winningSupplierId, suppliers]);

    const { splitStats, grandTotalSplit } = useMemo(() => {
        const stats: Record<string, { totalSelected: number, selectedCount: number }> = {};
        let grandTotal = 0;

        suppliers.forEach(supp => {
            stats[supp.supplier_id || supp.id] = { totalSelected: 0, selectedCount: 0 };
        });

        Object.entries(selections).forEach(([itemId, suppId]) => {
            const bid = bids.find(b => (b.rfq_item_id === itemId || b.item_id === itemId) && b.supplier_id === suppId);
            const item = items.find(i => i.id === itemId);

            if (bid && item) {
                const price = Number(bid.unit_price || bid.price || 0);
                const lineTotal = price * Number(item.purchase_quantity || 0);

                stats[suppId].totalSelected += lineTotal;
                stats[suppId].selectedCount += 1;
                grandTotal += lineTotal;
            }
        });

        return { splitStats: stats, grandTotalSplit: grandTotal };
    }, [selections, items, suppliers, bids]);

    const handleAwardFull = async (supplierId: string, suppName: string) => {
        if (!rfqId) return toast.error("Lỗi mã Gói thầu!");
        const stat = supplierStats[supplierId];
        if (!stat.isComplete && !window.confirm(`CẢNH BÁO: ${suppName} chưa báo đủ hàng. Vẫn muốn chốt?`)) return;
        if (stat.isComplete && !window.confirm(`Chốt toàn bộ cho ${suppName} với giá ${formatCurrency(stat.total)}?`)) return;

        setIsAwarding(supplierId);
        try {
            const res = await awardRfqAction(rfqId, supplierId);
            if (res.success) {
                toast.success("Chốt thầu thành công!");
                setLocalIsAwarded(true);

                const newSelections: Record<string, string> = {};
                items.forEach(i => { newSelections[i.id] = supplierId; });
                setSelections(newSelections);

                router.refresh();
            }
            else toast.error("Lỗi: " + res.error);
        } catch (err: any) { toast.error(err.message); }
        finally { setIsAwarding(null); }
    };

    const handleAwardSplit = async () => {
        if (!rfqId) return toast.error("Lỗi mã Gói thầu!");
        const selectedItemCount = Object.keys(selections).length;

        if (selectedItemCount === 0) return toast.warning("Chưa có vật tư nào được chọn để chốt!");
        if (selectedItemCount < items.length) {
            if (!window.confirm(`Bạn mới chọn ${selectedItemCount}/${items.length} món. Các món chưa chọn sẽ bị bỏ qua. Tiếp tục?`)) return;
        } else {
            if (!window.confirm(`Xác nhận chốt thầu từng phần với tổng giá trị ${formatCurrency(grandTotalSplit)}?`)) return;
        }

        setIsAwarding('split_submit');
        try {
            const res = await awardSplitRfqAction(rfqId, selections);
            if (res.success) {
                toast.success("Chốt thầu từng phần thành công!");
                setLocalIsAwarded(true);
                router.refresh();
            }
            else toast.error("Lỗi: " + res.error);
        } catch (err: any) { toast.error(err.message); }
        finally { setIsAwarding(null); }
    };

    const handleUnaward = async () => {
        if (!rfqId) return;
        if (!window.confirm("Bạn có chắc chắn muốn hủy kết quả chốt thầu để đánh giá lại?")) return;

        setIsAwarding('unaward');
        try {
            const res = await unawardRfqAction(rfqId);
            if (res.success) {
                toast.success(res.message);
                setLocalIsAwarded(false);
                router.refresh();
            }
            else toast.error("Lỗi hủy chốt: " + res.error);
        } catch (err: any) { toast.error(err.message); }
        finally { setIsAwarding(null); }
    };

    const autoSelectBestPrices = () => {
        if (localIsAwarded) return;
        const newSelections: Record<string, string> = {};
        items.forEach(item => {
            let minPrice = Infinity;
            let bestSuppId = null;

            bids.forEach(b => {
                if (b.rfq_item_id === item.id || b.item_id === item.id) {
                    const price = Number(b.unit_price || b.price || 0);
                    if (price > 0 && price < minPrice) {
                        minPrice = price;
                        bestSuppId = b.supplier_id;
                    }
                }
            });
            if (bestSuppId) newSelections[item.id] = bestSuppId;
        });
        setSelections(newSelections);
        toast.success("Đã tự động chọn các báo giá tốt nhất!");
    };

    let printGrandTotal = 0;
    const printRows = items.map((item) => {
        let suppId: string | null = null;

        if (awardMode === 'full') suppId = winningSupplierId;
        else if (awardMode === 'split') suppId = selections[item.id] || null;

        const bid = bids.find(b => (b.rfq_item_id === item.id || b.item_id === item.id) && b.supplier_id === suppId);
        const suppInfo = suppliers.find(s => (s.supplier_id || s.id) === suppId);

        const price = Number(bid?.unit_price || bid?.price || 0);
        const qty = Number(item.purchase_quantity || 0);
        const total = price * qty;

        if (total > 0) printGrandTotal += total;

        return {
            ...item,
            price,
            total,
            suppName: suppInfo?.supplier?.name || suppInfo?.name || ""
        };
    });

    if (!suppliers || suppliers.length === 0) return <div className="text-center p-12 text-slate-500">Chưa có dữ liệu nhà cung cấp</div>;

    const a4Content = (
        <div className="w-full text-black text-[13px] leading-relaxed" style={{ fontFamily: '"Times New Roman", Times, serif' }}>
            <div className="flex justify-between items-start mb-8 border-b-2 border-black pb-4">
                <div className="text-center">
                    <h2 className="font-bold text-[15px] uppercase">CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA</h2>
                    <p className="font-semibold mt-1">Phòng Cung Ứng Vật Tư</p>
                </div>
                <div className="text-center">
                    <p className="font-semibold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</p>
                    <p className="font-bold underline text-[15px]">Độc lập - Tự do - Hạnh phúc</p>
                    <p className="italic mt-2">
                        {awardDate
                            ? `Ngày ${awardDate.getDate().toString().padStart(2, '0')} tháng ${(awardDate.getMonth() + 1).toString().padStart(2, '0')} năm ${awardDate.getFullYear()}`
                            : "Ngày ..... tháng ..... năm 20..."}
                    </p>
                </div>
            </div>

            <h1 className="text-xl font-bold text-center uppercase mb-6">Biên Bản Chốt Thầu Mua Sắm Vật Tư</h1>

            <div className="mb-6 space-y-1.5 text-[14px]">
                <p><strong>Tên gói thầu / Dự án:</strong> {data?.rfq?.title}</p>
                <p><strong>Mã số RFQ:</strong> {data?.rfq?.code || rfqId}</p>
                <p><strong>Hình thức chốt thầu:</strong> {awardMode === 'full' ? 'Chốt toàn bộ gói thầu cho 1 Nhà cung cấp' : 'Chốt thầu từng phần (Bóc tách chi tiết mặt hàng)'}</p>
            </div>

            <table className="w-full border-collapse border border-black mb-4">
                <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-2 font-bold text-center w-12">STT</th>
                        <th className="border border-black p-2 font-bold text-center w-28">Mã VT</th>
                        <th className="border border-black p-2 font-bold text-left">Nội dung vật tư</th>
                        <th className="border border-black p-2 font-bold text-center w-20">ĐVT</th>
                        <th className="border border-black p-2 font-bold text-right w-24">Số lượng</th>
                        <th className="border border-black p-2 font-bold text-right w-28">Đơn giá</th>
                        <th className="border border-black p-2 font-bold text-right w-32">Thành tiền</th>
                        <th className="border border-black p-2 font-bold text-center w-40">Nhà cung cấp</th>
                        <th className="border border-black p-2 font-bold text-center w-32">Ghi chú</th>
                    </tr>
                </thead>
                <tbody>
                    {printRows.map((row, idx) => (
                        <tr key={idx}>
                            <td className="border border-black p-2 text-center">{idx + 1}</td>
                            <td className="border border-black p-2 text-center uppercase">{row.material_code || "-"}</td>
                            <td className="border border-black p-2 text-left font-semibold">{row.item_name || row.material_name}</td>
                            <td className="border border-black p-2 text-center">{row.purchase_unit}</td>
                            <td className="border border-black p-2 text-right">{Number(row.purchase_quantity).toLocaleString('en-US')}</td>
                            <td className="border border-black p-2 text-right">{row.price > 0 ? row.price.toLocaleString('en-US') : "-"}</td>
                            <td className="border border-black p-2 text-right">{row.total > 0 ? row.total.toLocaleString('en-US') : "-"}</td>
                            <td className="border border-black p-2 text-center font-bold uppercase">{row.suppName || <span className="italic font-normal text-gray-500">Trống</span>}</td>
                            <td className="border border-black p-2 text-center"></td>
                        </tr>
                    ))}
                    <tr>
                        <td colSpan={6} className="border border-black p-2 text-right font-bold uppercase tracking-wide text-[14px]">
                            Tổng cộng giá trị chốt thầu (VNĐ):
                        </td>
                        <td className="border border-black p-2 text-right font-bold text-[15px] whitespace-nowrap">
                            {printGrandTotal > 0 ? printGrandTotal.toLocaleString('en-US') : "-"}
                        </td>
                        <td colSpan={2} className="border border-black"></td>
                    </tr>
                    {printGrandTotal > 0 && (
                        <tr>
                            <td colSpan={9} className="border border-black p-2 text-left italic font-bold text-[14px] bg-slate-50">
                                Số tiền bằng chữ: {readMoneyToText(printGrandTotal)}
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>

            <div className="grid grid-cols-4 gap-4 text-center mt-12 text-[14px] pt-4 break-inside-avoid">
                <div>
                    <p className="font-bold">Nhân viên Phòng Mua</p>
                    <p className="italic text-xs mt-1 mb-24">(Ký, ghi rõ họ tên)</p>
                </div>
                <div>
                    <p className="font-bold">Trưởng Phòng Mua</p>
                    <p className="italic text-xs mt-1 mb-24">(Ký, ghi rõ họ tên)</p>
                </div>
                <div>
                    <p className="font-bold">Kế toán trưởng</p>
                    <p className="italic text-xs mt-1 mb-24">(Ký, ghi rõ họ tên)</p>
                </div>
                <div>
                    <p className="font-bold">Giám đốc</p>
                    <p className="italic text-xs mt-1 mb-24">(Ký, đóng dấu)</p>
                </div>
            </div>
        </div>
    );

    return (
        <div className="w-full relative">
            <style type="text/css" media="print">{`
                @page { size: A4 landscape; margin: 15mm; }
                body { background: white !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                [data-radix-portal] { display: none !important; }
            `}</style>

            {localIsAwarded && (
                <div className="print:hidden mb-4 bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm animate-in fade-in zoom-in duration-300">
                    <div>
                        <h4 className="font-extrabold text-emerald-800 text-lg flex items-center gap-2"><CheckCircle2 className="w-6 h-6" /> GÓI THẦU ĐÃ ĐƯỢC CHỐT!</h4>
                        <p className="text-sm text-emerald-700 font-medium mt-1">
                            {awardMode === 'full'
                                ? `Hệ thống ghi nhận chốt toàn bộ vật tư cho nhà cung cấp: ${winningSupplierName}`
                                : `Hệ thống ghi nhận bóc tách chốt thầu cho ${new Set(Object.values(selections)).size} nhà cung cấp khác nhau.`}
                        </p>
                    </div>
                    <Button variant="outline" onClick={handleUnaward} disabled={isAwarding === 'unaward'} className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700">
                        {isAwarding === 'unaward' ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RotateCcw className="w-4 h-4 mr-2" />}
                        Hủy Kết Quả Chốt
                    </Button>
                </div>
            )}

            <div className="print:hidden w-full">
                <Card className={`border ${localIsAwarded ? 'border-emerald-300 shadow-emerald-100' : 'border-slate-200 dark:border-slate-800'} shadow-sm bg-white dark:bg-slate-950 overflow-hidden rounded-xl transition-all`}>
                    <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div>
                            <h3 className="font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                                {awardMode === 'full' ? <Gavel className="w-5 h-5 text-indigo-600" /> : <SplitSquareHorizontal className="w-5 h-5 text-amber-600" />}
                                Ma Trận Đánh Giá Thầu
                            </h3>
                            <p className="text-sm text-slate-500 mt-1">
                                {awardMode === 'full'
                                    ? "Đánh giá và chốt chọn 1 nhà cung cấp cho toàn bộ gói thầu."
                                    : "Bóc tách gói thầu, chọn mặt hàng có giá tốt nhất từ nhiều nhà cung cấp."}
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                            {localIsAwarded && (
                                <Button onClick={() => setShowPrintPreview(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-bold animate-in fade-in duration-300">
                                    <Printer className="w-4 h-4 mr-2" /> In Biên Bản
                                </Button>
                            )}

                            {!localIsAwarded && (
                                <div className="flex bg-slate-200/50 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                                    <button
                                        onClick={() => setAwardMode('full')}
                                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${awardMode === 'full' ? 'bg-white dark:bg-slate-700 text-indigo-700 dark:text-indigo-400 shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
                                    >
                                        Chốt Toàn Bộ
                                    </button>
                                    <button
                                        onClick={() => setAwardMode('split')}
                                        className={`px-4 py-1.5 text-sm font-semibold rounded-md transition-all ${awardMode === 'split' ? 'bg-white dark:bg-slate-700 text-amber-700 dark:text-amber-400 shadow-sm' : 'text-slate-600 hover:text-slate-900 dark:text-slate-400'}`}
                                    >
                                        Chốt Từng Phần
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {!localIsAwarded && awardMode === 'split' && (
                        <div className="bg-amber-50 dark:bg-amber-950/20 px-4 py-3 border-b border-amber-100 dark:border-amber-900/30 flex flex-col md:flex-row md:items-center justify-between gap-3">
                            <span className="text-sm font-medium text-amber-800 dark:text-amber-500">
                                Nhấp vào từng ô giá để chọn mặt hàng, hoặc sử dụng công cụ tự động.
                            </span>
                            <Button size="sm" onClick={autoSelectBestPrices} className="bg-amber-600 hover:bg-amber-700 text-white shadow-sm w-full md:w-auto">
                                <Wand2 className="w-4 h-4 mr-2" /> Tự động nhặt giá rẻ nhất
                            </Button>
                        </div>
                    )}

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
                                        const splitStat = splitStats[suppId];

                                        const isWinnerFull = awardMode === 'full' && winningSupplierId === suppId;
                                        const isWinnerSplit = awardMode === 'split' && splitStat.selectedCount > 0;
                                        const isWinnerColumn = localIsAwarded && (isWinnerFull || isWinnerSplit);

                                        return (
                                            <TableHead key={suppId} colSpan={2} className={`text-center font-bold border-r border-slate-300 dark:border-slate-700 transition-all ${isWinnerColumn ? 'bg-emerald-50 dark:bg-emerald-900/20' : ''}`}>
                                                <div className="flex flex-col items-center justify-center py-2">
                                                    <span className={`text-base uppercase tracking-wide truncate max-w-[200px] ${isWinnerColumn ? 'text-emerald-700 dark:text-emerald-400 font-extrabold' : ''}`} title={suppName}>{suppName}</span>

                                                    {localIsAwarded && isWinnerColumn ? (
                                                        <div className="mt-2 flex items-center justify-center gap-1 bg-emerald-500 text-white px-3 py-1 rounded-full text-[11px] font-bold shadow-sm animate-in zoom-in">
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> ĐÃ CHỐT THẦU
                                                        </div>
                                                    ) : (
                                                        awardMode === 'full' ? (
                                                            <>
                                                                <span className={`text-xs mt-1 ${stat.isComplete ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>Báo giá: {stat.bidCount}/{items.length}</span>
                                                                {winningSupplierId === suppId && stat.isComplete && !localIsAwarded && (
                                                                    <Badge className="mt-1 bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-sm text-[10px]"><Trophy className="w-3 h-3 mr-1 text-emerald-500" /> Rẻ nhất toàn gói</Badge>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <Badge variant="outline" className={`mt-2 ${splitStat.selectedCount > 0 ? 'bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30' : 'text-slate-400 border-slate-300'}`}>
                                                                Đã chọn {splitStat.selectedCount} món
                                                            </Badge>
                                                        )
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

                                                const isSelected = awardMode === 'split' && selections[item.id] === suppId;
                                                const isAwardedCell = localIsAwarded && ((awardMode === 'full' && winningSupplierId === suppId) || isSelected);

                                                return (
                                                    <React.Fragment key={`${item.id}-${suppId}`}>
                                                        <TableCell
                                                            onClick={() => {
                                                                if (!localIsAwarded && awardMode === 'split' && unitPrice > 0) {
                                                                    setSelections(prev => ({ ...prev, [item.id]: suppId }));
                                                                }
                                                            }}
                                                            className={`text-right border-r border-slate-200 dark:border-slate-800 transition-all
                                                                ${!localIsAwarded && awardMode === 'split' && unitPrice > 0 ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''}
                                                                ${isSelected && !localIsAwarded ? 'bg-amber-100 dark:bg-amber-900/20 shadow-inner' : ''}
                                                                ${isAwardedCell ? 'bg-emerald-50 dark:bg-emerald-900/20 font-bold text-emerald-700' : 'text-slate-600 dark:text-slate-400'}
                                                                ${!localIsAwarded && awardMode === 'full' && isLowest ? 'font-bold text-emerald-600 dark:text-emerald-400' : ''}
                                                            `}
                                                        >
                                                            {unitPrice > 0 ? (
                                                                <div className="flex items-center justify-end gap-1 relative">
                                                                    {isSelected && !localIsAwarded && <CheckSquare className="w-4 h-4 text-amber-600 absolute left-2 opacity-50" />}
                                                                    {isAwardedCell && <CheckCircle2 className="w-4 h-4 text-emerald-500 absolute left-2" />}
                                                                    {!localIsAwarded && isLowest && <Medal className="w-4 h-4 text-emerald-500 mr-1" />}
                                                                    {unitPrice.toLocaleString('en-US')}
                                                                </div>
                                                            ) : "-"}
                                                        </TableCell>
                                                        <TableCell
                                                            onClick={() => {
                                                                if (!localIsAwarded && awardMode === 'split' && unitPrice > 0) {
                                                                    setSelections(prev => ({ ...prev, [item.id]: suppId }));
                                                                }
                                                            }}
                                                            className={`text-right border-r border-slate-300 dark:border-slate-700 font-semibold transition-all
                                                                ${!localIsAwarded && awardMode === 'split' && unitPrice > 0 ? 'cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800' : ''}
                                                                ${isSelected && !localIsAwarded ? 'bg-amber-100/50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-500 shadow-inner border-y-2 border-y-amber-300' : ''}
                                                                ${isAwardedCell ? 'bg-emerald-100/50 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 border-y border-y-emerald-200' : 'text-slate-700 dark:text-slate-300'}
                                                            `}
                                                        >
                                                            {total > 0 ? formatCurrency(total) : "-"}
                                                        </TableCell>
                                                    </React.Fragment>
                                                );
                                            })}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>

                            {!localIsAwarded && (
                                <TableBody>
                                    <TableRow className="bg-slate-100 dark:bg-slate-900 border-t-2 border-slate-300 dark:border-slate-700">
                                        <TableCell colSpan={3} className="text-right font-extrabold text-slate-800 dark:text-slate-100 uppercase tracking-widest border-r border-slate-300 dark:border-slate-700">
                                            {awardMode === 'full' ? 'Tổng Giá Trị Đề Xuất' : 'Cộng Dồn Giá Trị Trúng Thầu'}
                                        </TableCell>
                                        {suppliers.map(supp => {
                                            const suppId = supp.supplier_id || supp.id;
                                            const suppName = supp.supplier?.name || supp.name;
                                            const stat = supplierStats[suppId];
                                            const splitStat = splitStats[suppId];
                                            const isWinner = winningSupplierId === suppId;

                                            return (
                                                <TableCell key={`${suppId}-total`} colSpan={2} className={`text-center p-4 border-r border-slate-300 dark:border-slate-700 ${(awardMode === 'full' && isWinner) ? 'bg-emerald-100/50 dark:bg-emerald-900/20' : ''} ${(awardMode === 'split' && splitStat.selectedCount > 0) ? 'bg-amber-50 dark:bg-amber-900/10' : ''}`}>
                                                    <div className={`font-extrabold text-xl mb-3
                                                        ${awardMode === 'full' && isWinner ? 'text-emerald-700 dark:text-emerald-400' : ''} 
                                                        ${awardMode === 'split' && splitStat.selectedCount > 0 ? 'text-amber-600 dark:text-amber-500' : 'text-slate-800 dark:text-slate-100'}`}
                                                    >
                                                        {awardMode === 'full'
                                                            ? (stat.total > 0 ? formatCurrency(stat.total) : "-")
                                                            : (splitStat.totalSelected > 0 ? formatCurrency(splitStat.totalSelected) : "-")
                                                        }
                                                    </div>

                                                    {awardMode === 'full' && (
                                                        <Button
                                                            onClick={() => handleAwardFull(suppId, suppName)}
                                                            disabled={isAwarding !== null || stat.total === 0}
                                                            className={`w-full font-bold shadow-sm ${isWinner ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'}`}
                                                        >
                                                            {isAwarding === suppId ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gavel className="w-4 h-4 mr-2" />}
                                                            {isWinner ? "Chốt NCC Tốt Nhất" : "Chốt Chọn"}
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                </TableBody>
                            )}
                        </Table>
                    </div>

                    {!localIsAwarded && awardMode === 'split' && (
                        <div className="bg-white dark:bg-slate-900 p-4 border-t border-slate-200 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
                            <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-6 w-full md:w-auto">
                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                    Đang chọn <strong className="text-amber-600 dark:text-amber-500 text-lg mx-1">{Object.keys(selections).length}/{items.length}</strong> mặt hàng.
                                </p>
                                <div className="hidden sm:block h-8 w-px bg-slate-300 dark:bg-slate-700"></div>
                                <div className="text-center sm:text-left">
                                    <p className="text-xs text-slate-500 uppercase font-bold tracking-wider mb-0.5">Tổng giá trị gói thầu</p>
                                    <p className="text-xl font-black text-amber-600 dark:text-amber-500">{formatCurrency(grandTotalSplit)}</p>
                                </div>
                            </div>

                            <Button
                                size="lg"
                                onClick={handleAwardSplit}
                                disabled={isAwarding !== null || Object.keys(selections).length === 0}
                                className="w-full md:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold"
                            >
                                {isAwarding === 'split_submit' ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
                                Xác Nhận Chốt Thầu
                            </Button>
                        </div>
                    )}
                </Card>
            </div>

            <Dialog open={showPrintPreview} onOpenChange={setShowPrintPreview}>
                <DialogContent className="max-w-[95vw] w-[297mm] h-[90vh] flex flex-col p-0 dark:bg-slate-900 border-none overflow-hidden print:hidden">
                    <div className="flex justify-between items-center p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 z-10 shrink-0">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2">
                            <Printer className="w-5 h-5 text-indigo-600" /> Xem trước bản in (A4 Ngang)
                        </DialogTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setShowPrintPreview(false)}>Hủy</Button>
                            <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                <Printer className="w-4 h-4 mr-2" /> Tiến Hành In
                            </Button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-slate-300 dark:bg-slate-800 p-4 sm:p-8 flex justify-center custom-scrollbar">
                        <div className="w-[297mm] min-h-[210mm] bg-white shadow-2xl p-[15mm] text-black shrink-0">
                            {a4Content}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="hidden print:block w-full text-black bg-white m-0 p-0">
                {a4Content}
            </div>
        </div>
    );
}