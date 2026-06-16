import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Import API Actions
import { getPurchaseOrders, getSuppliers, getPurchaseRequests } from "@/lib/action/procurement";
import { getProjectsForSelect } from "@/lib/action/finance";

// Import Components
import { OrderList } from "@/components/procurement/order-list";
import { OrderFilters } from "@/components/procurement/order-filters";
import CentralRequestManager from "@/components/procurement/CentralRequestManager";

export const dynamic = "force-dynamic";

export default async function ProcurementHubPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
    const params = await searchParams;

    const projectId = typeof params.projectId === "string" ? params.projectId : undefined;
    const supplierId = typeof params.supplierId === "string" ? params.supplierId : undefined;

    // Đọc tham số tab từ URL để giữ trạng thái khi F5 (mặc định là requests)
    const currentTab = typeof params.tab === "string" ? params.tab : "requests";

    // Fetch toàn bộ dữ liệu cần thiết cho cả 2 Tab
    const [orders, projects, suppliers, requests] = await Promise.all([
        getPurchaseOrders({ projectId, supplierId }),
        getProjectsForSelect(),
        getSuppliers(),
        getPurchaseRequests() // Hàm lấy danh sách Yêu cầu vật tư (anh thêm vào file action nhé)
    ]);

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors duration-500">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">
                        Trung tâm Mua hàng
                    </h2>
                    <p className="text-sm md:text-base text-slate-500 dark:text-slate-400 mt-1 transition-colors">
                        Xử lý yêu cầu vật tư từ công trường và quản lý đơn đặt hàng (PO).
                    </p>
                </div>
                <Button asChild className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white shadow-sm transition-colors w-full sm:w-auto">
                    <Link href="/procurement/orders/new">
                        <Plus className="mr-2 h-4 w-4" /> Tạo PO thủ công
                    </Link>
                </Button>
            </div>

            <Tabs defaultValue={currentTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-6 bg-slate-100 dark:bg-slate-900 border dark:border-slate-800">
                    <TabsTrigger value="requests" className="dark:data-[state=active]:bg-slate-800">
                        Yêu cầu từ Công trình
                    </TabsTrigger>
                    <TabsTrigger value="orders" className="dark:data-[state=active]:bg-slate-800">
                        Quản lý Đơn hàng (PO)
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: YÊU CẦU VẬT TƯ */}
                <TabsContent value="requests" className="mt-0 outline-none">
                    <CentralRequestManager allRequests={requests} />
                </TabsContent>

                {/* TAB 2: DANH SÁCH PO */}
                <TabsContent value="orders" className="mt-0 outline-none space-y-6">
                    <OrderFilters projects={projects} suppliers={suppliers} />
                    <OrderList data={orders} />
                </TabsContent>
            </Tabs>
        </div>
    );
}