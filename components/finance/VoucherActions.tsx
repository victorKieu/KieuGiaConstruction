"use client";

import { useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MoreHorizontal, Printer, Edit, Trash2, Save, Loader2 } from "lucide-react";

import { deletePaymentRequestAction, updatePaymentRequestAction } from "@/lib/action/finance";
import { formatCurrency } from "@/lib/utils/utils";
import { readMoneyToText } from "@/lib/utils/readNumber";

export default function VoucherActions({ request, companySettings }: { request: any; companySettings?: any }) {
    const router = useRouter();

    const [previewOpen, setPreviewOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [editPartner, setEditPartner] = useState(request.partner_name || request.requester?.name || "");
    const [editDesc, setEditDesc] = useState(request.description || "");
    const [editAmountRaw, setEditAmountRaw] = useState(Number(request.amount));
    const [editAmountDisplay, setEditAmountDisplay] = useState(new Intl.NumberFormat("vi-VN").format(Number(request.amount)));

    const isLocked = request.status === 'completed' || request.status === 'executed' || request.status === 'paid';
    const isReceipt = request.request_type === 'receipt';

    const handleMoneyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/\D/g, "");
        setEditAmountDisplay(new Intl.NumberFormat("vi-VN").format(Number(rawValue)));
        setEditAmountRaw(Number(rawValue));
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const res = await updatePaymentRequestAction(request.id, {
            amount: editAmountRaw,
            description: editDesc,
            partner_name: editPartner,
            project_id: request.project_id
        });

        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            setEditOpen(false);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const handleDelete = async () => {
        if (!confirm("Bạn có chắc chắn muốn xóa phiếu này không? Hành động này không thể hoàn tác.")) return;

        const res = await deletePaymentRequestAction(request.id);
        if (res.success) {
            toast.success(res.message);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const reqDate = request.created_at ? new Date(request.created_at) : new Date();

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Mở menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px] dark:border-slate-800 dark:bg-slate-900">
                    <DropdownMenuItem onClick={() => setPreviewOpen(true)} className="cursor-pointer font-medium">
                        <Printer className="mr-2 h-4 w-4 text-blue-500" />
                        <span>Xem & In Phiếu</span>
                    </DropdownMenuItem>

                    {!isLocked && (
                        <>
                            <DropdownMenuSeparator className="dark:bg-slate-800" />
                            <DropdownMenuItem className="cursor-pointer" onClick={() => setEditOpen(true)}>
                                <Edit className="mr-2 h-4 w-4 text-amber-500" />
                                <span>Sửa thông tin</span>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Xóa phiếu</span>
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* MODAL 1: SỬA THÔNG TIN */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md dark:border-slate-800 dark:bg-slate-900">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="h-5 w-5 text-amber-500" /> Cập nhật Phiếu {isReceipt ? 'Thu' : 'Chi'}
                        </DialogTitle>
                        <DialogDescription>Chỉ áp dụng cho các phiếu chưa được giải ngân.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Người giao dịch</Label>
                            <Input required value={editPartner} onChange={(e) => setEditPartner(e.target.value)} className="dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Lý do {isReceipt ? 'thu' : 'chi'}</Label>
                            <Input required value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold tracking-wider text-slate-500 uppercase">Số tiền (VNĐ)</Label>
                            <div className="relative">
                                <Input required type="text" value={editAmountDisplay} onChange={handleMoneyChange} className="pr-8 text-lg font-bold text-blue-600 dark:bg-slate-950" />
                                <span className="absolute top-2.5 right-3 font-bold text-slate-400">đ</span>
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={loading} className="bg-amber-500 text-white hover:bg-amber-600">
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Lưu thay đổi
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: PREVIEW IN */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-[850px] border-slate-300 bg-slate-100 dark:border-slate-800 dark:bg-slate-900">
                    <DialogHeader className="print:hidden">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Printer className="h-5 w-5 text-blue-600" /> Xem trước Phiếu {isReceipt ? 'Thu' : 'Chi'} (Khổ A5)
                        </DialogTitle>
                        <DialogDescription>Nhấn nút "Thực hiện In", chọn Khổ giấy A5 và Bố cục Nằm ngang (Landscape).</DialogDescription>
                    </DialogHeader>

                    <div className="flex justify-center overflow-x-auto py-4 print:overflow-visible print:py-0">
                        <div
                            id="printable-voucher"
                            className="relative border border-slate-200 bg-white text-black shadow-md"
                            style={{
                                fontFamily: '"Times New Roman", Times, serif',
                                width: '210mm',
                                minHeight: '148mm',
                                padding: '12mm 15mm'
                            }}
                        >
                            <div className="mb-4 flex items-start justify-between">
                                <div>
                                    <h2 className="font-bold text-[14px] uppercase">{companySettings?.name || "CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA"}</h2>
                                    <p className="text-[12px]">Địa chỉ: {companySettings?.address || "..........................................................................................."}</p>
                                </div>
                                <div className="text-center leading-tight text-[13px]">
                                    <p className="font-bold">Mẫu số 01 - TT</p>
                                    <p className="text-[11px] italic">(Ban hành theo Thông tư số 200/2014/TT-BTC)</p>
                                    <p className="mt-1">Quyển số: ..............</p>
                                </div>
                            </div>

                            <div className="mb-6 text-center">
                                <h1 className="text-2xl font-bold tracking-widest uppercase">{isReceipt ? 'PHIẾU THU' : 'PHIẾU CHI'}</h1>
                                <p className="mt-1 text-[13px] italic">Ngày {format(reqDate, 'dd')} tháng {format(reqDate, 'MM')} năm {format(reqDate, 'yyyy')}</p>
                                <p className="mt-1 text-[13px]">Số: <span className="font-bold">{request.request_code}</span></p>
                            </div>

                            <div className="space-y-3 leading-relaxed text-[14px]">
                                <div className="flex items-end gap-2">
                                    <span className="whitespace-nowrap">Họ tên người {isReceipt ? 'nộp' : 'nhận'} tiền:</span>
                                    <span className="flex-1 border-b border-dotted border-slate-500 font-bold uppercase">{request.partner_name || request.requester?.name || ''}</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="whitespace-nowrap">Địa chỉ / Bộ phận:</span>
                                    <span className="flex-1 border-b border-dotted border-slate-500"></span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="whitespace-nowrap">Lý do {isReceipt ? 'thu' : 'chi'}:</span>
                                    <span className="flex-1 border-b border-dotted border-slate-500">{request.description}</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="whitespace-nowrap">Số tiền:</span>
                                    <span className="flex-1 border-b border-dotted border-slate-500 font-bold text-[15px]">{formatCurrency(request.amount)} VNĐ</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="whitespace-nowrap">Bằng chữ:</span>
                                    <span className="flex-1 border-b border-dotted border-slate-500 font-bold italic">
                                        {readMoneyToText(Number(request.amount))} đồng chẵn./.
                                    </span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="whitespace-nowrap">Kèm theo:</span>
                                    <span className="w-32 border-b border-dotted border-slate-500"></span>
                                    <span className="">chứng từ gốc.</span>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-5 gap-2 text-center text-[13px]">
                                <div>
                                    <div className="font-bold">Giám đốc</div>
                                    <div className="mb-20 text-[11px] italic">(Ký, họ tên, đóng dấu)</div>
                                </div>
                                <div>
                                    <div className="font-bold">Kế toán trưởng</div>
                                    <div className="mb-20 text-[11px] italic">(Ký, họ tên)</div>
                                </div>
                                <div>
                                    <div className="font-bold">Người lập phiếu</div>
                                    <div className="mb-20 text-[11px] italic">(Ký, họ tên)</div>
                                </div>
                                <div>
                                    <div className="font-bold">Người {isReceipt ? 'nộp' : 'nhận'} tiền</div>
                                    <div className="mb-20 text-[11px] italic">(Ký, họ tên)</div>
                                </div>
                                <div>
                                    <div className="font-bold">Thủ quỹ</div>
                                    <div className="mb-20 text-[11px] italic">(Ký, họ tên)</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="border-t pt-4 dark:border-slate-800 print:hidden">
                        <Button variant="outline" onClick={() => setPreviewOpen(false)} className="dark:text-slate-200">
                            Hủy bỏ
                        </Button>
                        <Button onClick={handlePrint} className="bg-blue-600 text-white shadow-md hover:bg-blue-700">
                            <Printer className="mr-2 h-4 w-4" /> Thực hiện In
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* CSS ĐIỀU KHIỂN MÁY IN (SỬA LỖI MẤT GÓC, MẤT CHỮ) */}
            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    /* Ẩn mọi thứ của trang web gốc */
                    body * { visibility: hidden !important; }
                    
                    /* Ép Modal phải mất thuộc tính căn giữa màn hình (thủ phạm cắt chữ) */
                    div[role="dialog"] {
                        transform: none !important;
                        left: 0 !important;
                        top: 0 !important;
                        position: absolute !important;
                        width: auto !important;
                        height: auto !important;
                        border: none !important;
                        box-shadow: none !important;
                        background: white !important;
                    }

                    /* Chỉ hiện riêng cái phiếu và mang nó ra góc trên cùng bên trái */
                    #printable-voucher, #printable-voucher * { visibility: visible !important; }
                    #printable-voucher { 
                        position: absolute !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        margin: 0 !important; 
                        padding: 10mm 15mm !important; 
                        width: 210mm !important; 
                        height: 148mm !important; /* Chuẩn A5 */
                        background: white !important;
                        color: black !important;
                        border: none !important;
                    }

                    /* Bắt buộc khổ giấy A5 Nằm Ngang (Landscape) */
                    @page { 
                        size: A5 landscape; 
                        margin: 0mm; 
                    }
                }
            `}} />
        </>
    );
}