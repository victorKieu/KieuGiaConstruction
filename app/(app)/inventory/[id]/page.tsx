import { notFound } from "next/navigation";
import Link from "next/link";
import {
    getWarehouseById,
    getInventoryByWarehouse,
    getIncomingOrdersByWarehouse,
    getAllWarehouses,
    getWarehouseLedger, getInventoryAuditCycles
} from "@/lib/action/inventory";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
    Package, Truck, Boxes, ArrowLeft,
    FileText, ArrowUpRight, ArrowDownRight, RefreshCw, ClipboardCheck, CirclePlus
} from "lucide-react";
import WarehouseInboundManager from "@/components/inventory/WarehouseInboundManager";
import InventoryItemActions from "@/components/inventory/InventoryItemActions";
import { AuditList } from "@/components/inventory/AuditList";
import { CreateAuditDialog } from "@/components/inventory/CreateAuditDialog";

import {
    TransferDialog,
    ReturnDialog,
    IssueDialog,
    OtherIssueDialog
} from "@/components/inventory/InventoryActions";

export const dynamic = "force-dynamic";

export default async function WarehouseDetailPage({
    params
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = await params;

    const [warehouse, inventory, incomingOrders, allWarehouses, ledger, audits] = await Promise.all([
        getWarehouseById(id),
        getInventoryByWarehouse(id),
        getIncomingOrdersByWarehouse(id),
        getAllWarehouses(),
        getWarehouseLedger(id),
        getInventoryAuditCycles(id)
    ]);

    if (!warehouse) return notFound();

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 transition-colors duration-300">
            {/* HEADER */}
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" asChild className="h-9 w-9 bg-white dark:bg-slate-900 dark:border-slate-800 dark:hover:bg-slate-800">
                    <Link href="/inventory" title="Trở về danh sách">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>

                <div className="flex-1">
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <Package className="w-6 h-6 text-blue-600" /> {warehouse.name}
                    </h2>
                    <p className="text-muted-foreground text-sm">
                        Dự án: <span className="font-semibold text-slate-700 dark:text-slate-300">{warehouse.project?.name}</span>
                    </p>
                </div>
            </div>

            {/* TABS */}
            <Tabs defaultValue="inventory" className="space-y-4">
                <TabsList className="bg-slate-100 dark:bg-slate-900 flex-wrap h-auto">
                    <TabsTrigger value="inventory" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                        <Boxes className="w-4 h-4" /> Tồn kho & Thao tác
                    </TabsTrigger>
                    <TabsTrigger value="inbound" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                        <Truck className="w-4 h-4" /> Nhập hàng (PO)
                        {incomingOrders.length > 0 && <span className="ml-1 bg-red-100 text-red-600 text-[10px] px-1.5 py-0.5 rounded-full">{incomingOrders.length}</span>}
                    </TabsTrigger>
                    <TabsTrigger value="ledger" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800">
                        <FileText className="w-4 h-4" /> Sổ Kho & Chứng từ
                    </TabsTrigger>
                    {/* ✅ TAB MỚI: QUẢN LÝ KIỂM KÊ */}
                    <TabsTrigger value="audit" className="gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 text-indigo-600 dark:text-indigo-400">
                        <ClipboardCheck className="w-4 h-4" /> Quản lý Kiểm kê
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: TỒN KHO & CHỨC NĂNG */}
                <TabsContent value="inventory" className="space-y-4">
                    {/* TOOLBAR CHỨC NĂNG */}
                    <div className="flex flex-wrap gap-2 justify-end bg-white dark:bg-slate-950 p-3 rounded-lg border dark:border-slate-800 shadow-sm items-center transition-colors">
                        <span className="text-sm font-medium text-slate-500 dark:text-slate-400 mr-auto pl-2">Thao tác kho:</span>

                        <IssueDialog warehouseId={warehouse.id} projectId={warehouse.project_id} inventory={inventory} />
                        <OtherIssueDialog warehouseId={warehouse.id} inventory={inventory} />
                        <div className="w-px h-6 bg-slate-200 dark:bg-slate-800 mx-1"></div>
                        <ReturnDialog warehouseId={warehouse.id} inventory={inventory} />
                        <TransferDialog warehouseId={warehouse.id} inventory={inventory} otherWarehouses={allWarehouses} />
                        {/* Đã gỡ nút Kiểm kê cũ ở đây */}
                    </div>

                    <Card className="dark:bg-slate-950 dark:border-slate-800 transition-colors">
                        <CardHeader><CardTitle className="dark:text-slate-200">Danh sách Vật tư</CardTitle></CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow className="border-b dark:border-slate-800">
                                        <TableHead className="w-[50px] dark:text-slate-300">STT</TableHead>
                                        <TableHead className="dark:text-slate-300">Tên vật tư</TableHead>
                                        <TableHead className="dark:text-slate-300">ĐVT</TableHead>
                                        <TableHead className="text-right dark:text-slate-300">SL Tồn</TableHead>
                                        <TableHead className="text-right text-orange-600 dark:text-orange-400">SL Đã Xuất</TableHead>
                                        <TableHead className="text-right dark:text-slate-300">Cập nhật cuối</TableHead>
                                        <TableHead className="w-[50px] dark:text-slate-300"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {inventory.length === 0 ? (
                                        <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">Kho trống</TableCell></TableRow>
                                    ) : inventory.map((item: any, idx: number) => (
                                        <TableRow key={item.id} className={`border-b dark:border-slate-800 ${item.quantity_on_hand <= 0 ? "opacity-60 bg-gray-50 dark:bg-slate-900/50" : ""}`}>
                                            <TableCell className="dark:text-slate-300">{idx + 1}</TableCell>
                                            <TableCell className="font-medium text-slate-700 dark:text-slate-200">
                                                {item.item_name}
                                                {item.quantity_on_hand <= 0 && <span className="ml-2 text-[10px] text-red-500 font-normal border border-red-200 px-1 rounded">Hết hàng</span>}
                                            </TableCell>
                                            <TableCell className="dark:text-slate-300">{item.unit}</TableCell>
                                            <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">
                                                {Number(item.quantity_on_hand).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold text-orange-600 dark:text-orange-400">
                                                {Number(item.quantity_issued || 0).toLocaleString()}
                                            </TableCell>
                                            <TableCell className="text-right text-xs text-slate-500 dark:text-slate-400">
                                                {item.last_updated ? new Date(item.last_updated).toLocaleDateString('vi-VN') : '-'}
                                            </TableCell>
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

                {/* TAB 3: SỔ KHO & CHỨNG TỪ (LEDGER) */}
                <TabsContent value="ledger">
                    <Card className="dark:bg-slate-950 dark:border-slate-800 transition-colors">
                        <CardHeader>
                            <CardTitle className="dark:text-slate-200">Sổ Chi Tiết Giao Dịch Kho</CardTitle>
                            <p className="text-sm text-muted-foreground">Lịch sử toàn bộ các giao dịch nhập, xuất, điều chuyển và kiểm kê kho.</p>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                                    <TableRow className="border-b dark:border-slate-800">
                                        <TableHead className="w-[120px] dark:text-slate-300">Ngày</TableHead>
                                        <TableHead className="w-[150px] dark:text-slate-300">Mã chứng từ</TableHead>
                                        <TableHead className="w-[180px] dark:text-slate-300">Loại giao dịch</TableHead>
                                        <TableHead className="dark:text-slate-300">Đối tác / Ghi chú</TableHead>
                                        <TableHead className="w-[300px] dark:text-slate-300">Chi tiết Vật tư</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {ledger.length === 0 ? (
                                        <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Chưa có giao dịch nào phát sinh.</TableCell></TableRow>
                                    ) : ledger.map((tx: any) => (
                                        <TableRow key={`${tx.type}-${tx.id}`} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50">
                                            <TableCell className="align-top font-medium text-slate-700 dark:text-slate-300">
                                                {new Date(tx.date).toLocaleDateString('vi-VN')}
                                            </TableCell>
                                            <TableCell className="align-top font-mono text-sm font-bold text-blue-600 dark:text-blue-400">
                                                {tx.code}
                                            </TableCell>
                                            <TableCell className="align-top">
                                                {tx.type.includes('IN_') ? (
                                                    <span className="flex items-center text-xs font-bold text-green-600 dark:text-green-500 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded w-fit">
                                                        <ArrowDownRight className="w-3 h-3 mr-1" /> {tx.typeLabel}
                                                    </span>
                                                ) : tx.type.includes('OUT_') ? (
                                                    <span className="flex items-center text-xs font-bold text-orange-600 dark:text-orange-500 bg-orange-50 dark:bg-orange-900/20 px-2 py-1 rounded w-fit">
                                                        <ArrowUpRight className="w-3 h-3 mr-1" /> {tx.typeLabel}
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center text-xs font-bold text-purple-600 dark:text-purple-500 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded w-fit">
                                                        <RefreshCw className="w-3 h-3 mr-1" /> {tx.typeLabel}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="align-top text-sm">
                                                <div className="font-semibold text-slate-800 dark:text-slate-200">{tx.partner}</div>
                                                <div className="text-muted-foreground text-xs mt-1 italic">{tx.notes}</div>
                                            </TableCell>
                                            <TableCell className="align-top">
                                                <div className="space-y-1">
                                                    {tx.items.map((it: any, idx: number) => (
                                                        <div key={idx} className="flex justify-between items-center text-sm border-b border-dashed border-slate-200 dark:border-slate-800 pb-1 last:border-0 last:pb-0">
                                                            <span className="text-slate-700 dark:text-slate-300 truncate max-w-[180px]">{it.name}</span>
                                                            <span className={`font-bold ${it.sign === '+' ? 'text-green-600 dark:text-green-500' : 'text-orange-600 dark:text-orange-500'}`}>
                                                                {it.sign} {Number(it.qty).toLocaleString()} {it.unit}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: QUẢN LÝ KIỂM KÊ */}
                <TabsContent value="audit">
                    <Card className="dark:bg-slate-950 dark:border-slate-800">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="dark:text-slate-200">Danh sách Kỳ kiểm kê</CardTitle>
                            {/* ✅ Thay nút cũ bằng Dialog mới */}
                            <CreateAuditDialog warehouseId={id} />
                        </CardHeader>
                        <CardContent>
                            <AuditList audits={audits} warehouseId={id} />
                        </CardContent>
                    </Card>
                </TabsContent>

            </Tabs>
        </div>
    );
}