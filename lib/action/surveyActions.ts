"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getCurrentUser } from "./authActions"; // Giả định import từ file authActions
import { isValidUUID } from "@/lib/utils/uuid";
import type { ActionResponse, ActionFetchResult } from "@/lib/action/projectActions";
import type { Tables, Json } from "@/types/supabase";

// --- Helper function để xử lý token ---
async function getSupabaseClient() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("sb-access-token")?.value || null;
        if (!token) {
            console.error("[getSupabaseClient] Lỗi: Không tìm thấy token.");
            return { client: null, error: { message: "Phiên đăng nhập hết hạn.", code: "401" } };
        }
        return { client: createSupabaseServerClient(token), error: null };
    } catch (e: any) {
        console.error("[getSupabaseClient] Lỗi nghiêm trọng:", e.message);
        return { client: null, error: { message: e.message, code: "500" } };
    }
}

// --- Lấy Danh mục/Mẫu ---

export async function getSurveyTemplates() {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { data: null, error: authError };

    const { data, error } = await supabase
        .from("survey_templates")
        .select(`id, name, description`)
        .eq('is_active', true)
        .order("name", { ascending: true });

    return { data, error };
}

export async function getSurveyTaskTemplates() {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { data: null, error: authError };

    const { data, error } = await supabase
        .from("survey_task_templates")
        .select(`id, title, category, description, estimated_cost`)
        .eq('is_active', true)
        .order("category", { ascending: true })
        .order("title", { ascending: true });

    return { data, error };
}


// --- Lấy Dữ liệu Khảo sát ---

/**
 * Lấy danh sách các đợt khảo sát của một dự án
 */
export async function getProjectSurveys(projectId: string) {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { data: null, error: authError };

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
        return { data: null, error: { message: `Lỗi tải đợt khảo sát: ${error.message}`, code: error.code } };
    }
    return { data, error: null };
}

/**
 * (MỚI) Lấy danh sách công việc chi tiết của một Đợt khảo sát
 */
export async function getSurveyTasks(surveyId: string) {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { data: null, error: authError };

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

/**
 * Tạo một Đợt Khảo sát mới (PM làm)
 */
export async function createSurvey(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    const projectId = formData.get("projectId") as string | null;
    const template_name = formData.get("template_name") as string | null; // Tên từ Mẫu
    const name_detail = (formData.get("name_detail") as string)?.trim(); // Tên tùy chỉnh (Lần 1, Lần 2...)
    const survey_date = formData.get("survey_date") as string | null;

    if (!projectId) return { success: false, error: "ID Dự án không hợp lệ." };
    if (!template_name) return { success: false, error: "Vui lòng chọn Loại khảo sát (từ Mẫu)." };

    // --- PHẦN FIX LỖI CÚ PHÁP ---
    if (!survey_date) return { success: false, error: "Vui lòng chọn ngày khảo sát." };
    // --- KẾT THÚC FIX ---

    // Ghép tên
    const finalName = name_detail ? `${template_name} - ${name_detail}` : template_name;

    const { error: insertError } = await supabase
        .from("project_surveys")
        .insert({
            project_id: projectId,
            name: finalName, // Tên đã ghép
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

/**
 * XÓA một Đợt Khảo sát (MỚI)
 */
export async function deleteSurvey(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const surveyId = formData.get("surveyId") as string | null;
    const projectId = formData.get("projectId") as string | null;

    if (!surveyId || !isValidUUID(surveyId)) return { success: false, error: "ID Đợt khảo sát không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };

    // (Kiểm tra quyền nếu cần)

    // Xóa (CSDL đã setup ON DELETE CASCADE, nên survey_tasks sẽ bị xóa theo)
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
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    const surveyId = formData.get("surveyId") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const title = (formData.get("title") as string)?.trim(); // Đây là Tên Mẫu (ví dụ: "Đo hướng gió")
    const assignedTo = (formData.get("assigned_to") as string) || null;
    const dueDate = (formData.get("due_date") as string) || null;

    if (!surveyId) return { success: false, error: "ID Đợt khảo sát không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };
    if (!title) return { success: false, error: "Vui lòng chọn Tiêu đề công việc (từ Mẫu)." };

    // Lấy chi phí dự kiến từ Mẫu (template)
    const { data: templateData, error: templateError } = await supabase
        .from("survey_task_templates")
        .select("estimated_cost")
        .eq("title", title) // Giả định title là unique
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
            cost: templateData?.estimated_cost || 0 // <-- FIX: Gán chi phí dự kiến làm chi phí ban đầu
        });

    if (insertError) {
        console.error("Lỗi tạo công việc khảo sát:", insertError.message);
        return { success: false, error: `Lỗi CSDL: ${insertError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm công việc khảo sát." };
}

/**
 * (MỚI) PM Cập nhật Công việc Khảo sát (Giao việc, Hạn chót)
 */

export async function updateSurveyTask(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    // Lấy dữ liệu
    const taskId = formData.get("taskId") as string | null;
    const projectId = formData.get("projectId") as string | null; // Cần để revalidate
    const title = (formData.get("title") as string)?.trim();
    const assignedTo = (formData.get("assigned_to") as string) || null;
    const dueDate = (formData.get("due_date") as string) || null;

    if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Công việc không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };
    if (!title) return { success: false, error: "Vui lòng chọn Tiêu đề công việc." };

    // (Kiểm tra quyền nếu cần)

    // Cập nhật CSDL
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
/**
 * XÓA một Công việc Khảo sát (MỚI)
 */
export async function deleteSurveyTask(prevState: ActionResponse, formData: FormData): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const taskId = formData.get("taskId") as string | null;
    const projectId = formData.get("projectId") as string | null;

    if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Công việc không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };

    // (Kiểm tra quyền nếu cần)

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

/**
 * Kỹ sư cập nhật kết quả khảo sát
 */
export async function updateSurveyTaskResult(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    // Lấy dữ liệu
    const taskId = formData.get("taskId") as string | null;
    const projectId = formData.get("projectId") as string | null;
    const notes = (formData.get("notes") as string)?.trim() || null; // "Hướng xử lý"
    const cost = Number.parseFloat(formData.get("cost") as string) || 0; // "Chi phí thực tế"
    const status = formData.get("status") as string; // 'completed' hoặc 'pending'

    // Lấy "Kết quả khảo sát" (JSONB)
    // Đây là ví dụ đơn giản, nếu form phức tạp, chúng ta sẽ xây dựng JSON ở đây
    const resultData: JSON = {
        result_text: (formData.get("result_data_text") as string) || null
    };

    if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Công việc không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };

    // Cập nhật CSDL
    const { error: updateError } = await supabase
        .from("survey_tasks")
        .update({
            notes: notes,
            cost: cost,
            status: status,
            result_data: resultData // <-- LƯU KẾT QUẢ SỐ HÓA
        })
        .eq("id", taskId);
    // (Nên thêm .eq("assigned_to", currentUser.id) để bảo mật)

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
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    // Lấy dữ liệu từ form
    const surveyId = formData.get("surveyId") as string | null;
    const projectId = formData.get("projectId") as string | null; // Cần để revalidate
    const name = (formData.get("name") as string)?.trim();
    const survey_date = formData.get("survey_date") as string | null;

    if (!surveyId || !isValidUUID(surveyId)) return { success: false, error: "ID Đợt khảo sát không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };
    if (!name) return { success: false, error: "Vui lòng nhập tên đợt khảo sát." };
    if (!survey_date) return { success: false, error: "Vui lòng chọn ngày khảo sát." };

    // (Kiểm tra quyền nếu cần)

    // Cập nhật CSDL
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

    // Revalidate
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã cập nhật đợt khảo sát." };
}