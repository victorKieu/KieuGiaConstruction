"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { activitySchema, ActivityFormValues } from "@/lib/schemas/activity";

// --- Action 1: Đánh dấu hoàn thành ---
export async function completeActivityAction(activityId: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from("customer_activities")
        .update({ status: "completed", updated_at: new Date().toISOString() })
        .eq("id", activityId);

    if (error) {
        return { success: false, error: "Lỗi hệ thống: Không thể cập nhật." };
    }

    revalidatePath("/crm/activities");
    return { success: true, message: "Đã đánh dấu hoàn thành." };
}

// --- Action 2: Tạo mới hoạt động (Hàm bạn đang thiếu) ---
export async function createActivityAction(data: ActivityFormValues) {
    const supabase = await createClient();

    // 1. Validate lại dữ liệu ở Server
    const validatedFields = activitySchema.safeParse(data);

    if (!validatedFields.success) {
        return {
            success: false,
            error: "Dữ liệu không hợp lệ.",
        };
    }

    const { title, activity_type, description, scheduled_at, customer_id } = validatedFields.data;

    // 2. Insert vào DB
    const { error } = await supabase.from("customer_activities").insert({
        title,
        activity_type,
        description,
        scheduled_at: scheduled_at.toISOString(),
        customer_id,
        status: "pending",
    });

    if (error) {
        console.error("[Create Activity Error]", error);
        return { success: false, error: "Lỗi hệ thống: Không thể tạo hoạt động." };
    }

    // 3. Revalidate cache
    revalidatePath("/crm/activities");

    return { success: true, message: "Đã tạo hoạt động mới thành công." };
}