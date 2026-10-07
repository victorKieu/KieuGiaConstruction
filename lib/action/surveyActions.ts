"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";
import type { ActionResponse } from "@/lib/action/projectActions";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { rollupTaskProgressAndCost, updateProjectOverallProgress } from "@/lib/action/taskActions";

// --- 1. ACTIONS (READ) ---

export async function getProjectSurveys(projectId: string) {
    const supabase = await createSupabaseServerClient();

    if (!isValidUUID(projectId)) {
        return { data: null, error: { message: "Project ID không hợp lệ", code: "400" } };
    }

    const { data, error } = await supabase
        .from("project_surveys")
        .select(`
        *,
        created_by:employees (
            name,
            user_profiles!employees_id_fkey ( avatar_url ) 
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
                user_profiles!employees_id_fkey ( avatar_url ) 
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

async function checkAuth() {
    const userProfile = await getUserProfile();
    if (!userProfile || !userProfile.isAuthenticated) {
        throw new Error("Bạn cần đăng nhập để thực hiện thao tác này.");
    }
    if (!userProfile.entityId) {
        throw new Error("Tài khoản của bạn chưa được liên kết với hồ sơ nhân viên chính thức.");
    }
    return userProfile;
}

// ✅ FIX TS ERROR: Thêm : Promise<ActionResponse>
export async function createSurvey(prevState: any, formData: FormData): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();

    const projectId = formData.get("projectId") as string;
    const templateName = formData.get("template_name") as string;
    const nameDetail = formData.get("name_detail") as string;
    const surveyDate = formData.get("survey_date") as string;
    const wbsTaskId = formData.get("wbs_task_id") as string;

    if (!projectId || !templateName) {
        return { success: false, error: "Vui lòng chọn Mục đích khảo sát." };
    }

    const finalName = nameDetail ? `${templateName} - ${nameDetail}` : templateName;
    const finalWbsTaskId = (!wbsTaskId || wbsTaskId === "none" || wbsTaskId.trim() === "") ? null : wbsTaskId;

    try {
        const { data: existingSurvey, error: checkError } = await supabase
            .from("project_surveys")
            .select("id")
            .eq("project_id", projectId)
            .eq("name", finalName)
            .maybeSingle();

        if (checkError) {
            console.error("Lỗi kiểm tra trùng lặp:", checkError);
            return { success: false, error: "Lỗi kiểm tra dữ liệu: " + checkError.message };
        }

        if (existingSurvey) {
            return {
                success: false,
                error: `Đợt khảo sát "${finalName}" đã tồn tại. Vui lòng đổi Giai đoạn/Chi tiết!`
            };
        }

        const payload = {
            project_id: projectId,
            name: finalName,
            survey_date: surveyDate,
            wbs_task_id: finalWbsTaskId,
            status: 'pending',
            created_at: new Date().toISOString()
        };

        const { error: insertError } = await supabase
            .from("project_surveys")
            .insert([payload]);

        if (insertError) {
            throw insertError;
        }

        revalidatePath(`/app/projects/${projectId}`);
        return { success: true, message: "Tạo đợt khảo sát thành công!" };

    } catch (error: any) {
        console.error("Lỗi khi tạo khảo sát:", error);
        return { success: false, error: error.message || "Lỗi hệ thống không xác định." };
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
        const wbs_task_id = formData.get("wbs_task_id") as string | null;

        if (!surveyId || !isValidUUID(surveyId)) return { success: false, error: "ID Đợt khảo sát không hợp lệ." };
        if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };
        if (!name) return { success: false, error: "Vui lòng nhập tên đợt khảo sát." };
        if (!survey_date) return { success: false, error: "Vui lòng chọn ngày khảo sát." };

        const finalWbsTaskId = (!wbs_task_id || wbs_task_id === "none" || wbs_task_id.trim() === "") ? null : wbs_task_id;

        const { error: updateError } = await supabase
            .from("project_surveys")
            .update({
                name: name,
                survey_date: survey_date,
                wbs_task_id: finalWbsTaskId
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
        await checkAuth();
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
        const assignedTo = formData.get("assigned_to") as string;
        const dueDate = (formData.get("due_date") as string) || null;
        const notes = (formData.get("notes") as string) || null;

        if (!surveyId) return { success: false, error: "ID Đợt khảo sát thiếu." };
        if (!projectId) return { success: false, error: "ID Dự án thiếu." };
        if (!title) return { success: false, error: "Thiếu tiêu đề công việc." };

        const finalAssignedTo = (!assignedTo || assignedTo === "unassigned" || assignedTo.trim() === "") ? null : assignedTo;

        const { data: templateData } = await supabase
            .from("survey_task_templates")
            .select("estimated_cost")
            .eq("title", title)
            .maybeSingle();

        const { error: insertError } = await supabase
            .from("survey_tasks")
            .insert({
                survey_id: surveyId,
                title: title,
                notes: notes,
                assigned_to: finalAssignedTo,
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
        const assignedTo = formData.get("assigned_to") as string;
        const dueDate = (formData.get("due_date") as string) || null;
        const notes = (formData.get("notes") as string) || null;

        if (!taskId || !isValidUUID(taskId)) return { success: false, error: "ID Task không hợp lệ." };
        if (!projectId) return { success: false, error: "ID Dự án thiếu." };
        if (!title) return { success: false, error: "Thiếu tiêu đề." };

        const finalAssignedTo = (!assignedTo || assignedTo === "unassigned" || assignedTo.trim() === "") ? null : assignedTo;

        const { error: updateError } = await supabase
            .from("survey_tasks")
            .update({
                title: title,
                notes: notes,
                assigned_to: finalAssignedTo,
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

// ✅ FIX TS ERROR: Thêm : Promise<ActionResponse>
export async function updateSurveyTaskResult(prevState: any, formData: FormData): Promise<ActionResponse> {
    const taskId = formData.get("taskId") as string;
    const projectId = formData.get("projectId") as string;
    const status = formData.get("status") as string || "completed";

    if (!taskId || taskId === "null" || taskId === "undefined" || taskId.trim() === "") {
        console.error("Lỗi updateSurveyTaskResult: taskId không hợp lệ", taskId);
        return { success: false, error: "Lỗi Server: ID nhiệm vụ không hợp lệ." };
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
        await checkAuth();

        const { data: currentTask } = await supabase
            .from("survey_tasks")
            .select("attachments")
            .eq("id", taskId)
            .single();

        const oldAttachments: string[] = currentTask?.attachments || [];
        const urlsToDelete = oldAttachments.filter(url => !existingAttachments.includes(url));

        if (urlsToDelete.length > 0) {
            const filesToDelete = urlsToDelete.map(url => {
                const parts = url.split('/survey_files/');
                return parts.length > 1 ? parts[1] : null;
            }).filter(Boolean) as string[];

            if (filesToDelete.length > 0) {
                const { error: removeError } = await supabase.storage
                    .from('survey_files')
                    .remove(filesToDelete);
                if (removeError) console.error("❌ Lỗi khi xóa file vật lý khỏi Bucket:", removeError);
            }
        }

        const uploadedUrls: string[] = [];

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

        const finalAttachments = [...existingAttachments, ...uploadedUrls];

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

        if (error) throw error;

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

                const { data: surveyData, error: surveyError } = await supabase
                    .from("project_surveys")
                    .update({ status: surveyStatus, progress: progressPercent })
                    .eq("id", surveyId)
                    .select("wbs_task_id")
                    .single();

                if (surveyError) {
                    console.error("Lỗi update bảng project_surveys:", surveyError.message);
                }

                if (surveyData && surveyData.wbs_task_id) {
                    const linkedTaskId = surveyData.wbs_task_id;

                    await supabase
                        .from("project_tasks")
                        .update({ progress: progressPercent })
                        .eq("id", linkedTaskId);

                    const { data: taskData } = await supabase.from("project_tasks").select("project_id").eq("id", linkedTaskId).single();
                    if (taskData && taskData.project_id) {
                        await rollupTaskProgressAndCost(linkedTaskId, taskData.project_id);
                        await updateProjectOverallProgress(taskData.project_id);
                    }
                }
            }
        }

        if (projectId) {
            revalidatePath(`/projects/${projectId}`, 'layout');
        }

        return { success: true, message: "Cập nhật thành công!" };
    } catch (e: any) {
        console.error("Lỗi tại updateSurveyTaskResult:", e.message);
        return { success: false, error: "Lỗi Server: " + e.message }; // Sửa chữ message thành error
    }
}

export async function deleteSurveyTask(prevState: any, formData: FormData): Promise<ActionResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        await checkAuth();

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

// ✅ FIX TS ERROR: Thêm : Promise<ActionResponse>
export async function submitFullSurveyWizard(projectId: string, surveyData: any): Promise<ActionResponse> {
    try {
        const supabase = await createSupabaseServerClient();
        const userProfile = await checkAuth();

        const { error } = await supabase.from("project_surveys").insert({
            project_id: projectId,
            name: "Khảo sát Hiện trạng & Pháp lý (Full)",
            survey_date: new Date().toISOString(),
            status: 'completed',
            survey_details: surveyData,
            created_by: userProfile.entityId,
        });

        if (error) throw error;

        return { success: true, message: "Lưu thành công!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function getSurveyTypesFromDictionary() {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("sys_dictionaries")
        .select(`code, name, value`)
        .eq('category', 'SURVEY_TYPE')
        .eq('is_active', true)
        .order("sort_order", { ascending: true });

    return { data, error };
}