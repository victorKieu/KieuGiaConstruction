"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Play } from "lucide-react";
import { toast } from "sonner";
import { startAuditCycleAction } from "@/lib/action/inventory";
import { useRouter } from "next/navigation";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { AuditPrintButton } from "@/components/inventory/AuditPrintTemplate";
import { updateAuditItemAction } from "@/lib/action/inventory";

export default function AuditClientActions({ audit, warehouse, warehouseId }: { audit: any, warehouse: any, warehouseId: string }) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleStartAudit = async () => {
        setLoading(true);
        const res = await startAuditCycleAction(audit.id, warehouseId);
        setLoading(false);
        if (res.success) { toast.success(res.message); router.refresh(); }
        else { toast.error(res.error); }
    };

    return (
        <>
            {audit.status === 'draft' && (
                <div className="flex gap-2">
                    <Button onClick={handleStartAudit} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
                        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />} Bắt đầu kiểm đếm
                    </Button>
                </div>
            )}

            {audit.status === 'counting' && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center bg-muted/50 p-4 rounded-lg border border-border">
                        <div><h3 className="font-bold text-foreground">Đang trong quá trình kiểm đếm</h3><p className="text-sm text-muted-foreground">Vui lòng nhập số lượng thực tế tại kho vào bảng bên dưới.</p></div>
                        <AuditPrintButton audit={audit} warehouse={warehouse} />
                    </div>

                    <Table className="border border-border bg-card">
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead>Tên Vật Tư</TableHead>
                                <TableHead>ĐVT</TableHead>
                                <TableHead>Tồn hệ thống</TableHead>
                                <TableHead className="w-[150px]">SL Thực tế</TableHead>
                                <TableHead>Chênh lệch</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {audit.items?.map((item: any) => (
                                <TableRow key={item.id} className="hover:bg-muted/30">
                                    <TableCell className="font-medium">{item.item_name}</TableCell>
                                    <TableCell>{item.unit}</TableCell>
                                    <TableCell className="font-bold text-muted-foreground">{item.system_qty}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            defaultValue={item.actual_qty}
                                            className="w-24 bg-background"
                                            onBlur={async (e) => {
                                                const val = parseFloat(e.target.value);
                                                const res = await updateAuditItemAction(item.id, val);
                                                if (res.success) { toast.success("Đã cập nhật!"); router.refresh(); }
                                                else { toast.error("Lỗi cập nhật!"); }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {/* ✅ FIX: Thêm dark mode colors để dễ nhìn */}
                                        <span className={`font-bold ${item.actual_qty - item.system_qty >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                            {item.actual_qty - item.system_qty > 0 ? "+" : ""}{item.actual_qty - item.system_qty}
                                        </span>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </>
    );
}