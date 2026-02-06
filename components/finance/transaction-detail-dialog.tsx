"use client";

import { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import { Printer, X, FileText, Edit, Save, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { formatCurrency } from "@/lib/utils/utils";
import { readMoneyToText } from "@/lib/utils/readNumber"; // Đảm bảo đường dẫn đúng file bạn đang có
import { toast } from "sonner";
import { updateTransactionAction } from "@/lib/action/finance";
import { getCompanyInfo } from "@/lib/constants/company";

interface Props {
    transaction: any;
    open: boolean;
    setOpen: (v: boolean) => void;
}

export function TransactionDetailDialog({ transaction, open, setOpen }: Props) {
    const printRef = useRef<HTMLDivElement>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const company = getCompanyInfo();

    const [formData, setFormData] = useState({
        personName: "",
        address: "",
        description: "",
        amount: 0,
        date: new Date()
    });

    useEffect(() => {
        if (transaction && open) {
            initializeData();
            setIsEditing(false);
        }
    }, [transaction, open]);

    const initializeData = () => {
        let pName = "";
        let pAddr = "";

        if (!pName) {
            const invoiceData = transaction.invoice;
            const supplierInfo = invoiceData?.po?.supplier || (Array.isArray(invoiceData?.po) ? invoiceData?.po[0]?.supplier : null);

            if (supplierInfo) {
                pName = supplierInfo.contact_person
                    ? `${supplierInfo.name} (ĐD: ${supplierInfo.contact_person})`
                    : supplierInfo.name;
                pAddr = supplierInfo.address || "";
            } else if (transaction.project) {
                const customer = transaction.project.customer;
                if (customer) {
                    pName = customer.contact_person
                        ? `${customer.contact_person} (KH: ${customer.name})`
                        : customer.name;
                    pAddr = customer.address || transaction.project.address || "";
                } else {
                    pName = `Ban QLDA: ${transaction.project.name}`;
                    pAddr = transaction.project.address || "";
                }
            }
        }

        setFormData({
            personName: pName || "................................................................",
            address: pAddr || "................................................................",
            description: transaction.description || "",
            amount: Number(transaction.amount) || 0,
            date: new Date(transaction.transaction_date)
        });
    };

    const isIncome = transaction?.type === 'income';
    const title = isIncome ? "PHIẾU THU" : "PHIẾU CHI";
    const formNumber = isIncome ? "Mẫu số 01-TT" : "Mẫu số 02-TT";
    const personLabel = isIncome ? "Người nộp tiền" : "Người nhận tiền";

    const handleSave = async () => {
        setLoading(true);
        const res = await updateTransactionAction(transaction.id, {
            description: formData.description,
            amount: formData.amount,
            transaction_date: formData.date.toISOString(),
        });
        setLoading(false);
        if (res.success) {
            toast.success("Đã cập nhật phiếu!");
            setIsEditing(false);
        } else {
            toast.error(res.error);
        }
    };

    // --- CẤU HÌNH IN A5 NGANG ---
    const handlePrint = () => {
        if (!printRef.current) return;
        const printContent = printRef.current.innerHTML;

        // Mở cửa sổ in với kích thước mô phỏng A5 ngang
        const printWindow = window.open('', '', 'width=800,height=600');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>In ${title}</title>
                        <style>
                            /* Thiết lập trang in A5 Ngang (Landscape) */
                            @page { 
                                size: A5 landscape; 
                                margin: 0; 
                            }
                            
                            body { 
                                font-family: 'Times New Roman', serif; 
                                padding: 10mm 15mm; /* Căn lề thủ công để nội dung nằm giữa đẹp */
                                margin: 0;
                                width: 210mm; /* Chiều rộng A5 ngang */
                                box-sizing: border-box;
                            }

                            .print-container {
                                width: 100%;
                            }

                            /* Header: Thu nhỏ font một chút để tiết kiệm chiều cao */
                            .header { display: flex; justify-content: space-between; margin-bottom: 10px; }
                            .company-info { font-weight: bold; font-size: 10pt; text-transform: uppercase; line-height: 1.3; }
                            .meta-info { text-align: right; font-size: 10pt; font-style: italic; line-height: 1.3; }
                            
                            /* Title */
                            .title { text-align: center; font-size: 16pt; font-weight: bold; margin-top: 5px; margin-bottom: 2px; }
                            .date { text-align: center; font-style: italic; margin-bottom: 15px; font-size: 11pt; }
                            
                            /* Nội dung dòng */
                            .content-row { margin-bottom: 8px; display: flex; align-items: baseline; font-size: 12pt; }
                            .label { min-width: 130px; } /* Cố định độ rộng nhãn */
                            .value { font-weight: bold; flex: 1; padding-left: 5px; }
                            
                            /* Chữ ký */
                            .signatures { display: flex; justify-content: space-between; margin-top: 20px; text-align: center; }
                            .sign-col { width: 20%; }
                            .sign-title { font-weight: bold; font-size: 11pt; }
                            .sign-note { font-style: italic; font-size: 9pt; }
                            .sign-space { height: 60px; } /* Khoảng trống ký tên */

                            /* Reset input style khi in */
                            input, textarea { 
                                border: none !important; 
                                background: transparent !important; 
                                width: 100%; 
                                font-family: inherit; 
                                font-size: inherit; 
                                font-weight: bold; 
                                resize: none; 
                                padding: 0;
                                margin: 0;
                            }
                        </style>
                    </head>
                    <body>
                        <div class="print-container">
                            ${printContent}
                        </div>
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    if (!transaction) return null;

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-700">
                        <FileText className="w-5 h-5 text-blue-600" /> Chi tiết giao dịch
                    </DialogTitle>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setIsEditing(false)} disabled={loading}>Hủy</Button>
                                <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={handleSave} disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu
                                </Button>
                            </>
                        ) : (
                            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                                <Edit className="w-4 h-4 mr-2" /> Sửa
                            </Button>
                        )}
                        <Button variant="default" className="bg-blue-600 hover:bg-blue-700" onClick={handlePrint}>
                            <Printer className="w-4 h-4 mr-2" /> In Phiếu A5
                        </Button>
                    </div>
                </div>

                <div className="bg-slate-50 p-6 border rounded-lg shadow-inner overflow-x-auto">
                    {/* Vùng hiển thị mô phỏng tờ A5 trên màn hình */}
                    <div
                        ref={printRef}
                        className="bg-white mx-auto text-black shadow-lg"
                        style={{
                            fontFamily: '"Times New Roman", Times, serif',
                            width: '210mm',     // Chiều rộng A5 ngang mô phỏng
                            padding: '40px',    // Padding mô phỏng
                            boxSizing: 'border-box'
                        }}
                    >
                        {/* 1. Header */}
                        <div className="flex justify-between mb-4 header">
                            <div className="w-[60%]">
                                <div className="font-bold text-sm uppercase company-info">{company.name}</div>
                                <div className="text-xs">ĐC: {company.address}</div>
                                <div className="text-xs">MST: {company.taxCode}</div>
                            </div>
                            <div className="text-right text-xs w-[40%] meta-info">
                                <div className="font-bold">{formNumber}</div>
                                <div className="italic">(Ban hành theo TT số 200/2014/TT-BTC)</div>
                                <div className="mt-1">Số: <b>{transaction.id.slice(0, 8).toUpperCase()}</b></div>
                                <div>Quyển số: ..................</div>
                                {transaction.invoice?.invoice_number && <div>Kèm theo HĐ số: {transaction.invoice.invoice_number}</div>}
                            </div>
                        </div>

                        {/* 2. Title */}
                        <div className="text-center mb-4 title-block">
                            <div className="text-2xl font-bold uppercase title">{title}</div>
                            <div className="italic text-sm date">
                                Ngày {format(formData.date, "dd")} tháng {format(formData.date, "MM")} năm {format(formData.date, "yyyy")}
                            </div>
                        </div>

                        {/* 3. Content */}
                        <div className="text-sm leading-6 content-body" style={{ fontSize: '12pt' }}>
                            <div className="flex items-baseline mb-2 content-row">
                                <span className="min-w-[130px] label">Họ tên {personLabel}:</span>
                                <div className="flex-1 border-b border-dotted border-slate-400 px-2 font-bold value">
                                    {isEditing ? <Input value={formData.personName} onChange={e => setFormData({ ...formData, personName: e.target.value })} className="h-6 p-0 border-none shadow-none font-bold focus-visible:ring-0" /> : formData.personName}
                                </div>
                            </div>

                            <div className="flex items-baseline mb-2 content-row">
                                <span className="min-w-[130px] label">Địa chỉ:</span>
                                <div className="flex-1 border-b border-dotted border-slate-400 px-2 value">
                                    {isEditing ? <Input value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} className="h-6 p-0 border-none shadow-none focus-visible:ring-0" /> : formData.address}
                                </div>
                            </div>

                            <div className="flex items-baseline mb-2 content-row">
                                <span className="min-w-[130px] label">Lý do {isIncome ? "nộp" : "chi"}:</span>
                                <div className="flex-1 border-b border-dotted border-slate-400 px-2 value">
                                    {isEditing ? <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="min-h-[24px] p-0 border-none shadow-none resize-none focus-visible:ring-0 overflow-hidden" rows={1} /> : formData.description}
                                </div>
                            </div>

                            <div className="flex items-baseline mb-2 content-row">
                                <span className="min-w-[130px] label">Số tiền:</span>
                                <div className="flex-1 border-b border-dotted border-slate-400 px-2 font-bold value">
                                    {isEditing ? <Input type="number" value={formData.amount} onChange={e => setFormData({ ...formData, amount: Number(e.target.value) })} className="h-6 p-0 border-none shadow-none font-bold w-40 inline-block focus-visible:ring-0" /> : formatCurrency(formData.amount)}
                                </div>
                            </div>

                            <div className="flex items-baseline mb-2 content-row">
                                <span className="min-w-[130px] label">Viết bằng chữ:</span>
                                <div className="italic font-bold border-b border-dotted border-slate-400 flex-1 px-2 value">
                                    {readMoneyToText(formData.amount)}
                                </div>
                            </div>

                            <div className="flex items-baseline mb-2 content-row">
                                <span className="min-w-[130px] label">Kèm theo:</span>
                                <div className="border-b border-dotted border-slate-400 flex-1 px-2 value">
                                    ........................................................................... chứng từ gốc.
                                </div>
                            </div>
                        </div>

                        {/* 4. Signatures */}
                        <div className="flex justify-between mt-6 text-center text-sm signatures">
                            <div className="w-1/5 sign-col"><div className="font-bold sign-title">Giám đốc</div><div className="italic text-xs sign-note">(Ký, họ tên, đóng dấu)</div><div className="h-16 sign-space"></div></div>
                            <div className="w-1/5 sign-col"><div className="font-bold sign-title">Kế toán trưởng</div><div className="italic text-xs sign-note">(Ký, họ tên)</div><div className="h-16 sign-space"></div></div>
                            <div className="w-1/5 sign-col"><div className="font-bold sign-title">Người lập phiếu</div><div className="italic text-xs sign-note">(Ký, họ tên)</div><div className="h-16 sign-space"></div></div>
                            <div className="w-1/5 sign-col"><div className="font-bold sign-title">{personLabel}</div><div className="italic text-xs sign-note">(Ký, họ tên)</div><div className="h-16 sign-space"></div></div>
                        </div>

                        <div className="text-xs italic text-center mt-2">
                            (Đã nhận đủ số tiền (viết bằng chữ): ............................................................................................................................)
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}