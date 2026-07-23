import { createClient } from "@/lib/supabase/server";
import { getSuppliers } from "@/lib/action/procurement";
import { SupplierList } from "@/components/procurement/supplier-list";
import { CreateSupplierDialog } from "@/components/procurement/create-supplier-dialog";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
    const supabase = await createClient();

    // 1. Lấy danh sách Nhà cung cấp
    const suppliers = await getSuppliers();

    // 2. Lấy danh mục Động từ sys_dictionaries
    const { data: dictTypes } = await supabase
        .from('sys_dictionaries')
        .select('*')
        .eq('category', 'SUPPLIER_TYPE')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

    const supplierTypes = dictTypes || [];

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Nhà cung cấp</h2>
                {/* Truyền dictionary xuống Form Thêm Mới */}
                <CreateSupplierDialog supplierTypes={supplierTypes} />
            </div>

            {/* Truyền dictionary xuống Danh sách để map màu & tên */}
            <SupplierList data={suppliers} supplierTypes={supplierTypes} />
        </div>
    );
}