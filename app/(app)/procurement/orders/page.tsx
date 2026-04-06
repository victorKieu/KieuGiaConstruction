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
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">
                        Đơn Mua Hàng (PO)
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Quản lý đặt hàng vật tư, thiết bị cho dự án.
                    </p>
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors w-full sm:w-auto">
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