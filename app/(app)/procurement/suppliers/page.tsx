import { createClient } from "@/lib/supabase/server";
import { getSuppliers } from "@/lib/action/procurement";
import { SupplierList } from "@/components/procurement/supplier-list"; // Chúng ta sẽ tạo component này ngay sau đây
import { CreateSupplierDialog } from "@/components/procurement/create-supplier-dialog"; // Và cái này nữa

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
    const suppliers = await getSuppliers();

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Nhà cung cấp</h2>
                <CreateSupplierDialog />
            </div>

            {/* Danh sách */}
            <SupplierList data={suppliers} />
        </div>
    );
}