"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getEstimationItems(projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('estimation_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true }); // Giả định có created_at hoặc sort

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// Hàm lưu (Create/Update)
export async function saveEstimationItem(data: any) {
    const supabase = await createSupabaseServerClient();
    // Logic tương tự QTO...
    // Tạm thời trả về success để demo UI
    return { success: true, message: "Tính năng đang phát triển" };
}