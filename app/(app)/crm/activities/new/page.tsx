import { createClient } from "@/lib/supabase/server";
import { ActivityForm } from "@/components/crm/activities/activity-form"; // Import component mới của bạn

export const dynamic = "force-dynamic";

export default async function NewActivityPage() {
    const supabase = await createClient();

    // Lấy danh sách khách hàng để truyền vào dropdown của Form
    const { data: customers } = await supabase
        .from("customers")
        .select("id, name")
        .order("name");

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-2xl mx-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Thêm hoạt động mới</h2>
            </div>

            {/* Truyền data vào Form xịn vừa tạo */}
            <ActivityForm customers={customers || []} />
        </div>
    );
}