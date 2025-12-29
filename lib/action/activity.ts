"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { activitySchema, ActivityFormValues } from "@/lib/schemas/activity";

export async function completeActivityAction(activityId: string) {
    const supabase = await createClient();
    const { error } = await supabase
        .from("customer_activities")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", activityId);

    if (error) return { success: false, error: "Lỗi hệ thống." };
    revalidatePath("/crm/activities");
    return { success: true, message: "Đã hoàn thành." };
}

export async function createActivityAction(data: ActivityFormValues) {
    const supabase = await createClient();

    console.log("--> Step 1: Data Received", data);

    const validatedFields = activitySchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, error: "Dữ liệu không hợp lệ." };
    }

    // Lấy dữ liệu đã validate
    const payload = validatedFields.data;
    console.log("--> Step 2: Payload to Insert", payload);

    // Insert vào DB
    const { error } = await supabase.from("customer_activities").insert({
        title: payload.title,

        // Cột DB : Biến dữ liệu
        activity_type: payload.activity_type,

        description: payload.description,
        scheduled_at: payload.scheduled_at.toISOString(),
        customer_id: payload.customer_id,
        status: "pending",
        created_at: new Date().toISOString(),
    });

    if (error) {
        console.error("[Create Activity Error]", error);
        return { success: false, error: error.message }; // Trả về message lỗi chi tiết
    }

    revalidatePath("/crm/activities");
    revalidatePath(`/crm/customers/${payload.customer_id}`);

    return { success: true, message: "Đã tạo hoạt động mới." };
}

// --- Action 3: Cập nhật hoạt động ---
export async function updateActivityAction(id: string, data: ActivityFormValues) {
    const supabase = await createClient();

    // 1. Validate dữ liệu
    const validatedFields = activitySchema.safeParse(data);
    if (!validatedFields.success) {
        return { success: false, error: "Dữ liệu không hợp lệ." };
    }

    const payload = validatedFields.data;

    // 2. Update vào DB
    const { error } = await supabase
        .from("customer_activities")
        .update({
            title: payload.title,
            activity_type: payload.activity_type,
            description: payload.description,
            scheduled_at: payload.scheduled_at.toISOString(),
            customer_id: payload.customer_id,
            updated_at: new Date().toISOString(), // Cập nhật thời gian sửa
        })
        .eq("id", id);

    if (error) {
        console.error("[Update Activity Error]", error);
        return { success: false, error: error.message };
    }

    // 3. Revalidate
    revalidatePath("/crm/activities");
    revalidatePath(`/crm/customers/${payload.customer_id}`);

    return { success: true, message: "Cập nhật hoạt động thành công." };
}