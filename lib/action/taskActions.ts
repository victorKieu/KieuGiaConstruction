"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/session";
import { isValidUUID } from "@/lib/utils/uuid";
import { TaskData, CommentData } from "@/types/project";
import { getDictionaryItems } from "@/lib/action/dictionaryActions";
import { ActionFormState, ActionResponse, ActionFetchResult } from "./projectActions";

// --- HELPER: Clean UUID ---
const cleanUUID = (value: FormDataEntryValue | null): string | null => {
    const str = value?.toString().trim();
    if (!str || str === "null" || str === "undefined" || str === "unassigned" || !isValidUUID(str)) {
        return null;
    }
    return str;
};

// --- 1. DICTIONARIES ---
export async function getTaskDictionaries() {
    const statusItems = await getDictionaryItems("TASK_STATUS");
    const priorityItems = await getDictionaryItems("TASK_PRIORITY");

    // Xử lý dữ liệu trả về linh hoạt (Array hoặc Object)
    const getList = (res: any) => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
    }

    return {
        statuses: getList(statusItems),
        priorities: getList(priorityItems)
    };
}

// --- 2. READ TASKS ---
export async function getProjectTasks(projectId: string): Promise<TaskData[]> {
    if (!isValidUUID(projectId)) return [];
    const supabase = await createSupabaseServerClient();

    // ✅ FIX QUERY: Bỏ tên constraint cụ thể (!fk_...) để tránh lỗi sai tên.
    // Dùng tên bảng trực tiếp nếu chỉ có 1 quan hệ khóa ngoại.
    const { data, error } = await supabase.from('project_tasks').select(`
        *,
        assignee:employees ( 
            id, name, 
            user_profiles ( avatar_url ) 
        ),
        status:sys_dictionaries!status_id (
            id, name, code, color
        ),
        priority:sys_dictionaries!priority_id (
            id, name, code, color
        )
    `).eq('project_id', projectId).order('start_date', { ascending: true });

    /* LƯU Ý: Nếu đoạn trên vẫn lỗi, hãy thử thay bằng tên constraint mặc định thường thấy:
       assignee:employees!project_tasks_assigned_to_fkey (...)
       status:sys_dictionaries!project_tasks_status_id_fkey (...)
    */

    if (error) {
        console.error("❌ Lỗi getProjectTasks:", error.message);
        return [];
    }

    return data.map((t: any) => {
        const normalize = (f: any) => Array.isArray(f) ? f[0] : f;
        const assigneeData = normalize(t.assignee);

        let avatarUrl = null;
        if (assigneeData?.user_profiles) {
            const profiles = assigneeData.user_profiles;
            avatarUrl = Array.isArray(profiles) ? profiles[0]?.avatar_url : profiles?.avatar_url;
        }

        return {
            ...t,
            weight: Number(t.weight) || 0,
            progress: Number(t.progress) || 0,
            cost_estimate: Number(t.cost_estimate) || 0,

            status: normalize(t.status),
            priority: normalize(t.priority),

            assignee: assigneeData ? {
                id: assigneeData.id,
                name: assigneeData.name,
                avatar_url: avatarUrl
            } : null
        };
    });
}
// --- 3. CREATE TASK ---
export async function createTask(projectId: string, formData: FormData): Promise<ActionResponse> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập" };

    const supabase = await createSupabaseServerClient();

    // ✅ DEBUG: In ra giá trị nhận được để kiểm tra
    console.log("🔍 [DEBUG] Cost Input:", formData.get("cost_estimate"));
    console.log("🔍 [DEBUG] Assignee Input:", formData.get("assigned_to"));

    const payload = {
        name: formData.get("name"),
        project_id: projectId,
        parent_id: cleanUUID(formData.get("parent_id")),
        assigned_to: cleanUUID(formData.get("assigned_to")),
        priority_id: cleanUUID(formData.get("priority_id")),
        status_id: cleanUUID(formData.get("status_id")),

        start_date: formData.get("start_date") || null,
        due_date: formData.get("due_date") || null,
        description: formData.get("description"),
        weight: Number(formData.get("weight")) || 0,
        cost_estimate: Number(formData.get("cost_estimate")) || 0, // ✅ Lưu chi phí
        progress: 0,
        created_by: session.entityId
    };

    const { error } = await supabase.from('project_tasks').insert(payload);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Tạo công việc thành công" };
}

// --- 4. UPDATE TASK ---
export async function updateTask(taskId: string, projectId: string, formData: FormData): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();

    const payload = {
        name: formData.get("name"),
        assigned_to: cleanUUID(formData.get("assigned_to")),
        priority_id: cleanUUID(formData.get("priority_id")),
        status_id: cleanUUID(formData.get("status_id")),
        progress: Number(formData.get("progress")) || 0,
        weight: Number(formData.get("weight")) || 0,
        cost_estimate: Number(formData.get("cost_estimate")) || 0, // ✅ Cập nhật chi phí
        start_date: formData.get("start_date") || null,
        due_date: formData.get("due_date") || null,
        description: formData.get("description"),
        updated_at: new Date().toISOString()
    };

    const { error } = await supabase.from('project_tasks').update(payload).eq('id', taskId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Cập nhật thành công" };
}

export async function deleteTask(taskId: string, projectId: string): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa công việc" };
}

export async function toggleTaskLike(taskId: string, isLiking: boolean): Promise<ActionResponse> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập" };

    const supabase = await createSupabaseServerClient();
    const userId = session.userId;

    if (isLiking) await supabase.from("task_likes").insert({ task_id: taskId, user_id: userId });
    else await supabase.from("task_likes").delete().eq("task_id", taskId).eq("user_id", userId);

    const { count } = await supabase.from("task_likes").select('*', { count: 'exact', head: true }).eq("task_id", taskId);
    await supabase.from("project_tasks").update({ likes_count: count || 0 }).eq("id", taskId);

    const { data } = await supabase.from("project_tasks").select("project_id").eq("id", taskId).single();
    if (data?.project_id) revalidatePath(`/projects/${data.project_id}`);

    return { success: true };
}

// --- 4. COMMENTS (Giữ nguyên) ---
export async function getTaskComments(taskId: string): Promise<ActionFetchResult<CommentData[]>> {
    if (!isValidUUID(taskId)) return { data: [], error: { message: "ID không hợp lệ", code: "400" } };
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.from("project_comments")
        .select(`*, created_by:user_profiles ( id, name, avatar_url )`)
        .eq("task_id", taskId).order("created_at", { ascending: true });

    if (error) return { data: [], error: { message: error.message, code: error.code } };
    return { data: data as CommentData[], error: null };
}

export async function createComment(projectId: string, taskId: string, prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập" };

    const content = (formData.get("content") as string)?.trim();
    if (!content) return { success: false, error: "Nội dung trống" };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("project_comments").insert({
        project_id: projectId, task_id: taskId, content, created_by: session.userId, parent_comment_id: formData.get("parent_comment_id") || null
    });

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
    return { success: true, message: "Đã gửi bình luận" };
}

export async function updateComment(prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Auth required" };

    const commentId = formData.get("comment_id") as string;
    const projectId = formData.get("project_id") as string;
    const content = formData.get("content") as string;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("project_comments").update({ content, updated_at: new Date() }).eq("id", commentId).eq("created_by", session.userId);

    if (error) return { success: false, error: error.message };

    const { data } = await supabase.from("project_comments").select("task_id").eq("id", commentId).single();
    if (data?.task_id) revalidatePath(`/projects/${projectId}/tasks/${data.task_id}`);

    return { success: true, message: "Updated" };
}

export async function deleteComment(prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getCurrentSession();
    const commentId = formData.get("comment_id") as string;
    const projectId = formData.get("project_id") as string;

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("project_comments").select("task_id").eq("id", commentId).single();

    const { error } = await supabase.from("project_comments").delete().eq("id", commentId).eq("created_by", session.userId);
    if (error) return { success: false, error: error.message };

    if (data?.task_id) revalidatePath(`/projects/${projectId}/tasks/${data.task_id}`);
    return { success: true, message: "Deleted" };
}

export async function toggleCommentLike(commentId: string, isLiking: boolean): Promise<ActionResponse> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Auth required" };
    const supabase = await createSupabaseServerClient();
    const userId = session.userId;

    if (isLiking) await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
    else await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);

    const { count } = await supabase.from("comment_likes").select('*', { count: 'exact', head: true }).eq("comment_id", commentId);
    await supabase.from("project_comments").update({ likes_count: count || 0 }).eq("id", commentId);

    return { success: true };
}