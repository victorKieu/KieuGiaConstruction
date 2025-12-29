import Link from "next/link";
import { Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
// Import các hàm lấy dữ liệu
import { getPurchaseOrders, getSuppliers } from "@/lib/action/procurement";
import { getProjectsForSelect } from "@/lib/action/finance";
// Import Component
import { OrderList } from "@/components/procurement/order-list";
import { OrderFilters } from "@/components/procurement/order-filters";

export const dynamic = "force-dynamic";

// Nhận searchParams từ URL (Next.js server component feature)
export default async function OrdersPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams; // Await params (Next.js 15 requirement)

    // Lấy các tham số lọc từ URL
    const projectId = typeof params.projectId === "string" ? params.projectId : undefined;
    const supplierId = typeof params.supplierId === "string" ? params.supplierId : undefined;

    // Gọi song song 3 API: Danh sách đơn (có lọc), Danh sách NCC (để lọc), Danh sách Dự án (để lọc)
    const [orders, projects, suppliers] = await Promise.all([
        getPurchaseOrders({ projectId, supplierId }),
        getProjectsForSelect(),
        getSuppliers()
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Đơn Mua Hàng (PO)</h2>
                    <p className="text-muted-foreground">Quản lý đặt hàng vật tư, thiết bị cho dự án.</p>
                </div>
                <Button asChild>
                    <Link href="/procurement/orders/new">
                        <Plus className="mr-2 h-4 w-4" /> Tạo đơn mới
                    </Link>
                </Button>
            </div>

            {/* Component Bộ lọc */}
            <OrderFilters projects={projects} suppliers={suppliers} />

            {/* Danh sách kết quả */}
            <OrderList data={orders} />
        </div>
    );
}