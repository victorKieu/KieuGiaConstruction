"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./authActions";
import { isValidUUID } from "@/lib/utils/uuid";
import type { ActionResponse } from "@/lib/action/projectActions";

// 

// --- 1. GET DATA (READ) ---

export async function getSurveyTemplates() {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("survey_templates")
        .select(`id, name, description`)
        .eq('is_active', true)
        .order("name", { ascending: true });

    return { data, error };
}

export async function getSurveyTaskTemplates() {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("survey_task_templates")
        .select(`id, title, category, description, estimated_cost`)
        .eq('is_active', true)
        .order("category", { ascending: true })
        .order("title", { ascending: true });

    return { data, error };
}

export async function getProjectSurveys(projectId: string) {
    const supabase = await createSupabaseServerClient();

    // Validate input trước khi query
    if (!isValidUUID(projectId)) {
        return { data: null, error: { message: "Project ID không hợp lệ", code: "400" } };
    }

    const { data, error } = await supabase
        .from("project_surveys")
        .select(`
        *,
        created_by:employees (
            name,
            user_profiles ( avatar_url )
        )
    `)
        .eq("project_id", projectId)
        .order("survey_date", { ascending: false });

    if (error) {
        console.error("Lỗi getProjectSurveys:", error.message);
        return { data: null, error: { message: `Lỗi tải đợt khảo sát: ${error.message}`, code: error.code } };
    }
    return { data, error: null };
}

export async function getSurveyTasks(surveyId: string) {
    const supabase = await createSupabaseServerClient();

    if (!isValidUUID(surveyId)) {
        return { data: null, error: { message: "ID Đợt khảo sát không hợp lệ.", code: "400" } };
    }

    const { data, error } = await supabase
        .from("survey_tasks")
        .select(`
            *,
            assigned_to:employees ( name, avatar_url )
        `)
        .eq("survey_id", surveyId)
        .order("title", { ascending: true });

    if (error) {
        console.error("Lỗi getSurveyTasks:", error.message);
        return { data: null, error: { message: `Lỗi tải công việc khảo sát: ${error.message}`, code: error.code } };
    }
    return { data, error: null };
}

// --- 2. ACTIONS (WRITE) ---

// Helper để check Auth nhanh gọn
async function checkAuth() {
    const user = await getCurrentUser();
    if (!user) throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
    return user;
}

export async function createSurvey(
    prevState: any, // Sử dụng any để tương thích tốt với useFormState ban đầu
    formData: FormData
): Promise<ActionResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const currentUser = await checkAuth();

        const projectId = formData.get("projectId") as string | null;
        const template_name = formData.get("template_name") as string | null;
        const name_detail = (formData.get("name_detail") as string)?.trim();
        const survey_date = formData.get("survey_date") as string | null;

        if (!projectId) return { success: false, error: "ID Dự án không hợp lệ." };
        if (!template_name) return { success: false, error: "Vui lòng chọn Loại khảo sát." };
        if (!survey_date) return { success: false, error: "Vui lòng chọn ngày khảo sát." };

        const finalName = name_detail ? `${template_name} - ${name_detail}` : template_name;

        const { error: insertError } = await supabase
            .from("project_surveys")
            .insert({
                project_id: projectId,
                name: finalName,
                survey_date: survey_date,
                created_by: currentUser.id,
                status: 'pending'
            });

        if (insertError) throw insertError;

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã tạo đợt khảo sát mới." };

    } catch (error: any) {
        console.error("Create Survey Error:", error.message);
        return { success: false, error: error.message || "Lỗi tạo đợt khảo sát." };
    }
}

export async function updateSurvey(
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        await checkAuth();

        const surveyId = formData.get("surveyId") as string | null;
        const projectId = formData.get("projectId") as string | null;
        const name = (formData.get("name") as string)?.trim();
        const survey_date = formData.get("survey_date") as string | null;

        if (!surveyId || !isValidUUID(surveyId)) return { success: false, error: "ID Đợt khảo sát không hợp lệ." };
        if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };
        if (!name) return { success: false, error: "Vui lòng nhập tên đợt khảo sát." };
        if (!survey_date) return { success: false, error: "Vui lòng chọn ngày khảo sát." };

        const { error: updateError } = await supabase
            .from("project_surveys")
            .update({
                name: name,
                survey_date: survey_date
            })
            .eq("id", surveyId);

        if (updateError) throw updateError;

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã cập nhật đợt khảo sát." };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSurvey(prevState: any, formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const surveyId = formData.get("surveyId") as string | null;
        const projectId = formData.get("projectId") as string | null;

        if (!surveyId || !isValidUUID(surveyId)) return { success: false, error: "ID không hợp lệ." };
        if (!projectId) return { success: false, error: "ID Dự án thiếu." };

        const { error: deleteError } = await supabase
            .from("project_surveys")
            .delete()
            .eq("id", surveyId);

        if (deleteError) throw deleteError;

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã xóa đợt khảo sát." };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- TASKS ACTIONS ---

export async function createSurveyTask(
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        await checkAuth();

        const surveyId = formData.get("surveyId") as string | null;
        const projectId = formData.get("projectId") as string | null;
        const title = (formData.get("title") as string)?.trim();
        const assignedTo = (formData.get("assigned_to") as string) || null;
        const dueDate = (formData.get("due_date") as string) || null;

        if (!surveyId) return { success: false, error: "ID Đợt khảo sát thiếu." };
        if (!projectId) return { success: false, error: "ID Dự án thiếu." };
        if (!title) return { success: false, error: "Thiếu tiêu đề công việc." };

        // Lấy chi phí ước tính từ template (nếu có)
        const { data: templateData } = await supabase
            .from("survey_task_templates")
            .select("estimated_cost")
            .eq("title", title)
            .single();

        const { error: insertError } = await supabase
            .from("survey_tasks")
            .insert({
                survey_id: surveyId,
                title: title,
                assigned_to: assignedTo === "unassigned" ? null : assignedTo,
                due_date: dueDate || null,
                status: 'pending',
                cost: templateData?.estimated_cost || 0
            });

        if (insertError) throw insertError;

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã thêm công việc." };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateSurveyTask(
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        await checkAuth();

        const taskId = formData.get("taskId") as string | null;
        const projectId = formData.get("projectId") as string | null;
        const title = (formData.get("title") as string)?.trim();
        const assignedTo = (formData.get("assigned_to") as string) || null;
        const dueDate = (formData.get("due_date") as string) || null;

        if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Task không hợp lệ." };
        if (!projectId) return { success: false, error: "ID Dự án thiếu." };
        if (!title) return { success: false, error: "Thiếu tiêu đề." };

        const { error: updateError } = await supabase
            .from("survey_tasks")
            .update({
                title: title,
                assigned_to: assignedTo === "unassigned" ? null : assignedTo,
                due_date: dueDate || null
            })
            .eq("id", taskId);

        if (updateError) throw updateError;

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã cập nhật công việc." };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function updateSurveyTaskResult(
    prevState: any,
    formData: FormData
): Promise<ActionResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        await checkAuth();

        const taskId = formData.get("taskId") as string | null;
        const projectId = formData.get("projectId") as string | null;
        const notes = (formData.get("notes") as string)?.trim() || null;
        const cost = Number.parseFloat(formData.get("cost") as string) || 0;
        const status = formData.get("status") as string;

        // Fix: Ép kiểu any để tránh lỗi TypeScript với cột JSONB
        const resultData: any = {
            result_text: (formData.get("result_data_text") as string) || null
        };

        if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Task không hợp lệ." };
        if (!projectId) return { success: false, error: "ID Dự án thiếu." };

        const { error: updateError } = await supabase
            .from("survey_tasks")
            .update({
                notes: notes,
                cost: cost,
                status: status,
                result_data: resultData
            })
            .eq("id", taskId);

        if (updateError) throw updateError;

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã cập nhật kết quả khảo sát." };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteSurveyTask(prevState: any, formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const taskId = formData.get("taskId") as string | null;
        const projectId = formData.get("projectId") as string | null;

        if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Task không hợp lệ." };

        const { error: deleteError } = await supabase
            .from("survey_tasks")
            .delete()
            .eq("id", taskId);

        if (deleteError) throw deleteError;

        if (projectId) {
            revalidatePath(`/projects/${projectId}`);
        }
        return { success: true, message: "Đã xóa công việc." };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}