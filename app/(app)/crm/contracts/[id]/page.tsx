import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building, Calendar, FileText, User } from "lucide-react";

// Logic Server Action
import { getContractById } from "@/lib/action/contract";

// Utils
import { cn, formatCurrency, formatDate, getStatusColor } from "@/lib/utils/utils";
import { isValidUUID } from "@/lib/utils/uuid"; // <-- Import hàm có sẵn của bạn

// UI Components
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ContractActions } from "@/components/crm/contracts/contract-actions";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ContractDetailPage({ params }: PageProps) {
    const { id } = await params;

    // --- BƯỚC QUAN TRỌNG: CHẶN LỖI 22P02 ---
    // Kiểm tra ngay lập tức: Nếu ID không phải UUID (ví dụ user vào "/contracts/new" hoặc gõ bậy)
    // thì trả về 404 luôn, không cho chạy tiếp xuống Database.
    if (!isValidUUID(id)) {
        notFound();
    }

    // --- Fetch dữ liệu an toàn ---
    const contract = await getContractById(id);

    if (!contract) {
        return notFound();
    }

    const customer = contract.customers;
    const statusColor = getStatusColor(contract.status);

    // Mapping trạng thái
    const statusLabel: Record<string, string> = {
        draft: "Bản nháp",
        signed: "Đã ký kết",
        processing: "Đang thi công",
        warranty: "Bảo hành",
        liquidated: "Đã thanh lý",
        cancelled: "Đã hủy",
    };

    return (
        <div className="flex flex-col h-full bg-muted/10 print:bg-white">
            <div className="flex-1 space-y-4 p-8 pt-6">

                {/* Header Navigation */}
                <div className="flex items-center justify-between print:hidden">
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                            <Link href="/crm/contracts">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h2 className="text-xl font-bold tracking-tight text-muted-foreground">
                            Chi tiết hợp đồng
                        </h2>
                    </div>
                    <ContractActions id={id} />
                </div>

                {/* Main Content */}
                <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto print:block print:w-full">

                    {/* Cột Trái: Thông tin chính */}
                    <div className="md:col-span-2 space-y-6">
                        <Card className="print:shadow-none print:border-0">
                            <CardHeader className="pb-4 border-b print:border-b-2 print:border-black">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-sm font-mono text-muted-foreground mb-1">
                                            {contract.contract_number}
                                        </p>
                                        <CardTitle className="text-2xl font-bold uppercase text-primary print:text-black">
                                            {contract.title}
                                        </CardTitle>
                                    </div>
                                    <Badge className={cn("print:hidden", statusColor)}>
                                        {statusLabel[contract.status] || contract.status}
                                    </Badge>
                                    {/* Badge in ấn */}
                                    <div className="hidden print:block font-bold border-2 border-black p-2 uppercase">
                                        {statusLabel[contract.status]}
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="pt-6 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-sm text-muted-foreground">Ngày ký kết</span>
                                        <div className="flex items-center gap-2 font-medium">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            {formatDate(contract.signed_date)}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm text-muted-foreground">Giá trị hợp đồng</span>
                                        <div className="flex items-center gap-2 font-bold text-lg text-green-700 print:text-black">
                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                            {formatCurrency(contract.value)}
                                        </div>
                                    </div>
                                </div>

                                <Separator />

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-sm text-muted-foreground">Ngày khởi công</span>
                                        <p className="font-medium">{formatDate(contract.start_date)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-sm text-muted-foreground">Ngày hoàn thành (Dự kiến)</span>
                                        <p className="font-medium">{formatDate(contract.end_date)}</p>
                                    </div>
                                </div>

                                <div className="bg-muted/30 p-4 rounded-lg min-h-[150px] print:bg-transparent print:p-0 print:border print:border-gray-300">
                                    <h4 className="font-semibold mb-2">Ghi chú / Điều khoản chính:</h4>
                                    <p className="text-sm text-muted-foreground">
                                        (Nội dung đang cập nhật...)
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Cột Phải: Thông tin khách hàng */}
                    <div className="space-y-6 print:break-inside-avoid">
                        <Card className="print:shadow-none print:border print:border-gray-300">
                            <CardHeader className="bg-muted/40 pb-3 print:bg-transparent">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <User className="h-4 w-4" /> Bên A (Chủ đầu tư)
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4">
                                <div>
                                    <p className="text-sm text-muted-foreground">Tên khách hàng</p>
                                    <Link href={`/crm/customers/${customer?.id}`} className="font-medium text-blue-700 hover:underline print:text-black print:no-underline">
                                        {customer?.name}
                                    </Link>
                                </div>

                                {customer?.company && (
                                    <div>
                                        <p className="text-sm text-muted-foreground">Công ty / Đại diện</p>
                                        <div className="flex items-center gap-2">
                                            <Building className="h-3 w-3 text-muted-foreground" />
                                            <span className="font-medium">{customer.company}</span>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <p className="text-sm text-muted-foreground">Liên hệ</p>
                                    <p className="text-sm">{customer?.phone}</p>
                                    <p className="text-sm">{customer?.email}</p>
                                </div>

                                <div>
                                    <p className="text-sm text-muted-foreground">Địa chỉ thi công</p>
                                    <p className="text-sm">{customer?.address || "Chưa cập nhật"}</p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                </div>

                {/* Footer in ấn */}
                <div className="hidden print:flex justify-between mt-12 pt-8 border-t-2 border-black">
                    <div className="text-center w-1/3">
                        <p className="font-bold mb-16">Đại diện Bên A</p>
                        <p>(Ký, ghi rõ họ tên)</p>
                    </div>
                    <div className="text-center w-1/3">
                        <p className="font-bold mb-16">Đại diện Kiều Gia Construction</p>
                        <p>(Ký, đóng dấu)</p>
                    </div>
                </div>
            </div>
        </div>
    );
}