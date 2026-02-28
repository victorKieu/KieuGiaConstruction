"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- QUẢN LÝ TEMPLATES ---
export async function getTemplates() {
    const supabase = await createClient();
    const { data, error } = await supabase.from("auto_estimate_templates").select("*").order("created_at", { ascending: false });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function createTemplate(name: string, foundation_type: string, roof_type: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("auto_estimate_templates").insert({
        name, foundation_type, roof_type, is_active: true
    }).select().single();

    if (error) return { success: false, error: error.message };
    revalidatePath("/templates");
    return { success: true, data };
}

// --- QUẢN LÝ TASKS (CÔNG THỨC ĐỘNG) ---
export async function getTasksByTemplate(templateId: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("auto_estimate_tasks").select("*").eq("template_id", templateId).order("sort_order", { ascending: true });
    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

export async function saveTask(task: any) {
    const supabase = await createClient();
    let result;

    if (task.id) {
        // Cập nhật
        result = await supabase.from("auto_estimate_tasks").update({
            section_name: task.section_name,
            item_name: task.item_name,
            norm_code: task.norm_code,
            unit: task.unit,
            formula: task.formula,
            sort_order: task.sort_order
        }).eq("id", task.id);
    } else {
        // Thêm mới
        result = await supabase.from("auto_estimate_tasks").insert(task);
    }

    if (result.error) return { success: false, error: result.error.message };
    return { success: true };
}

export async function deleteTask(taskId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("auto_estimate_tasks").delete().eq("id", taskId);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function deleteTemplate(templateId: string) {
    const supabase = await createClient();
    // Do đã set ON DELETE CASCADE trong DB nên xóa Template sẽ tự xóa luôn các Tasks bên trong
    const { error } = await supabase.from("auto_estimate_templates").delete().eq("id", templateId);
    if (error) return { success: false, error: error.message };
    return { success: true };
}

export async function updateTasksOrder(tasksToUpdate: { id: string, sort_order: number }[]) {
    const supabase = await createClient();
    // Chạy vòng lặp update lại số thứ tự cho từng task
    for (const task of tasksToUpdate) {
        if (task.id) {
            await supabase.from("auto_estimate_tasks")
                .update({ sort_order: task.sort_order })
                .eq("id", task.id);
        }
    }
    return { success: true };
}

export async function updateTemplate(id: string, name: string, foundation_type: string, roof_type: string) {
    const supabase = await createClient();
    const { data, error } = await supabase.from("auto_estimate_templates").update({
        name, foundation_type, roof_type
    }).eq("id", id).select().single();

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}