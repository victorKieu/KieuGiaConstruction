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

// Bổ sung thêm companySettings vào props
export default function VoucherActions({ request, companySettings }: { request: any; companySettings?: any }) {
    const router = useRouter();

    const [previewOpen, setPreviewOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const [editPartner, setEditPartner] = useState(request.partner_name || request.requester?.name || "");
    const [editDesc, setEditDesc] = useState(request.description || "");
    const [editAmountRaw, setEditAmountRaw] = useState(Number(request.amount));
    const [editAmountDisplay, setEditAmountDisplay] = useState(new Intl.NumberFormat("vi-VN").format(Number(request.amount)));

    const isLocked = request.status === 'completed';
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

    return (
        <>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Mở menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[160px] dark:bg-slate-900 dark:border-slate-800">
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
                            <DropdownMenuItem onClick={handleDelete} className="cursor-pointer text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                                <Trash2 className="mr-2 h-4 w-4" />
                                <span>Xóa phiếu</span>
                            </DropdownMenuItem>
                        </>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>

            {/* MODAL 1: SỬA THÔNG TIN */}
            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Edit className="w-5 h-5 text-amber-500" /> Cập nhật Phiếu {isReceipt ? 'Thu' : 'Chi'}
                        </DialogTitle>
                        <DialogDescription>Chỉ áp dụng cho các phiếu chưa được giải ngân.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleUpdate} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Người giao dịch</Label>
                            <Input required value={editPartner} onChange={(e) => setEditPartner(e.target.value)} className="dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Lý do {isReceipt ? 'thu' : 'chi'}</Label>
                            <Input required value={editDesc} onChange={(e) => setEditDesc(e.target.value)} className="dark:bg-slate-950" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-slate-500">Số tiền (VNĐ)</Label>
                            <div className="relative">
                                <Input required type="text" value={editAmountDisplay} onChange={handleMoneyChange} className="font-bold text-lg text-blue-600 dark:bg-slate-950 pr-8" />
                                <span className="absolute right-3 top-2.5 text-slate-400 font-bold">đ</span>
                            </div>
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Hủy</Button>
                            <Button type="submit" disabled={loading} className="bg-amber-500 hover:bg-amber-600 text-white">
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu thay đổi
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: PREVIEW IN */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-[850px] bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-800">
                    <DialogHeader className="print:hidden">
                        <DialogTitle className="flex items-center gap-2 text-lg">
                            <Printer className="w-5 h-5 text-blue-600" /> Xem trước Phiếu {isReceipt ? 'Thu' : 'Chi'} (Mẫu A5)
                        </DialogTitle>
                        <DialogDescription>Kiểm tra kỹ thông tin trước khi in ra giấy chứng từ.</DialogDescription>
                    </DialogHeader>

                    <div className="overflow-x-auto py-4 print:py-0 print:overflow-visible">
                        <div
                            id="printable-voucher"
                            className="bg-white mx-auto shadow-md border border-slate-200 text-black relative"
                            style={{
                                fontFamily: '"Times New Roman", Times, serif',
                                width: '210mm',
                                minHeight: '148mm',
                                padding: '20px 30px'
                            }}
                        >
                            <div className="flex justify-between items-start mb-6">
                                <div>
                                    {/* Dữ liệu công ty được lấy động từ DB */}
                                    <h2 className="font-bold text-sm uppercase">{companySettings?.name || "TÊN CÔNG TY..."}</h2>
                                    <p className="text-xs">Địa chỉ: {companySettings?.address || "Đang cập nhật..."}</p>
                                </div>
                                <div className="text-center text-xs">
                                    <p className="font-bold">Mẫu số 01 - TT</p>
                                    <p>(Ban hành theo Thông tư 99/2025/TT-BTC)</p>
                                </div>
                            </div>

                            <div className="text-center mb-6">
                                <h1 className="text-2xl font-bold uppercase">{isReceipt ? 'PHIẾU THU' : 'PHIẾU CHI'}</h1>
                                <p className="text-sm italic mt-1">Ngày {format(new Date(request.created_at), 'dd')} tháng {format(new Date(request.created_at), 'MM')} năm {format(new Date(request.created_at), 'yyyy')}</p>
                                <p className="text-sm mt-1">Số: <span className="font-bold">{request.request_code}</span></p>
                            </div>

                            <div className="space-y-3 text-sm flex-1 leading-relaxed">
                                <div className="flex gap-2 items-end">
                                    <span className="w-48 whitespace-nowrap">{isReceipt ? 'Họ tên người nộp tiền:' : 'Họ tên người nhận tiền:'}</span>
                                    <span className="font-bold border-b border-dotted border-slate-400 flex-1">{request.partner_name || request.requester?.name || ''}</span>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <span className="w-48 whitespace-nowrap">Địa chỉ / Bộ phận:</span>
                                    <span className="border-b border-dotted border-slate-400 flex-1"></span>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <span className="w-48 whitespace-nowrap">Lý do {isReceipt ? 'thu' : 'chi'}:</span>
                                    <span className="border-b border-dotted border-slate-400 flex-1">{request.description}</span>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <span className="w-48 whitespace-nowrap">Số tiền:</span>
                                    <span className="font-bold border-b border-dotted border-slate-400 flex-1 text-base">{formatCurrency(request.amount)}</span>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <span className="w-48 whitespace-nowrap">Viết bằng chữ:</span>
                                    <span className="border-b border-dotted border-slate-400 flex-1 italic font-medium">
                                        {readMoneyToText(Number(request.amount))}
                                    </span>
                                </div>
                                <div className="flex gap-2 items-end">
                                    <span className="w-48 whitespace-nowrap">Kèm theo:</span>
                                    <span className="border-b border-dotted border-slate-400 w-24 text-center">............</span>
                                    <span className="">chứng từ gốc.</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-4 gap-4 text-center mt-10 text-sm">
                                <div>
                                    <p className="font-bold">Giám đốc</p>
                                    <p className="italic text-xs mb-16">(Ký, họ tên, đóng dấu)</p>
                                </div>
                                <div>
                                    <p className="font-bold">Kế toán trưởng</p>
                                    <p className="italic text-xs mb-16">(Ký, họ tên)</p>
                                </div>
                                <div>
                                    <p className="font-bold">{isReceipt ? 'Người nộp' : 'Người nhận'}</p>
                                    <p className="italic text-xs mb-16">(Ký, họ tên)</p>
                                </div>
                                <div>
                                    <p className="font-bold">Thủ quỹ</p>
                                    <p className="italic text-xs mb-16">(Ký, họ tên)</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="print:hidden border-t dark:border-slate-800 pt-4">
                        <Button variant="outline" onClick={() => setPreviewOpen(false)} className="dark:text-slate-200">
                            Hủy bỏ
                        </Button>
                        <Button onClick={handlePrint} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                            <Printer className="w-4 h-4 mr-2" /> Thực hiện In
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <style dangerouslySetInnerHTML={{
                __html: `
                @media print {
                    body * { visibility: hidden; }
                    #printable-voucher, #printable-voucher * { visibility: visible; }
                    #printable-voucher { 
                        position: absolute; 
                        left: 0; 
                        top: 0; 
                        margin: 0; 
                        padding: 10mm; 
                        width: 210mm; 
                        height: 148mm; 
                        border: none; 
                        box-shadow: none; 
                    }
                    @page { size: A5 landscape; margin: 0; }
                }
            `}} />
        </>
    );
}