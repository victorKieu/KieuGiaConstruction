"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
// import { cookies } from "next/headers"; // Không cần import cookies ở đây nữa vì server client tự xử lý
import { getCurrentUser } from "./authActions"; // Đảm bảo đường dẫn này đúng
import { isValidUUID } from "@/lib/utils/uuid";
import type { ActionResponse } from "@/lib/action/projectActions"; // Đảm bảo đường dẫn đúng

// --- Lấy Danh mục/Mẫu ---

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


// --- Lấy Dữ liệu Khảo sát ---

export async function getProjectSurveys(projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("project_surveys")
        .select(`
            *,
            created_by:employees ( name, avatar_url )
        `)
        .eq("project_id", projectId)
        .order("survey_date", { ascending: false });

    if (error) {
        console.error("Lỗi getProjectSurveys:", error.message);
        // Fix: Trả về đúng định dạng lỗi object
        return { data: null, error: { message: `Lỗi tải đợt khảo sát: ${error.message}`, code: error.code } };
    }
    return { data, error: null };
}

export async function getSurveyTasks(surveyId: string) {
    const supabase = await createSupabaseServerClient();

    if (!isValidUUID(surveyId)) return { data: null, error: { message: "ID Đợt khảo sát không hợp lệ.", code: "400" } };

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

// --- Actions (Tạo/Sửa/Xóa) ---

export async function createSurvey(
    prevState: ActionResponse, // Fix: prevState có thể undefined nếu gọi trực tiếp, nên để optional hoặc any nếu cần
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();

    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    const projectId = formData.get("projectId") as string | null;
    const template_name = formData.get("template_name") as string | null;
    const name_detail = (formData.get("name_detail") as string)?.trim();
    const survey_date = formData.get("survey_date") as string | null;

    if (!projectId) return { success: false, error: "ID Dự án không hợp lệ." };
    if (!template_name) return { success: false, error: "Vui lòng chọn Loại khảo sát (từ Mẫu)." };
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

    if (insertError) {
        console.error("Lỗi tạo đợt khảo sát:", insertError.message);
        return { success: false, error: `Lỗi CSDL: ${insertError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã tạo đợt khảo sát mới." };
}

export async function deleteSurvey(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const surveyId = formData.get("surveyId") as string | null;
    const projectId = formData.get("projectId") as string | null;

    if (!surveyId || !isValidUUID(surveyId)) return { success: false, error: "ID Đợt khảo sát không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };

    const { error: deleteError } = await supabase
        .from("project_surveys")
        .delete()
        .eq("id", surveyId);

    if (deleteError) {
        console.error("Lỗi xóa đợt khảo sát:", deleteError.message);
        return { success: false, error: `Lỗi CSDL: ${deleteError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa đợt khảo sát." };
}

export async function createSurveyTask(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    const surveyId = formData.get("surveyId") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const title = (formData.get("title") as string)?.trim();
    const assignedTo = (formData.get("assigned_to") as string) || null;
    const dueDate = (formData.get("due_date") as string) || null;

    if (!surveyId) return { success: false, error: "ID Đợt khảo sát không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };
    if (!title) return { success: false, error: "Vui lòng chọn Tiêu đề công việc (từ Mẫu)." };

    const { data: templateData, error: templateError } = await supabase
        .from("survey_task_templates")
        .select("estimated_cost")
        .eq("title", title)
        .single();

    if (templateError) console.error("Không tìm thấy chi phí dự kiến cho mẫu:", title);

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

    if (insertError) {
        console.error("Lỗi tạo công việc khảo sát:", insertError.message);
        return { success: false, error: `Lỗi CSDL: ${insertError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm công việc khảo sát." };
}

export async function updateSurveyTask(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    const taskId = formData.get("taskId") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const title = (formData.get("title") as string)?.trim();
    const assignedTo = (formData.get("assigned_to") as string) || null;
    const dueDate = (formData.get("due_date") as string) || null;

    if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Công việc không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };
    if (!title) return { success: false, error: "Vui lòng chọn Tiêu đề công việc." };

    const { error: updateError } = await supabase
        .from("survey_tasks")
        .update({
            title: title,
            assigned_to: assignedTo === "unassigned" ? null : assignedTo,
            due_date: dueDate || null
        })
        .eq("id", taskId);

    if (updateError) {
        console.error("Lỗi cập nhật công việc khảo sát:", updateError.message);
        return { success: false, error: `Lỗi CSDL: ${updateError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã cập nhật công việc khảo sát." };
}

export async function deleteSurveyTask(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const taskId = formData.get("taskId") as string | null;
    const projectId = formData.get("projectId") as string | null;

    if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Công việc không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };

    const { error: deleteError } = await supabase
        .from("survey_tasks")
        .delete()
        .eq("id", taskId);

    if (deleteError) {
        console.error("Lỗi xóa công việc khảo sát:", deleteError.message);
        return { success: false, error: `Lỗi CSDL: ${deleteError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa công việc khảo sát." };
}

export async function updateSurveyTaskResult(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    const taskId = formData.get("taskId") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const notes = (formData.get("notes") as string)?.trim() || null;
    const cost = Number.parseFloat(formData.get("cost") as string) || 0;
    const status = formData.get("status") as string;

    // ✅ FIX: Sửa kiểu dữ liệu JSON -> any hoặc Record<string, any>
    const resultData: any = {
        result_text: (formData.get("result_data_text") as string) || null
    };

    if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Công việc không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };

    const { error: updateError } = await supabase
        .from("survey_tasks")
        .update({
            notes: notes,
            cost: cost,
            status: status,
            result_data: resultData
        })
        .eq("id", taskId);

    if (updateError) {
        console.error("Lỗi cập nhật kết quả khảo sát:", updateError.message);
        return { success: false, error: `Lỗi CSDL: ${updateError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã cập nhật kết quả khảo sát." };
}

export async function updateSurvey(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

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

    if (updateError) {
        console.error("Lỗi cập nhật đợt khảo sát:", updateError.message);
        return { success: false, error: `Lỗi CSDL: ${updateError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã cập nhật đợt khảo sát." };
}