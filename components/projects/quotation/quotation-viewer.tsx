"use client"

import React, { useRef, useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, Download, FileText, Loader2 } from "lucide-react";
import { formatDateVN } from "@/lib/utils/utils";
import { readMoneyToText } from "@/lib/utils/readNumber";

const LOGO_URL = "/images/logo.png";

interface QuotationViewerProps {
    quotation: any;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function QuotationViewer({ quotation, open, onOpenChange }: QuotationViewerProps) {
    const printRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = useState(false);

    // Tính toán lại tổng tiền từ items để đảm bảo chính xác khi view
    const { preTaxTotal, vatTotal, totalAmount } = useMemo(() => {
        if (!quotation || !quotation.items) return { preTaxTotal: 0, vatTotal: 0, totalAmount: 0 };
        let pre = 0; let vat = 0;
        quotation.items.forEach((item: any) => {
            if (item.item_type !== 'section') {
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unit_price) || 0;
                const amount = qty * price;
                const v = amount * (Number(item.vat_rate) || 0) / 100;
                pre += amount;
                vat += v;
            }
        });
        return { preTaxTotal: pre, vatTotal: vat, totalAmount: pre + vat };
    }, [quotation]);

    // Xử lý In trực tiếp
    const handlePrintAction = () => {
        if (!printRef.current) return;
        const printContent = printRef.current.outerHTML;

        const printWindow = window.open('', '', 'width=1000,height=800');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>In Báo Giá - ${quotation?.quotation_number}</title>
                        <style>
                            @page { size: A4 landscape; margin: 10; }
                            body { 
                                margin: 0; 
                                padding: 0; 
                                background: #fff; 
                                display: flex; 
                                justify-content: center; 
                            }
                            .print-container { box-shadow: none !important; }
                            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                        </style>
                    </head>
                    <body>
                        ${printContent}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();

            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 500);
        }
    };

    // Xử lý xuất file PDF
    const handleExportPDF = async () => {
        if (!printRef.current) return;
        setIsExporting(true);
        try {
            const html2pdf = (await import('html2pdf.js')).default;
            const element = printRef.current;

            const opt = {
                margin: [10, 0, 10, 0] as [number, number, number, number],
                filename: `BaoGia_${quotation?.quotation_number || 'KG'}.pdf`,
                image: { type: 'jpeg' as const, quality: 1 },
                html2canvas: {
                    scale: 4,
                    useCORS: true,
                    letterRendering: true
                },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' as const }
            };

            await html2pdf().set(opt).from(element).save();
        } catch (error) {
            console.error("Lỗi khi xuất PDF:", error);
            alert("Đã xảy ra lỗi khi tạo file PDF.");
        } finally {
            setIsExporting(false);
        }
    };

    if (!quotation) return null;

    // ✅ NÂNG CẤP LẤY DỮ LIỆU: Tự động trích xuất thông tin từ Database Relations
    const customerName = quotation.customer_name || quotation.customers?.name || quotation.project?.customer?.name || 'QUÝ KHÁCH HÀNG';
    const projectName = quotation.project_name || quotation.projects?.name || quotation.project?.name || '';
    const address = quotation.address || quotation.projects?.address || quotation.projects?.location || quotation.project?.address || '';
    const title = quotation.title || quotation.project?.description || '';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-slate-200 dark:bg-slate-900 border-none transition-colors">
                <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-4 mb-4 sticky top-0 bg-slate-200 dark:bg-slate-900 z-10 pt-4 px-6 -mx-6 -mt-6 shadow-sm transition-colors">
                    <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 transition-colors">
                        <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Bản In / Xuất File Báo Giá
                        {quotation.status === 'accepted' && (
                            <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded border border-green-200">Đã chốt (Chỉ đọc)</span>
                        )}
                    </DialogTitle>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)} className="bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300">
                            Đóng
                        </Button>
                        <Button
                            variant="secondary"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md"
                            onClick={handleExportPDF}
                            disabled={isExporting}
                        >
                            {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                            Xuất PDF
                        </Button>
                        <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md" onClick={handlePrintAction} disabled={isExporting}>
                            <Printer className="w-4 h-4 mr-2" /> In Trực Tiếp
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto pb-8 flex justify-center">
                    <div
                        ref={printRef}
                        className="print-container text-black"
                        style={{
                            width: '297mm',
                            minHeight: '210mm',
                            padding: '0 10mm 20mm 10mm',
                            boxSizing: 'border-box',
                            fontFamily: '"Times New Roman", Times, serif',
                            boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                            margin: '0 auto',
                            backgroundColor: '#ffffff'
                        }}
                    >
                        <style>{`
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            thead { display: table-header-group; }
                            .kg-avoid { page-break-inside: avoid; }
                            .kg-header { width: 100%; border: none; margin-bottom: 15px; }
                            .kg-header td { border: none; padding: 0; }
                            .kg-title-box { text-align: center; margin: 10px 0 15px; }
                            .kg-info-grid { display: grid; grid-template-columns: 115px 1fr 115px 1fr; gap: 4px 10px; margin-bottom: 15px; font-size: 11pt; }
                            .kg-table { width: 100%; border-collapse: collapse; font-size: 11pt; table-layout: fixed; }
                            .kg-table th, .kg-table td { border: 1px solid #000; padding: 4px 6px; color: #000; }
                            .kg-table th { background-color: #e5e7eb; text-align: center; font-weight: bold; vertical-align: middle; }
                            .kg-sec-row td { background-color: #f3f4f6; font-weight: bold; text-transform: uppercase; color: #000; }
                            .kg-tfoot td { text-align: right; font-weight: bold; border: 1px solid #000; padding: 4px 6px; color: #000; }
                            .kg-total-row td { background-color: #fff7ed; font-size: 13pt; color: #b91c1c; }
                            .kg-sign-box { display: flex; justify-content: space-around; margin-top: 20px; text-align: center; color: #000; }
                        `}</style>

                        <table className="kg-header">
                            <tbody>
                                <tr>
                                    <td width="100" style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                        <img src={LOGO_URL} style={{ maxHeight: '120px', width: 'auto', objectFit: 'contain' }} alt="Logo" />
                                    </td>
                                    <td style={{ paddingLeft: '15px', verticalAlign: 'middle', color: '#000' }}>
                                        <div style={{ fontSize: '13pt', fontWeight: 'bold', color: '#b91c1c', textTransform: 'uppercase', marginBottom: '2px' }}>CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA</div>
                                        <div style={{ fontSize: '10.5pt' }}>ĐC: 72 Đường số 1, Khu nhà ở Thắng Lợi, KP. Chiêu Liêu, P. Dĩ An, TP.HCM, Việt Nam</div>
                                        <div style={{ fontSize: '10.5pt' }}>Email: huy-kq@kieugia-construction.biz.vn - Hotline: 0918 265 365</div>
                                        <div style={{ fontSize: '10.5pt' }}>MST: 3703296412</div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="kg-title-box">
                            <h1 style={{ fontSize: '18pt', fontWeight: 'bold', textTransform: 'uppercase', color: '#b91c1c', margin: 0, letterSpacing: '1px' }}>BẢNG BÁO GIÁ</h1>
                            <div style={{ fontSize: '11pt', fontStyle: 'italic', marginTop: '3px', color: '#000' }}>Số: {quotation.quotation_number} | {formatDateVN(quotation.issue_date)}</div>
                        </div>

                        <div className="kg-info-grid" style={{ color: '#000' }}>
                            <div style={{ fontWeight: 'bold' }}>KÍNH GỬI:</div>
                            {/* ✅ FIX 2: Bơm dữ liệu Customer Name đã trích xuất */}
                            <div style={{ fontWeight: 'bold' }}>Ông/ Bà {customerName.toUpperCase()}</div>

                            <div style={{ fontWeight: 'bold', textAlign: 'right' }}>CÔNG TRÌNH:</div>
                            {/* ✅ FIX 2: Bơm dữ liệu Project Name đã trích xuất */}
                            <div style={{ fontWeight: 'bold' }}>{projectName.toUpperCase()}</div>

                            <div style={{ fontWeight: 'bold', gridColumn: '1 / 2' }}>HẠNG MỤC:</div>
                            <div style={{ gridColumn: '2 / -1' }}>{quotation.title}</div>

                            <div style={{ fontWeight: 'bold', gridColumn: '1 / 2' }}>ĐỊA ĐIỂM:</div>
                            {/* ✅ FIX 2: Bơm dữ liệu Address đã trích xuất */}
                            <div style={{ gridColumn: '2 / -1' }}>{address}</div>
                        </div>

                        <table className="kg-table">
                            <colgroup>
                                <col style={{ width: '5%' }} />
                                <col style={{ width: '34%' }} />
                                <col style={{ width: '6%' }} />
                                <col style={{ width: '8%' }} />
                                <col style={{ width: '12%' }} />
                                <col style={{ width: '13%' }} />
                                <col style={{ width: '22%' }} />
                            </colgroup>
                            <thead>
                                <tr>
                                    <th>STT</th>
                                    <th>Danh mục công tác / Diễn giải</th>
                                    <th>ĐVT</th>
                                    <th>Khối lượng</th>
                                    <th>Đơn giá (VNĐ)</th>
                                    <th>Thành tiền (VNĐ)</th>
                                    <th>Ghi chú</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(() => {
                                    let sectionIndex = 0; let itemIndex = 0;
                                    const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
                                    return (quotation.items || []).map((item: any, index: number) => {
                                        if (item.item_type === 'section') {
                                            const roman = romans[sectionIndex] || (sectionIndex + 1);
                                            sectionIndex++; itemIndex = 0;
                                            return (
                                                <tr key={index} className="kg-sec-row">
                                                    <td style={{ textAlign: 'center' }}>{roman}</td>
                                                    <td colSpan={6}>{item.work_item_name}</td>
                                                </tr>
                                            );
                                        } else {
                                            itemIndex++;
                                            const qty = Number(item.quantity) || 0;
                                            const price = Number(item.unit_price) || 0;
                                            const amount = qty * price;
                                            return (
                                                <tr key={index}>
                                                    <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '6px' }}>{itemIndex}</td>
                                                    <td style={{ verticalAlign: 'top', padding: '6px' }}>
                                                        <div style={{ fontWeight: 'bold' }}>{item.work_item_name}</div>
                                                        {item.details && item.details.split('\n').map((l: string, i: number) => (
                                                            <div key={i} style={{ fontSize: '10.5pt', color: '#4b5563', marginTop: '2px', fontStyle: 'italic' }}>{l}</div>
                                                        ))}
                                                    </td>
                                                    <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '6px' }}>{item.unit || ''}</td>
                                                    <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '6px' }}>{qty > 0 ? qty.toLocaleString('vi-VN', { maximumFractionDigits: 3 }) : ''}</td>
                                                    <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '6px' }}>{price > 0 ? price.toLocaleString('vi-VN') : ''}</td>
                                                    <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '6px', fontWeight: 'bold' }}>{amount > 0 ? amount.toLocaleString('vi-VN') : ''}</td>
                                                    <td style={{ textAlign: 'left', verticalAlign: 'top', paddingTop: '6px', fontSize: '10.5pt' }}>{item.notes || ''}</td>
                                                </tr>
                                            );
                                        }
                                    });
                                })()}
                                <tr className="kg-tfoot">
                                    <td colSpan={5}>Cộng trước thuế:</td>
                                    <td>{preTaxTotal.toLocaleString('vi-VN')}</td>
                                    <td></td>
                                </tr>
                                <tr className="kg-tfoot">
                                    <td colSpan={5}>Thuế VAT:</td>
                                    <td>{vatTotal.toLocaleString('vi-VN')}</td>
                                    <td></td>
                                </tr>
                                <tr className="kg-tfoot kg-total-row">
                                    <td colSpan={5}>TỔNG CỘNG:</td>
                                    <td style={{ color: '#b91c1c' }}>{totalAmount.toLocaleString('vi-VN')}</td>
                                    <td></td>
                                </tr>
                            </tbody>
                        </table>

                        <div className="kg-avoid" style={{ pageBreakInside: 'avoid', color: '#000', paddingBottom: '20px' }}>
                            <div style={{ marginTop: '10px', fontWeight: 'bold', fontStyle: 'italic', textAlign: 'right', fontSize: '12pt' }}>
                                Bằng chữ: {readMoneyToText(totalAmount)}
                            </div>
                            {quotation.notes && (
                                <div style={{ marginTop: '15px', border: '1px dashed #9ca3af', padding: '10px', fontSize: '11pt', whiteSpace: 'pre-wrap', textAlign: 'justify', background: '#fafafa' }}>
                                    <strong>* Ghi chú:</strong><br />
                                    {quotation.notes}
                                </div>
                            )}
                            <div className="kg-sign-box">
                                <div style={{ width: '40%' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>ĐẠI DIỆN KHÁCH HÀNG</div>
                                    <span style={{ fontStyle: 'italic', fontSize: '10.5pt', marginBottom: '60px', display: 'block' }}>(Ký, ghi rõ họ tên)</span>
                                </div>
                                <div style={{ width: '40%' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '12pt' }}>GIÁM ĐỐC</div>
                                    <span style={{ fontStyle: 'italic', fontSize: '10.5pt', marginBottom: '60px', display: 'block' }}>(Ký, đóng dấu)</span>
                                    <div style={{ fontWeight: 'bold', fontSize: '12pt', textTransform: 'uppercase', paddingBottom: '10px' }}>KIỀU QUANG HUY</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}