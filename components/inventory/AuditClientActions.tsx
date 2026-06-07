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
export default function AuditClientActions({
    audit,
    warehouse,
    warehouseId
}: {
    audit: any,
    warehouse: any,
    warehouseId: string
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const handleStartAudit = async () => {
        setLoading(true);
        const res = await startAuditCycleAction(audit.id, warehouseId);
        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <>
            {/* ✅ Hiển thị nút bắt đầu khi ở trạng thái DRAFT */}
            {audit.status === 'draft' && (
                <div className="mt-6 bg-amber-50 p-6 rounded-xl border border-amber-200 text-center">
                    <h3 className="text-lg font-bold text-amber-800 mb-2">Kỳ kiểm kê chưa bắt đầu</h3>
                    <Button onClick={handleStartAudit} disabled={loading} className="bg-amber-600 hover:bg-amber-700">
                        {loading ? <Loader2 className="animate-spin mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                        Chốt sổ sách & Bắt đầu kiểm kê
                    </Button>
                </div>
            )}

            {/* Hiển thị bảng khi đang COUNTING */}
            {audit.status === 'COUNTING' && (
                <div className="mt-6 border rounded-lg p-4 bg-white dark:bg-slate-950">
                    <div className="flex gap-2 mb-4">
                        {/* ✅ Truyền warehouse từ props vào */}
                        <AuditPrintButton audit={audit} warehouse={warehouse} />
                        <Button variant="outline">Chốt số liệu</Button>
                    </div>
                    <h4 className="font-bold mb-4">Danh sách kiểm đếm</h4>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Vật tư</TableHead>
                                <TableHead>Sổ sách</TableHead>
                                <TableHead>Số lượng đếm</TableHead>
                                <TableHead>Ghi chú</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {audit.items?.map((item: any) => (
                                <TableRow key={item.id}>
                                    <TableCell>{item.item_name}</TableCell>
                                    <TableCell>{item.system_qty}</TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            defaultValue={item.actual_qty}
                                            className="w-20"
                                            onBlur={(e) => {
                                                console.log("Cập nhật dòng:", item.id, "giá trị:", e.target.value);
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Input
                                            type="number"
                                            defaultValue={item.actual_qty}
                                            className="w-20"
                                            onBlur={async (e) => {
                                                const val = parseFloat(e.target.value);
                                                const res = await updateAuditItemAction(item.id, val);
                                                if (res.success) {
                                                    toast.success("Đã cập nhật!");
                                                } else {
                                                    toast.error("Lỗi cập nhật!");
                                                }
                                            }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <span className={`font-bold ${item.actual_qty - item.system_qty > 0 ? 'text-green-600' : 'text-red-600'}`}>
                                            {item.actual_qty - item.system_qty}
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