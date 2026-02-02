"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogTrigger, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, FileText } from "lucide-react";
import { useReactToPrint } from "react-to-print";
import { formatDate } from "@/lib/utils/utils";

// Mẫu in chuẩn (Giữ nguyên)
const PrintContent = ({ data, refProp }: { data: any, refProp: any }) => {
    return (
        <div ref={refProp} className="p-8 md:p-12 bg-white text-black font-serif max-w-[800px] mx-auto min-h-[1000px]">
            {/* Header Quốc Hiệu */}
            <div className="text-center mb-8">
                <h3 className="uppercase font-bold text-sm">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
                <p className="font-bold text-sm underline underline-offset-4">Độc lập - Tự do - Hạnh phúc</p>
                <div className="mt-4 text-right italic text-sm">
                    ........, ngày {new Date(data.issue_date).getDate()} tháng {new Date(data.issue_date).getMonth() + 1} năm {new Date(data.issue_date).getFullYear()}
                </div>
            </div>

            {/* Title */}
            <div className="text-center mb-8">
                <h1 className="uppercase font-bold text-2xl mb-2">
                    {data.doc_type === 'NOTICE_SUSPENSION' ? 'THÔNG BÁO TẠM DỪNG THI CÔNG' :
                        data.doc_type === 'HANDOVER_MINUTES' ? 'BIÊN BẢN BÀN GIAO CÔNG TRÌNH' :
                            data.doc_type === 'ORDER_COMMENCEMENT' ? 'LỆNH KHỞI CÔNG' :
                                data.doc_type === 'NOTICE_COMMENCEMENT' ? 'THÔNG BÁO KHỞI CÔNG' : 'VĂN BẢN PHÁP LÝ'}
                </h1>
                <p className="font-bold">Số: {data.doc_code}</p>
            </div>

            {/* Body */}
            <div className="space-y-4 text-justify leading-relaxed">
                <p><strong>Kính gửi:</strong> - Ban Giám Đốc Công ty<br /><span className="ml-20">- Ban Chỉ huy Công trình: {data.project_name}</span></p>

                <p>Căn cứ tình hình thực tế triển khai dự án <strong>{data.project_name}</strong>;</p>
                <p>Chúng tôi thông báo về việc {data.doc_type === 'NOTICE_SUSPENSION' ? 'tạm dừng' : 'triển khai'} thi công công trình với các nội dung sau:</p>

                <div className="pl-4 border-l-2 border-black/10 my-4">
                    <p><strong>1. Dự án:</strong> {data.project_name}</p>
                    <p><strong>2. Thời điểm áp dụng:</strong> {formatDate(data.issue_date)}</p>
                    <p><strong>3. Cơ quan ban hành:</strong> {data.issuing_authority}</p>
                    <p><strong>4. Nội dung chi tiết:</strong></p>
                    <p className="whitespace-pre-wrap mt-1">{data.notes || "Không có ghi chú chi tiết."}</p>
                </div>

                {data.doc_type === 'NOTICE_SUSPENSION' && (
                    <p className="italic text-sm mt-4">
                        * Yêu cầu Ban chỉ huy công trình thực hiện kiểm kê, chốt khối lượng và niêm phong kho bãi theo quy định kể từ thời điểm trên.
                    </p>
                )}
            </div>

            {/* Footer Signature */}
            <div className="flex justify-between mt-12 pt-8">
                <div className="text-center w-1/2">
                    <p className="font-bold uppercase">Người lập</p>
                    <p className="italic text-xs">(Ký, ghi rõ họ tên)</p>
                    <div className="h-24"></div>
                </div>
                <div className="text-center w-1/2">
                    <p className="font-bold uppercase">Thủ trưởng đơn vị</p>
                    <p className="italic text-xs">(Ký, đóng dấu)</p>
                    <div className="h-24"></div>
                    <p className="font-bold uppercase">Kiều Gia Construction</p>
                </div>
            </div>
        </div>
    );
};

export default function LegalDocPrintDialog({ doc, projectName }: { doc: any, projectName: string }) {
    const componentRef = useRef<HTMLDivElement>(null);

    // ✅ FIX LỖI "did not receive a contentRef": Dùng contentRef thay vì content
    const handlePrint = useReactToPrint({
        contentRef: componentRef, // API mới của react-to-print v3+
        documentTitle: `${doc.doc_code}_${doc.doc_type}`,
    });

    // Chuẩn bị data
    const printData = { ...doc, project_name: projectName };

    return (
        <Dialog>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon" title="In văn bản">
                    <Printer className="w-4 h-4 text-slate-600" />
                </Button>
            </DialogTrigger>

            <DialogContent className="max-w-[850px] h-[90vh] flex flex-col p-0 bg-slate-100" aria-describedby={undefined}>
                <div className="p-4 bg-white border-b flex justify-between items-center">
                    <DialogTitle className="font-bold flex items-center gap-2 text-lg">
                        <FileText className="w-4 h-4" /> Xem trước bản in
                    </DialogTitle>

                    <Button onClick={() => handlePrint()} className="bg-blue-600 hover:bg-blue-700">
                        <Printer className="w-4 h-4 mr-2" /> In ngay
                    </Button>
                </div>

                <div className="flex-1 overflow-auto p-8 flex justify-center">
                    {/* Phần hiển thị để in */}
                    <div className="shadow-lg">
                        <PrintContent refProp={componentRef} data={printData} />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}