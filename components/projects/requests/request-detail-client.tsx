"use client";

import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { ArrowLeft, Edit, Printer, CheckCircle2, XCircle, Clock, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export default function RequestDetailClient({ request }: { request: any }) {
    const router = useRouter();
    if (!request) return <div className="p-8 text-center text-slate-500">Không tìm thấy dữ liệu phiếu yêu cầu.</div>;

    // --- 1. HÀM VIỆT HÓA MỨC ĐỘ ƯU TIÊN ---
    const getPriorityLabel = (priority: string) => {
        switch (priority?.toLowerCase()) {
            case 'urgent': return { label: 'Khẩn cấp', color: 'bg-red-100 text-red-700 border-red-200' };
            case 'high': return { label: 'Cao', color: 'bg-orange-100 text-orange-700 border-orange-200' };
            default: return { label: 'Bình thường', color: 'bg-blue-100 text-blue-700 border-blue-200' };
        }
    };

    // --- HÀM VIỆT HÓA TRẠNG THÁI ---
    const getStatusLabel = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'approved': return { label: 'Đã duyệt', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="w-3 h-3 mr-1" /> };
            case 'rejected': return { label: 'Từ chối', color: 'bg-red-100 text-red-700 border-red-200', icon: <XCircle className="w-3 h-3 mr-1" /> };
            default: return { label: 'Chờ duyệt', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: <Clock className="w-3 h-3 mr-1" /> };
        }
    };

    const prio = getPriorityLabel(request.priority);
    const stat = getStatusLabel(request.status);

    // --- 3. HÀM IN PHIẾU ---
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6 max-w-5xl mx-auto animate-in fade-in">

            {/* THAH CÔNG CỤ (Sẽ bị ẩn khi in nhờ class print:hidden) */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden">
                <Button variant="ghost" onClick={() => router.push(`/projects/${request.project_id}/?tab=requests`)} className="hover:bg-slate-100">
                    <ArrowLeft className="w-4 h-4 mr-2" /> Quay lại
                </Button>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                    {/* NÚT IN PHIẾU */}
                    <Button variant="outline" onClick={handlePrint} className="flex-1 sm:flex-none border-slate-300">
                        <Printer className="w-4 h-4 mr-2" /> In phiếu
                    </Button>

                    {/* 2. NÚT CHỈNH SỬA (Chỉ hiện khi phiếu đang chờ duyệt) */}
                    {request.status === 'pending' && (
                        <Button
                            variant="default"
                            // Phải dùng template string với dấu / ở đầu để Next.js hiểu đây là đường dẫn gốc
                            onClick={() => router.push(`/projects/${request.project_id}/requests/${request.id}/edit`)}
                            className="..."
                        >
                            <Edit className="w-4 h-4 mr-2" /> Sửa phiếu
                        </Button>
                    )}
                </div>
            </div>

            {/* KHU VỰC IN ẤN (Phần Header Ẩn trên UI, chỉ hiện trên giấy in) */}
            <div className="hidden print:block text-center border-b border-black pb-4 mb-6">
                <div className="flex items-center justify-center gap-2 mb-2">
                    <Building2 className="w-6 h-6" />
                    <h2 className="text-2xl font-bold uppercase tracking-wide">CÔNG TY KIỀU GIA</h2>
                </div>
                <h3 className="text-xl font-bold mt-2">PHIẾU YÊU CẦU MUA SẮM</h3>
                <p className="text-sm italic mt-1">Mã phiếu: {request.code}</p>
            </div>

            {/* NỘI DUNG CHÍNH */}
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm print:border-none print:shadow-none">
                <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 print:bg-transparent print:border-black print:p-0 print:mb-4">
                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
                        <div>
                            <CardTitle className="text-xl text-slate-800 dark:text-slate-100 print:text-black">
                                {request.code} - Đề xuất mua sắm
                            </CardTitle>
                            <p className="text-sm text-muted-foreground mt-1 print:text-black">
                                Người yêu cầu: <span className="font-semibold text-slate-700 dark:text-slate-300 print:text-black">{request.requester?.name || 'N/A'}</span>
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`${stat.color} flex items-center print:border-black print:text-black`}>
                                {stat.icon} {stat.label}
                            </Badge>
                            <Badge variant="outline" className={`${prio.color} print:border-black print:text-black`}>
                                Ưu tiên: {prio.label}
                            </Badge>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="pt-6 print:p-0">
                    {/* THÔNG TIN CHI TIẾT */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="space-y-1">
                            <p className="text-sm text-slate-500 print:text-black font-medium">Ngày lập phiếu:</p>
                            <p className="font-medium">{format(new Date(request.created_at), "dd/MM/yyyy HH:mm")}</p>
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm text-slate-500 print:text-black font-medium">Cần hàng trước ngày:</p>
                            <p className="font-medium text-red-600 print:text-black">{request.deadline_date ? format(new Date(request.deadline_date), "dd/MM/yyyy") : 'Không xác định'}</p>
                        </div>
                        <div className="space-y-1 md:col-span-2 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-lg print:bg-transparent print:border print:border-black">
                            <p className="text-sm text-slate-500 print:text-black font-medium mb-1">Nội dung / Lý do đề xuất:</p>
                            <p className="font-medium whitespace-pre-wrap">{request.notes || 'Không có ghi chú'}</p>
                        </div>
                    </div>

                    {/* DANH SÁCH MẶT HÀNG */}
                    <h4 className="font-bold text-slate-800 dark:text-slate-200 mb-3 print:text-black">Danh sách vật tư / thiết bị cần mua</h4>
                    <div className="border rounded-lg overflow-hidden print:border-black">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900/50 print:bg-transparent">
                                <TableRow className="print:border-b print:border-black">
                                    <TableHead className="w-12 text-center print:text-black font-bold">STT</TableHead>
                                    <TableHead className="print:text-black font-bold">Tên hàng / Vật tư</TableHead>
                                    <TableHead className="w-24 text-center print:text-black font-bold">Phân loại</TableHead>
                                    <TableHead className="w-24 text-right print:text-black font-bold">Số lượng</TableHead>
                                    <TableHead className="w-20 text-center print:text-black font-bold">ĐVT</TableHead>
                                    <TableHead className="print:text-black font-bold">Ghi chú</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {request.items?.map((item: any, index: number) => (
                                    <TableRow key={item.id} className="print:border-b print:border-black">
                                        <TableCell className="text-center font-medium">{index + 1}</TableCell>
                                        <TableCell className="font-medium">{item.item_name}</TableCell>
                                        <TableCell className="text-center text-xs">
                                            {item.item_category === 'asset' ? 'Tài sản' : 'Vật tư'}
                                        </TableCell>
                                        <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                                        <TableCell className="text-center">{item.unit}</TableCell>
                                        <TableCell className="text-sm text-slate-500 print:text-black">{item.notes}</TableCell>
                                    </TableRow>
                                ))}
                                {(!request.items || request.items.length === 0) && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                                            Không có mặt hàng nào.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    {/* CHỮ KÝ DÀNH CHO BẢN IN */}
                    <div className="hidden print:grid grid-cols-3 gap-4 mt-16 text-center">
                        <div>
                            <p className="font-bold">Người lập phiếu</p>
                            <p className="text-sm italic">(Ký, ghi rõ họ tên)</p>
                            <div className="mt-20 font-semibold">{request.requester?.name}</div>
                        </div>
                        <div>
                            <p className="font-bold">Kế toán / Procurement</p>
                            <p className="text-sm italic">(Ký, ghi rõ họ tên)</p>
                        </div>
                        <div>
                            <p className="font-bold">Giám đốc duyệt</p>
                            <p className="text-sm italic">(Ký, đóng dấu)</p>
                        </div>
                    </div>

                </CardContent>
            </Card>
        </div>
    );
}