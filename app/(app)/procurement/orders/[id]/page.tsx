"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    ArrowLeft, Printer, Pencil, PackageCheck, Loader2,
    Building2, Calendar, FileText, Truck, MapPin
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
// 👇 IMPORT THÊM SELECT
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { getPurchaseOrderById, createGoodsReceiptAction } from "@/lib/action/procurement";
import { getAllWarehouses } from "@/lib/action/inventory"; // <--- Import hàm lấy kho

export default function PurchaseOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();

    const [po, setPo] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // State Dialog
    const [openReceipt, setOpenReceipt] = useState(false);
    const [receiptNotes, setReceiptNotes] = useState("");
    const [receiving, setReceiving] = useState(false);

    // 👇 STATE MỚI: DANH SÁCH KHO & KHO ĐƯỢC CHỌN
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState("");

    useEffect(() => {
        loadData();
        // Load danh sách kho để chọn
        getAllWarehouses().then(setWarehouses);
    }, [id]);

    const loadData = async () => {
        setLoading(true);
        const data = await getPurchaseOrderById(id);
        if (data) {
            setPo(data);
            // Nếu đơn hàng có link tới request và request đã chọn kho -> Tự chọn kho đó
            if (data.request?.destination_warehouse_id) {
                setSelectedWarehouseId(data.request.destination_warehouse_id);
            }
        } else {
            toast.error("Không tìm thấy đơn hàng");
            router.push("/procurement/orders");
        }
        setLoading(false);
    };

    const handleCreateReceipt = async () => {
        if (!selectedWarehouseId) {
            toast.error("Vui lòng chọn kho để nhập hàng!");
            return;
        }

        setReceiving(true);
        // 👇 Gửi thêm selectedWarehouseId xuống Server Action
        const res = await createGoodsReceiptAction(id, receiptNotes || "Nhập hàng đủ theo đơn", selectedWarehouseId);
        setReceiving(false);

        if (res.success) {
            toast.success(res.message);
            setOpenReceipt(false);
            loadData();
        } else {
            toast.error(res.error);
        }
    };

    const formatMoney = (val: number) =>
        new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(val);

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <Badge className="bg-orange-500 hover:bg-orange-600 border-none">Chờ xử lý</Badge>;
            case 'ordered': return <Badge className="bg-blue-600 hover:bg-blue-700 border-none">Đã chốt đơn</Badge>;
            case 'received': return <Badge className="bg-green-600 hover:bg-green-700 border-none">Đã nhập kho</Badge>;
            case 'completed': return <Badge className="bg-gray-600">Hoàn thành</Badge>;
            case 'cancelled': return <Badge variant="destructive">Đã hủy</Badge>;
            default: return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;
    if (!po) return null;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 max-w-5xl mx-auto">
            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                            {po.code} {getStatusBadge(po.status)}
                        </h2>
                        <div className="text-muted-foreground text-sm mt-1 flex items-center gap-4">
                            <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" /> Ngày đặt: {format(new Date(po.order_date), "dd/MM/yyyy")}</span>
                        </div>
                    </div>
                </div>

                <div className="flex gap-2">
                    <Button variant="outline"><Printer className="mr-2 h-4 w-4" /> In đơn hàng</Button>

                    {(po.status === 'draft' || po.status === 'ordered') && (
                        <Button variant="outline" asChild>
                            <Link href={`/procurement/orders/${id}/edit`}>
                                <Pencil className="mr-2 h-4 w-4" /> Chỉnh sửa
                            </Link>
                        </Button>
                    )}

                    {po.status === 'ordered' && (
                        <Dialog open={openReceipt} onOpenChange={setOpenReceipt}>
                            <DialogTrigger asChild>
                                <Button className="bg-green-600 hover:bg-green-700 shadow-md">
                                    <PackageCheck className="mr-2 h-4 w-4" /> Nhập Kho Ngay
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>Xác nhận Nhập kho</DialogTitle>
                                    <DialogDescription>
                                        Hành động này sẽ tạo phiếu nhập kho (GRN) và <b>tự động cộng số lượng</b> vào tồn kho.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-4 py-2">
                                    {/* 👇 THÊM Ô CHỌN KHO */}
                                    <div className="space-y-2">
                                        <Label>Nhập vào kho nào? <span className="text-red-500">*</span></Label>
                                        <Select onValueChange={setSelectedWarehouseId} value={selectedWarehouseId}>
                                            <SelectTrigger><SelectValue placeholder="Chọn kho..." /></SelectTrigger>
                                            <SelectContent>
                                                {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Ghi chú nhập hàng</Label>
                                        <Textarea
                                            placeholder="VD: Hàng về đủ, chất lượng tốt..."
                                            value={receiptNotes}
                                            onChange={(e) => setReceiptNotes(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="outline" onClick={() => setOpenReceipt(false)} disabled={receiving}>Hủy</Button>
                                    <Button onClick={handleCreateReceipt} className="bg-green-600 hover:bg-green-700" disabled={receiving}>
                                        {receiving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PackageCheck className="mr-2 h-4 w-4" />}
                                        Xác nhận Nhập
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-6">
                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Truck className="h-4 w-4 text-blue-600" /> Nhà cung cấp</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-3">
                            <div>
                                <div className="font-semibold text-lg">{po.supplier?.name || "Chưa chọn NCC"}</div>
                                <div className="text-muted-foreground">{po.supplier?.address}</div>
                                <div className="text-muted-foreground">MST: {po.supplier?.tax_code}</div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Building2 className="h-4 w-4 text-blue-600" /> Dự án / Kho dự kiến</CardTitle></CardHeader>
                        <CardContent className="text-sm space-y-3">
                            <div>
                                <div className="font-medium text-blue-700">{po.project?.name || "Kho chung"}</div>
                                {po.project?.code && <Badge variant="outline" className="mt-1">{po.project.code}</Badge>}
                            </div>
                            {po.request?.destination_warehouse_id && (
                                <div className="flex items-start gap-2 text-muted-foreground border-t pt-2">
                                    <MapPin className="h-4 w-4 mt-0.5" />
                                    <span>Theo yêu cầu: Kho công trình</span>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {po.notes && (
                        <Card>
                            <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-blue-600" /> Ghi chú đơn hàng</CardTitle></CardHeader>
                            <CardContent className="text-sm text-muted-foreground italic">
                                "{po.notes}"
                            </CardContent>
                        </Card>
                    )}
                </div>

                <div className="md:col-span-2 space-y-6">
                    <Card className="overflow-hidden">
                        <CardHeader className="bg-muted/40 pb-4"><CardTitle>Chi tiết hàng hóa</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]">STT</TableHead>
                                        <TableHead>Tên hàng hóa / Quy cách</TableHead>
                                        <TableHead className="text-center">ĐVT</TableHead>
                                        <TableHead className="text-right">SL</TableHead>
                                        <TableHead className="text-right">Đơn giá</TableHead>
                                        <TableHead className="text-right">Thành tiền</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {po.items.map((item: any, index: number) => {
                                        const total = Number(item.quantity) * Number(item.unit_price) * (1 + (item.vat_rate || 0) / 100);
                                        return (
                                            <TableRow key={item.id}>
                                                <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                                                <TableCell>
                                                    <div className="font-medium">{item.item_name}</div>
                                                    {item.vat_rate > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">VAT {item.vat_rate}%</span>}
                                                </TableCell>
                                                <TableCell className="text-center">{item.unit}</TableCell>
                                                <TableCell className="text-right font-bold">{item.quantity}</TableCell>
                                                <TableCell className="text-right text-muted-foreground">{formatMoney(item.unit_price)}</TableCell>
                                                <TableCell className="text-right font-medium">{formatMoney(total)}</TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>

                            <div className="p-6 bg-slate-50 flex justify-end">
                                <div className="w-full md:w-1/2 space-y-2">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-muted-foreground">Tổng cộng:</span>
                                        <span className="text-xl font-bold text-blue-700">{formatMoney(po.total_amount)}</span>
                                    </div>
                                    <Separator />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}