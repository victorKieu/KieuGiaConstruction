import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    ArrowLeft, Printer, Building2, User, Phone, MapPin,
    Calendar, Package, Truck, CreditCard
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Import Server Actions
import { getPurchaseOrderById, getPOTransactions } from "@/lib/action/procurement";

// ✅ Import Component Dialog (Tái sử dụng code)
import GoodsReceiptDialog from "@/components/inventory/GoodsReceiptDialog";
import { PaymentDialog } from "@/components/procurement/payment-dialog";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    // 1. Lấy ID (Next.js 15)
    const { id } = await params;

    // 2. Fetch dữ liệu
    const [po, transactions] = await Promise.all([
        getPurchaseOrderById(id),
        getPOTransactions(id)
    ]);

    if (!po) notFound();

    // 3. Tính toán
    const totalPaid = transactions.reduce((sum: number, t: any) => sum + Number(t.amount), 0);
    const remainingAmount = po.total_amount - totalPaid;

    const money = (val: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

    const StatusBadge = ({ status }: { status: string }) => {
        const map: any = {
            draft: { label: "Nháp / Chờ duyệt", color: "bg-slate-100 text-slate-600" },
            ordered: { label: "Đang đặt hàng", color: "bg-blue-100 text-blue-700" },
            received: { label: "Đã nhập kho", color: "bg-green-100 text-green-700" },
            completed: { label: "Hoàn thành", color: "bg-slate-800 text-white" },
            cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700" }
        };
        const conf = map[status] || map.draft;
        return <Badge variant="outline" className={`${conf.color} border-0 px-3 py-1`}>{conf.label}</Badge>;
    };

    return (
        <div className="flex-1 p-8 pt-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">

            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" asChild>
                        <Link href="/procurement/orders"><ArrowLeft className="w-4 h-4" /></Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
                            Đơn hàng #{po.code}
                            <StatusBadge status={po.status} />
                        </h2>
                        <p className="text-sm text-slate-500">Tạo ngày {format(new Date(po.order_date), "dd 'tháng' MM, yyyy", { locale: vi })}</p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline"><Printer className="w-4 h-4 mr-2" /> In phiếu</Button>

                    {/* NÚT SỬA */}
                    {(po.status === 'draft' || po.status === 'ordered') && (
                        <Button variant="secondary" asChild>
                            <Link href={`/procurement/orders/${po.id}/edit`}>Chỉnh sửa</Link>
                        </Button>
                    )}

                    {/* ✅ COMPONENT NHẬP KHO */}
                    {po.status === 'ordered' && (
                        <GoodsReceiptDialog
                            po={po}
                            warehouseId={po.warehouse_id || ""} // Truyền kho mặc định
                        />
                    )}

                    {/* ✅ COMPONENT THANH TOÁN */}
                    {remainingAmount > 0 && po.status !== 'cancelled' && (
                        <PaymentDialog
                            poId={po.id}
                            poCode={po.code}
                            projectId={po.project_id}
                            remainingAmount={remainingAmount}
                        />
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                {/* CỘT TRÁI: THÔNG TIN CHÍNH */}
                <div className="md:col-span-2 space-y-6">
                    {/* THÔNG TIN NCC */}
                    <Card>
                        <CardHeader className="bg-slate-50 py-3 border-b"><CardTitle className="text-sm font-bold text-slate-700">Thông tin chung</CardTitle></CardHeader>
                        <CardContent className="p-4 grid grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-400 uppercase">Nhà cung cấp</div>
                                <div className="font-bold text-lg text-blue-700">{po.supplier?.name}</div>
                                <div className="text-sm text-slate-600 flex items-center gap-2"><User className="w-3 h-3" /> {po.supplier?.contact_person || "---"}</div>
                                <div className="text-sm text-slate-600 flex items-center gap-2"><Phone className="w-3 h-3" /> {po.supplier?.phone || "---"}</div>
                            </div>
                            <div className="space-y-1">
                                <div className="text-xs font-bold text-slate-400 uppercase">Dự án</div>
                                <div className="font-bold text-slate-800">{po.project?.name}</div>
                                <div className="text-sm text-slate-500 flex items-center gap-2"><Building2 className="w-3 h-3" /> {po.project?.code}</div>
                                <div className="text-sm text-slate-500 flex items-center gap-2"><MapPin className="w-3 h-3" /> {po.project?.address || "---"}</div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CHI TIẾT VẬT TƯ */}
                    <Card>
                        <CardHeader className="bg-slate-50 py-3 border-b"><CardTitle className="text-sm font-bold text-slate-700">Chi tiết vật tư</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Tên hàng</TableHead>
                                        <TableHead className="text-center">ĐVT</TableHead>
                                        <TableHead className="text-right">SL</TableHead>
                                        <TableHead className="text-right">Đơn giá</TableHead>
                                        <TableHead className="text-right">Thành tiền</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.items.map((item: any) => (
                                        <TableRow key={item.id}>
                                            <TableCell className="font-medium">{item.item_name}</TableCell>
                                            <TableCell className="text-center text-slate-500">{item.unit}</TableCell>
                                            <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                                            <TableCell className="text-right text-slate-600">{money(item.unit_price)}</TableCell>
                                            <TableCell className="text-right font-bold text-slate-800">
                                                {money(item.quantity * item.unit_price * (1 + (item.vat_rate || 0) / 100))}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            <div className="p-4 flex justify-end border-t bg-slate-50/50">
                                <div className="w-1/2 space-y-2">
                                    <div className="flex justify-between text-lg font-bold text-blue-700">
                                        <span>TỔNG CỘNG:</span>
                                        <span>{money(po.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CỘT PHẢI: TÀI CHÍNH */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="bg-slate-50 py-3 border-b"><CardTitle className="text-sm font-bold text-slate-700">Tài chính</CardTitle></CardHeader>
                        <CardContent className="p-4 space-y-4">
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Đã thanh toán:</span>
                                    <span className="font-bold text-green-600">{money(totalPaid)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-slate-500">Còn nợ:</span>
                                    <span className="font-bold text-red-600">{money(remainingAmount)}</span>
                                </div>
                                <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-2">
                                    <div
                                        className="h-full bg-green-500 transition-all"
                                        style={{ width: `${Math.min(100, (totalPaid / po.total_amount) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            <Separator />

                            {/* Lịch sử giao dịch */}
                            <div className="space-y-2">
                                <div className="text-xs font-bold text-slate-400 uppercase mb-2">Lịch sử giao dịch</div>
                                {transactions.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic">Chưa có giao dịch nào.</p>
                                ) : (
                                    transactions.map((t: any) => (
                                        <div key={t.id} className="flex justify-between text-xs border-b border-dashed pb-1 last:border-0">
                                            <div>
                                                <div className="font-medium text-slate-700">{format(new Date(t.transaction_date), "dd/MM/yy")}</div>
                                                <div className="text-[10px] text-slate-400">{t.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</div>
                                            </div>
                                            <div className="font-bold text-slate-800">{money(t.amount)}</div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {po.notes && (
                        <Card>
                            <CardHeader className="bg-slate-50 py-3 border-b"><CardTitle className="text-sm font-bold text-slate-700">Ghi chú</CardTitle></CardHeader>
                            <CardContent className="p-4">
                                <p className="text-sm text-slate-600 whitespace-pre-line">{po.notes}</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}