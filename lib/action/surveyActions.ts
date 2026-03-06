"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "./authActions";
import { isValidUUID } from "@/lib/utils/uuid";
import type { ActionResponse } from "@/lib/action/projectActions";


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
            assigned_to:employees ( 
                id,
                name, 
                user_profiles ( avatar_url ) 
            )
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

export async function updateSurveyTaskResult(prevState: any, formData: FormData) {
    const taskId = formData.get("taskId") as string;
    const projectId = formData.get("projectId") as string;
    const status = formData.get("status") as string || "completed";

    if (!taskId || taskId === "null" || taskId === "undefined") {
        console.error("Lỗi updateSurveyTaskResult: taskId không hợp lệ", taskId);
        return { success: false, message: "Lỗi Server: ID nhiệm vụ không hợp lệ." };
    }

    const textFromForm = formData.get("result_data_text") as string;
    const costFromForm = Number(formData.get("cost") || 0);
    const analysisJsonRaw = formData.get("analysis_json") as string;

    const files = formData.getAll("images") as File[];

    const existingAttachmentsRaw = formData.get("existing_attachments") as string;
    let existingAttachments: string[] = [];
    if (existingAttachmentsRaw) {
        try {
            existingAttachments = JSON.parse(existingAttachmentsRaw);
        } catch (e) {
            console.error("Lỗi parse ảnh cũ:", e);
        }
    }

    let analysisJson = null;
    if (analysisJsonRaw) {
        try {
            analysisJson = JSON.parse(analysisJsonRaw);
        } catch (e) {
            console.error("Lỗi parse JSON analysis:", e);
        }
    }

    try {
        const supabase = await createSupabaseServerClient();

        // ==========================================
        // 🚀 BƯỚC 1: TÌM VÀ XÓA ẢNH RÁC TRONG BUCKET
        // ==========================================
        // Lấy danh sách ảnh CŨ đang lưu trong DB trước khi bị ghi đè
        const { data: currentTask } = await supabase
            .from("survey_tasks")
            .select("attachments")
            .eq("id", taskId)
            .single();

        const oldAttachments: string[] = currentTask?.attachments || [];

        // Tìm ra những URL có trong DB cũ nhưng KHÔNG CÓ trong danh sách Client giữ lại
        const urlsToDelete = oldAttachments.filter(url => !existingAttachments.includes(url));

        if (urlsToDelete.length > 0) {
            // Tách lấy Tên File từ URL Public của Supabase
            // Ví dụ URL: https://xxx.supabase.co/storage/v1/object/public/survey_files/ten-file.jpg
            const filesToDelete = urlsToDelete.map(url => {
                const parts = url.split('/survey_files/');
                return parts.length > 1 ? parts[1] : null;
            }).filter(Boolean) as string[];

            // Ra lệnh xóa file vật lý trên Bucket
            if (filesToDelete.length > 0) {
                const { error: removeError } = await supabase.storage
                    .from('survey_files')
                    .remove(filesToDelete);

                if (removeError) {
                    console.error("❌ Lỗi khi xóa file vật lý khỏi Bucket:", removeError);
                } else {
                    console.log("✅ Đã dọn dẹp file vật lý thành công:", filesToDelete);
                }
            }
        }
        // ==========================================

        const uploadedUrls: string[] = [];

        // --- LOGIC UPLOAD ẢNH MỚI LÊN SUPABASE STORAGE ---
        if (files && files.length > 0) {
            for (const file of files) {
                if (file.size === 0) continue;

                const fileExt = file.name.split('.').pop();
                const fileName = `${taskId}-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

                const { error: uploadError } = await supabase.storage
                    .from('survey_files')
                    .upload(fileName, file);

                if (uploadError) {
                    console.error("❌ Lỗi upload ảnh:", uploadError);
                } else {
                    const { data: publicUrlData } = supabase.storage
                        .from('survey_files')
                        .getPublicUrl(fileName);
                    uploadedUrls.push(publicUrlData.publicUrl);
                }
            }
        }

        // GỘP ẢNH CŨ (ĐÃ GIỮ LẠI) VÀ ẢNH MỚI (VỪA UPLOAD)
        const finalAttachments = [...existingAttachments, ...uploadedUrls];

        // --- CẬP NHẬT TASK VÀO DATABASE ---
        const updateData: any = {
            status: status,
            notes: textFromForm,
            result_data: {
                analysis: analysisJson,
                raw_text: textFromForm,
                updated_at: new Date().toISOString()
            },
            cost: costFromForm,
            attachments: finalAttachments
        };

        const { data: updatedTask, error } = await supabase
            .from("survey_tasks")
            .update(updateData)
            .eq("id", taskId)
            .select("survey_id")
            .single();

        if (error) {
            console.error("Lỗi update task:", error);
            throw error;
        }

        // --- TÍNH % VÀ ĐỔI TRẠNG THÁI SURVEY BÊN NGOÀI ---
        if (updatedTask && updatedTask.survey_id) {
            const surveyId = updatedTask.survey_id;

            const { data: allTasks } = await supabase
                .from("survey_tasks")
                .select("status")
                .eq("survey_id", surveyId);

            if (allTasks) {
                const total = allTasks.length;
                const completed = allTasks.filter(t => t.status === 'completed').length;
                const progressPercent = total === 0 ? 0 : Math.round((completed / total) * 100);

                const surveyStatus = progressPercent === 100 ? 'completed' : 'pending';

                const { error: surveyError } = await supabase
                    .from("project_surveys")
                    .update({
                        progress: progressPercent,
                        status: surveyStatus
                    })
                    .eq("id", surveyId);

                if (surveyError) console.error("Lỗi update bảng project_surveys:", surveyError.message);
            }
        }

        // --- RESET CACHE UI ---
        if (projectId) {
            revalidatePath(`/projects/${projectId}`, 'layout');
        }

        return { success: true, message: "Cập nhật thành công!" };
    } catch (e: any) {
        console.error("Lỗi tại updateSurveyTaskResult:", e.message);
        return { success: false, message: "Lỗi Server: " + e.message };
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

// Thêm hàm này vào surveyActions.ts
export async function getSurveyTypesFromDictionary() {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("sys_dictionary")
        .select(`code, value`)
        .eq('type', 'survey_type')
        .eq('is_active', true)
        .order("value", { ascending: true });

    return { data, error };
}