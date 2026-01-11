import { notFound } from "next/navigation";
import Link from "next/link";
import {
    getWarehouseById,
    getInventoryByWarehouse,
    getIncomingOrdersByWarehouse,
    getAllWarehouses
} from "@/lib/action/inventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Package, Truck, Boxes, ArrowLeft } from "lucide-react";
import WarehouseInboundManager from "@/components/inventory/WarehouseInboundManager";
import InventoryItemActions from "@/components/inventory/InventoryItemActions";

// ✅ Import ĐẦY ĐỦ 5 Dialog thao tác kho
import {
    TransferDialog,
    ReturnDialog,
    InventoryCheckDialog,
    IssueDialog,
    OtherIssueDialog // Xuất trả/Hủy
} from "@/components/inventory/InventoryActions";

export const dynamic = "force-dynamic";

export default async function WarehouseDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;

    const [warehouse, inventory, incomingOrders, allWarehouses] = await Promise.all([
        getWarehouseById(id),
        getInventoryByWarehouse(id),
        getIncomingOrdersByWarehouse(id),
        getAllWarehouses()
    ]);

    if (!warehouse) return notFound();

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* HEADER */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-9 w-9">
                    <Link href="/inventory" title="Trở về danh sách">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>

                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <Package className="w-6 h-6 text-blue-600" /> {warehouse.name}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Dự án: <span className="font-semibold text-slate-700">{warehouse.project?.name}</span>
                    </p>
                </div>
            </div>

            {/* TABS */}
            <Tabs defaultValue="inventory" className="space-y-4">
                <TabsList>
                    <TabsTrigger value="inventory" className="gap-2"><Boxes className="w-4 h-4" /> Tồn kho & Thao tác</TabsTrigger>
                    <TabsTrigger value="inbound" className="gap-2">
                        <Truck className="w-4 h-4" /> Nhập hàng (PO)
                        {incomingOrders.length > 0 && <span className="ml-1 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full">{incomingOrders.length}</span>}
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: TỒN KHO & CHỨC NĂNG */}
                <TabsContent value="inventory" className="space-y-4">
                    {/* TOOLBAR CHỨC NĂNG */}
                    <div className="flex flex-wrap gap-2 justify-end bg-white p-3 rounded-lg border shadow-sm items-center">
                        <span className="text-sm font-medium text-slate-500 mr-auto pl-2">Thao tác kho:</span>

                        {/* 1. Xuất sử dụng (Ưu tiên) */}
                        <IssueDialog
                            warehouseId={warehouse.id}
                            projectId={warehouse.project_id}
                            inventory={inventory}
                        />

                        {/* 2. Xử lý hàng hóa (Trả/Hủy) - MỚI */}
                        <OtherIssueDialog
                            warehouseId={warehouse.id}
                            inventory={inventory}
                        />

                        <div className="w-px h-6 bg-slate-200 mx-1"></div>

                        {/* Các chức năng khác */}
                        <ReturnDialog warehouseId={warehouse.id} inventory={inventory} />
                        <TransferDialog warehouseId={warehouse.id} inventory={inventory} otherWarehouses={allWarehouses} />
                        <InventoryCheckDialog warehouseId={warehouse.id} inventory={inventory} />
                    </div>

                    <Card>
                        <CardHeader><CardTitle>Danh sách Vật tư</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-slate-50">
                                        <TableHead className="w-[50px]">STT</TableHead>
                                        <TableHead>Tên vật tư</TableHead>
                                        <TableHead>ĐVT</TableHead>
                                        <TableHead className="text-right">SL Tồn</TableHead>
                                        <TableHead className="text-right text-orange-600">SL Đã Xuất</TableHead>
                                        <TableHead className="text-right">Cập nhật cuối</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventory.length === 0 ? (
                                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Kho trống</TableCell></TableRow>
                                    ) : inventory.map((item: any, idx: number) => (
                                        <TableRow key={item.id} className={item.quantity_on_hand <= 0 ? "opacity-60 bg-gray-50" : ""}>
                                            <TableCell>{idx + 1}</TableCell>
                                            <TableCell className="font-medium text-slate-700">
                                                {item.item_name}
                                                {item.quantity_on_hand <= 0 && <span className="ml-2 text-[10px] text-red-500 font-normal border border-red-200 px-1 rounded">Hết hàng</span>}
                                            </TableCell>
                                            <TableCell>{item.unit}</TableCell>
                                            <TableCell className="text-right font-bold text-blue-700">
                                                {Number(item.quantity_on_hand).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-orange-600">
                                                {Number(item.quantity_issued || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-slate-500">
                                                {item.last_updated ? new Date(item.last_updated).toLocaleDateString('vi-VN') : '-'}
                                            </TableCell>
                                            {/* ✅ CỘT HÀNH ĐỘNG MỚI */}
                                            <TableCell className="text-center w-[50px]">
                                                <InventoryItemActions item={item} />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: NHẬP HÀNG TỪ PO */}
                <TabsContent value="inbound">
                    <WarehouseInboundManager orders={incomingOrders} warehouseId={warehouse.id} />
                </TabsContent>
            </Tabs>
        </div>
    );
}