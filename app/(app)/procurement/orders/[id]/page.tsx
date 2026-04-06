import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import {
    ArrowLeft, Printer, Building2, User, Phone, MapPin,
    Calendar, Package, Truck, CreditCard, Edit3
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

// Import Server Actions
import { getPurchaseOrderById, getPOTransactions } from "@/lib/action/procurement";

// ✅ Import Component Dialog
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
            draft: { label: "Nháp / Chờ duyệt", color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
            ordered: { label: "Đang đặt hàng", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
            received: { label: "Đã nhập kho", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
            completed: { label: "Hoàn thành", color: "bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900" },
            cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" }
        };
        const conf = map[status] || map.draft;
        return <Badge variant="outline" className={`${conf.color} border-0 px-3 py-1 font-bold shadow-sm transition-colors`}>{conf.label}</Badge>;
    };

    return (
        <div className="flex-1 p-4 md:p-8 pt-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 transition-colors duration-500">

            {/* TOOLBAR */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:hidden">
                <div className="flex items-center gap-4">
                    <Button variant="outline" size="icon" className="dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 transition-colors" asChild>
                        <Link href="/procurement/orders"><ArrowLeft className="w-4 h-4" /></Link>
                    </Button>
                    <div>
                        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex flex-wrap items-center gap-3 transition-colors">
                            Đơn hàng #{po.code}
                            <StatusBadge status={po.status} />
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                            Tạo ngày {format(new Date(po.order_date), "dd 'tháng' MM, yyyy", { locale: vi })}
                        </p>
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" className="dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800 transition-colors">
                        <Printer className="w-4 h-4 mr-2" /> In phiếu
                    </Button>

                    {/* NÚT SỬA */}
                    {(po.status === 'draft' || po.status === 'ordered') && (
                        <Button variant="secondary" className="dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors" asChild>
                            <Link href={`/procurement/orders/${po.id}/edit`}>
                                <Edit3 className="w-4 h-4 mr-2" /> Chỉnh sửa
                            </Link>
                        </Button>
                    )}

                    {/* NHẬP KHO */}
                    {po.status === 'ordered' && (
                        <GoodsReceiptDialog
                            po={po}
                            warehouseId={po.warehouse_id || ""}
                        />
                    )}

                    {/* THANH TOÁN */}
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
                    {/* THÔNG TIN NCC & DỰ ÁN */}
                    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm transition-colors">
                        <CardHeader className="bg-slate-50 dark:bg-slate-950/50 py-3 border-b dark:border-slate-800 transition-colors">
                            <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Thông tin giao dịch</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-3">
                                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Nhà cung cấp</div>
                                <div className="font-black text-xl text-blue-700 dark:text-blue-400 transition-colors">{po.supplier?.name}</div>
                                <div className="space-y-2">
                                    <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2.5 transition-colors"><User className="w-4 h-4 text-slate-400" /> {po.supplier?.contact_person || "---"}</div>
                                    <div className="text-sm text-slate-600 dark:text-slate-300 flex items-center gap-2.5 transition-colors"><Phone className="w-4 h-4 text-slate-400" /> {po.supplier?.phone || "---"}</div>
                                </div>
                            </div>
                            <div className="space-y-3">
                                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Dự án thi công</div>
                                <div className="font-bold text-lg text-slate-800 dark:text-slate-200 transition-colors">{po.project?.name}</div>
                                <div className="space-y-2">
                                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2.5 transition-colors"><Building2 className="w-4 h-4" /> {po.project?.code}</div>
                                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-start gap-2.5 transition-colors"><MapPin className="w-4 h-4 mt-0.5 shrink-0" /> <span className="leading-snug">{po.project?.address || "---"}</span></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CHI TIẾT VẬT TƯ */}
                    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
                        <CardHeader className="bg-slate-50 dark:bg-slate-950/50 py-3 border-b dark:border-slate-800 transition-colors">
                            <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Bảng kê chi tiết vật tư</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-slate-50/50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                                            <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tên hàng / Quy cách</TableHead>
                                            <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">ĐVT</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">SL</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Đơn giá</TableHead>
                                            <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Thành tiền</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                        {po.items.map((item: any) => (
                                            <TableRow key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-none">
                                                <TableCell className="font-semibold text-slate-800 dark:text-slate-200 transition-colors">{item.item_name}</TableCell>
                                                <TableCell className="text-center text-slate-500 dark:text-slate-400 font-medium transition-colors">{item.unit}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-900 dark:text-slate-100 transition-colors">{item.quantity.toLocaleString()}</TableCell>
                                                <TableCell className="text-right text-slate-600 dark:text-slate-400 transition-colors">{money(item.unit_price)}</TableCell>
                                                <TableCell className="text-right font-bold text-slate-800 dark:text-slate-200 transition-colors">
                                                    {money(item.quantity * item.unit_price * (1 + (item.vat_rate || 0) / 100))}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <div className="p-6 flex justify-end border-t dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 transition-colors">
                                <div className="w-full sm:w-1/2 space-y-3">
                                    <div className="flex justify-between text-lg font-black text-blue-700 dark:text-blue-400 transition-colors tracking-tight">
                                        <span className="uppercase text-sm mt-1">Tổng cộng đơn hàng:</span>
                                        <span>{money(po.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* CỘT PHẢI: TÀI CHÍNH & GHI CHÚ */}
                <div className="space-y-6">
                    <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm transition-colors">
                        <CardHeader className="bg-slate-50 dark:bg-slate-950/50 py-3 border-b dark:border-slate-800 transition-colors">
                            <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Tình hình thanh toán</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6 transition-colors">
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm transition-colors">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Đã thanh toán:</span>
                                    <span className="font-bold text-green-600 dark:text-green-400">{money(totalPaid)}</span>
                                </div>
                                <div className="flex justify-between text-sm transition-colors">
                                    <span className="text-slate-500 dark:text-slate-400 font-medium">Dư nợ còn lại:</span>
                                    <span className="font-bold text-red-600 dark:text-red-400">{money(remainingAmount)}</span>
                                </div>
                                <div className="h-3 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-4 shadow-inner transition-colors">
                                    <div
                                        className="h-full bg-green-500 dark:bg-green-600 transition-all duration-700 ease-out"
                                        style={{ width: `${Math.min(100, (totalPaid / po.total_amount) * 100)}%` }}
                                    />
                                </div>
                                <p className="text-[10px] text-center text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest pt-1">
                                    Hoàn thành {Math.round((totalPaid / po.total_amount) * 100)}%
                                </p>
                            </div>

                            <Separator className="dark:bg-slate-800" />

                            {/* Lịch sử giao dịch */}
                            <div className="space-y-4">
                                <div className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <CreditCard className="w-3 h-3" /> Lịch sử chi tiền
                                </div>
                                {transactions.length === 0 ? (
                                    <p className="text-xs text-slate-400 dark:text-slate-600 italic transition-colors">Chưa có dữ liệu giao dịch chi tiền.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {transactions.map((t: any) => (
                                            <div key={t.id} className="flex justify-between items-center text-xs group transition-colors">
                                                <div className="space-y-1">
                                                    <div className="font-bold text-slate-700 dark:text-slate-300 transition-colors">{format(new Date(t.transaction_date), "dd/MM/yyyy")}</div>
                                                    <div className="text-[10px] text-slate-400 dark:text-slate-500 transition-colors uppercase font-medium">{t.payment_method === 'cash' ? 'Tiền mặt' : 'Chuyển khoản'}</div>
                                                </div>
                                                <div className="font-black text-slate-800 dark:text-slate-200 transition-colors bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded border dark:border-slate-700">{money(t.amount)}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {po.notes && (
                        <Card className="dark:bg-slate-900 dark:border-slate-800 shadow-sm transition-colors">
                            <CardHeader className="bg-slate-50 dark:bg-slate-950/50 py-3 border-b dark:border-slate-800 transition-colors">
                                <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Ghi chú đơn hàng</CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 transition-colors">
                                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-line leading-relaxed transition-colors italic">
                                    "{po.notes}"
                                </p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}