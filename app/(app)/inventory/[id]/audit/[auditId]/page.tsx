import { notFound } from "next/navigation";
import { getWarehouseById, getAuditCycleById } from "@/lib/action/inventory";
import AuditClientActions from "@/components/inventory/AuditClientActions"; // Tạo file này ở dưới
import { formatDate } from "@/lib/utils/utils"; // Hàm tiện ích để format ngày tháng

export default async function AuditDetailPage({ params }: { params: Promise<{ id: string, auditId: string }> }) {
    const { id, auditId } = await params;
    const [warehouse, audit] = await Promise.all([
        getWarehouseById(id),
        getAuditCycleById(auditId)
    ]);

    if (!audit) return notFound();

    return (
        <div className="p-8 space-y-6">
            {/* PHẦN 1: HEADER THÔNG TIN (Dùng server render cho nhanh) */}
            <div className="flex justify-between items-start">
                <div>
                    <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{audit.name}</h2>
                    <p className="text-slate-500 mt-1">
                        Kho: <span className="font-medium text-slate-700 dark:text-slate-300">{warehouse?.name}</span> |
                        Ngày tạo: {formatDate(new Date(audit.created_at))}
                    </p>
                </div>
                {/* Có thể thêm Badge trạng thái ở đây */}
            </div>

            {/* PHẦN 2: CÁC ACTION VÀ BẢNG ĐIỀU KHIỂN (Giao cho Client) */}
            <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm p-6">
                <AuditClientActions
                    audit={audit}
                    warehouse={warehouse}
                    warehouseId={id}
                />
            </div>
        </div>
    );
}