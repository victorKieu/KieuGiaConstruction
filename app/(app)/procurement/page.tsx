import { getAllPendingRequests, getSuppliers } from "@/lib/action/procurement";
import CentralRequestManager from "@/components/procurement/CentralRequestManager";

export default async function ProcurementPage() {
    const [allRequests, suppliers] = await Promise.all([
        getAllPendingRequests(),
        getSuppliers()
    ]);

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-slate-800">Kế hoạch Mua sắm (Procurement Planning)</h1>
            <p className="text-slate-500">Quản lý tập trung tất cả yêu cầu vật tư từ các dự án.</p>

            <CentralRequestManager
                allRequests={allRequests}
                suppliers={suppliers}
            />
        </div>
    );
}