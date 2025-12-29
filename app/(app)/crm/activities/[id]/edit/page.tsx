import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import { ActivityForm } from "@/components/crm/activities/activity-form";

export const dynamic = "force-dynamic";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function EditActivityPage({ params }: PageProps) {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Lấy thông tin hoạt động cần sửa
    const { data: activity, error } = await supabase
        .from("customer_activities")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !activity) {
        notFound();
    }

    // 2. Lấy danh sách khách hàng (để dropdown hoạt động)
    const { data: customers } = await supabase
        .from("customers")
        .select("id, name")
        .order("name");

    // 3. Chuẩn hóa dữ liệu để truyền vào Form (Zod yêu cầu Date object)
    const initialData = {
        title: activity.title,
        activity_type: activity.activity_type, // Đã fix DB nên trường này giờ là text chuẩn
        description: activity.description || "",
        customer_id: activity.customer_id,
        scheduled_at: new Date(activity.scheduled_at), // Chuyển chuỗi sang Date
    };

    return (
        <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold tracking-tight">Chỉnh sửa hoạt động</h2>
            <ActivityForm
                customers={customers || []}
                initialData={initialData}
                activityId={id}
            />
        </div>
    );
}