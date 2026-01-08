"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/session";
import { isValidUUID } from "@/lib/utils/uuid";
import {
    ProjectData, MemberData, DocumentData, FinanceData,
    MilestoneData, TaskData, CommentData
} from "@/types/project";
import { checkPermission } from "@/lib/auth/permissions";

// --- TYPES ---
export interface ActionError {
    message: string;
    code: string;
}

export interface ActionFetchResult<T> {
    data: T | null;
    error: ActionError | null;
}

export interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
    data?: any;
}

export interface ActionFormState {
    success: boolean;
    message?: string;
    error?: string;
}

type GetProjectResult = ActionFetchResult<ProjectData>;
type GetProjectsResult = ActionFetchResult<ProjectData[]>;
type GetMembersResult = ActionFetchResult<MemberData[]>;
type GetDocumentsResult = ActionFetchResult<DocumentData[]>;
type GetFinanceResult = ActionFetchResult<FinanceData>;
type GetMilestonesResult = ActionFetchResult<MilestoneData[]>;
type GetTasksResult = ActionFetchResult<TaskData[]>;
type GetCommentsResult = ActionFetchResult<CommentData[]>;

// ----------------------------------------------------------------------
// --- PROJECT ACTIONS ---
// ----------------------------------------------------------------------

export async function getProjectTypes() {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
        .from("sys_dictionaries")
        .select("id, name, code")
        .eq("category", "PROJECT_TYPE")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    return data || [];
}

export async function getConstructionTypes() {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
        .from("sys_dictionaries")
        .select("id, name, code")
        .eq("category", "CONSTRUCTION_TYPE")
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

    return data || [];
}

/**
 * ✅ Lấy danh sách tất cả dự án (Kèm tổng giá trị Hợp đồng)
 */
export async function getProjects(): Promise<GetProjectsResult> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.entityId) {
        return { data: [], error: { message: "Chưa đăng nhập", code: "403" } };
    }

    const supabase = await createSupabaseServerClient();

    // ✅ FIX LỖI AMBIGUOUS: Thêm !contracts_project_id_fkey
    let query = supabase.from("projects").select(`
        *,
        customer:customers!customer_id (name, user_profiles(avatar_url)),
        manager:employees!project_manager (name, user_profiles(avatar_url)),
        status_data:sys_dictionaries!status_id (name, color, code),
        priority_data:sys_dictionaries!priority_id (name, color, code),
        contracts:contracts!contracts_project_id_fkey (value, status)
    `);

    // Data Scope
    if (session.type === 'employee' && session.role !== 'admin') {
        // query = query.not('project_members.employee_id', 'is', null) 
    } else if (session.type === 'customer') {
        query = query.eq('customer_id', session.entityId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("Lỗi getProjects:", error.message);
        return { data: [], error: { message: error.message, code: error.code } };
    }

    // Map dữ liệu và tính tổng tiền hợp đồng
    const formattedData = data.map((p: any) => {
        const totalContractValue = p.contracts?.reduce((sum: number, c: any) => {
            return c.status !== 'cancelled' ? sum + (c.value || 0) : sum;
        }, 0) || 0;

        return {
            ...p,
            total_contract_value: totalContractValue,
            customer: p.customer ? { ...p.customer, avatar_url: p.customer.user_profiles?.avatar_url } : null,
            manager: p.manager ? { ...p.manager, avatar_url: p.manager.user_profiles?.avatar_url } : null,
        };
    });

    return { data: formattedData as ProjectData[], error: null };
}

/**
 * Lấy một dự án cụ thể theo ID
 */
export async function getProject(id: string): Promise<GetProjectResult> {
    if (!isValidUUID(id)) return { data: null, error: { message: "ID dự án không hợp lệ.", code: "400" } };

    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.entityId) {
        return { data: null, error: { message: "Chưa đăng nhập.", code: "403" } };
    }

    const supabase = await createSupabaseServerClient();

    // 3. Xây dựng Select Query
    // ✅ FIX LỖI AMBIGUOUS: Thêm !contracts_project_id_fkey vào phần contracts
    let selectString = `
        *,
        customer:customers!customer_id ( 
            id, name, address, phone, email,
            user_profiles!customers_id_fkey1 ( avatar_url )
        ),
        manager:employees!project_manager ( 
            id, name, 
            user_profiles ( avatar_url ) 
        ), 
        creator:employees!projects_created_by_fkey ( id, name ),
        
        status_data:sys_dictionaries!status_id ( name, color, code ),
        priority_data:sys_dictionaries!priority_id ( name, color, code ),
        type_data:sys_dictionaries!type_id ( name, color, code ),
        construction_type_data:sys_dictionaries!construction_type_id ( name, color, code ),
        risk_data:sys_dictionaries!risk_level_id ( name, color, code ),

        member_count:project_members ( count ),
        document_count:project_documents ( count ),

        contracts:contracts!contracts_project_id_fkey (value, status)
    `;

    if (session.type === 'employee' && session.role !== 'admin') {
        selectString += `, check_member:project_members!inner(employee_id)`;
    }

    let query = supabase.from("projects").select(selectString);

    if (session.type === 'employee' && session.role !== 'admin') {
        query = query.eq('check_member.employee_id', session.entityId);
    } else if (session.type === 'customer') {
        query = query.eq('customer_id', session.entityId);
    }

    const { data: projectData, error } = await query.eq("id", id).maybeSingle();

    if (error) {
        console.error("Lỗi getProject:", error.message);
        return { data: null, error: { message: `Lỗi tải dự án: ${error.message}`, code: error.code || "db_error" } };
    }

    if (!projectData) {
        return { data: null, error: { message: "Không tìm thấy dự án hoặc bạn không có quyền.", code: "404" } };
    }

    const rawProject = projectData as any;
    const { check_member, ...cleanProjectData } = rawProject;

    const getAvatar = (profileData: any) => {
        if (!profileData) return null;
        if (Array.isArray(profileData)) return profileData[0]?.avatar_url || null;
        return profileData.avatar_url || null;
    };

    // Tính tổng giá trị hợp đồng
    const totalContractValue = rawProject.contracts?.reduce((sum: number, c: any) => {
        return c.status !== 'cancelled' ? sum + (c.value || 0) : sum;
    }, 0) || 0;

    const finalProject: ProjectData = {
        ...cleanProjectData,
        total_contract_value: totalContractValue,
        customer: rawProject.customer ? {
            id: rawProject.customer.id,
            name: rawProject.customer.name,
            address: rawProject.customer.address,
            phone: rawProject.customer.phone,
            email: rawProject.customer.email,
            avatar_url: getAvatar(rawProject.customer.user_profiles)
        } : null,
        manager: rawProject.manager ? {
            id: rawProject.manager.id,
            name: rawProject.manager.name,
            avatar_url: getAvatar(rawProject.manager.user_profiles)
        } : null,
        client: rawProject.customer ? {
            id: rawProject.customer.id,
            name: rawProject.customer.name,
            avatar_url: getAvatar(rawProject.customer.user_profiles)
        } : null,
        creator: rawProject.creator,
        member_count: rawProject.member_count?.[0]?.count || 0,
        document_count: rawProject.document_count?.[0]?.count || 0,
    };

    return { data: finalProject, error: null };
}

// ... (Giữ nguyên các hàm createProject, updateProject, deleteProject...)
export async function createProject(formData: FormData): Promise<ActionResponse> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.entityId) return { success: false, error: "Bạn cần đăng nhập." };

    const supabase = await createSupabaseServerClient();

    const typeId = formData.get("type_id") as string;
    const constructionTypeId = formData.get("construction_type_id") as string;

    const projectData: any = {
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        description: (formData.get("description") as string) || null,
        address: (formData.get("address") as string) || null,
        geocode: (formData.get("geocode") as string) || null,
        status: "active",

        type_id: (typeId && typeId !== "null") ? typeId : null,
        construction_type_id: (constructionTypeId && constructionTypeId !== "null") ? constructionTypeId : null,

        project_manager: (formData.get("project_manager") as string) || null,
        customer_id: (formData.get("customer_id") as string) || null,
        budget: Number(formData.get("budget")) || 0,
        start_date: (formData.get("start_date") as string),
        end_date: (formData.get("end_date") as string),
        updated_at: new Date().toISOString(),
        created_by: session.entityId,
    };

    const { data, error } = await supabase
        .from("projects")
        .insert(projectData)
        .select();

    if (error) return { success: false, error: error.message };

    const newProject = data?.[0];

    // Tự động thêm người tạo là Manager
    if (newProject && session.type === 'employee') {
        const { data: roleData } = await supabase
            .from("sys_dictionaries")
            .select("id")
            .eq("category", "PROJECT_ROLE")
            .eq("code", "MANAGER")
            .maybeSingle();

        await supabase
            .from("project_members")
            .insert({
                project_id: newProject.id,
                employee_id: session.entityId,
                role_id: roleData?.id,
                joined_at: new Date().toISOString()
            });
    }

    revalidatePath("/projects");
    return { success: true, message: "Tạo dự án thành công!", data: data as ProjectData[] };
}

export async function updateProject(formData: FormData): Promise<ActionResponse> {
    const projectId = formData.get("id") as string;
    if (!projectId) return { success: false, error: "Thiếu ID dự án." };

    const hasPermission = await checkPermission("projects", "update");
    if (!hasPermission) return { success: false, error: "⛔ Bạn không có quyền chỉnh sửa dự án này!" };

    const supabase = await createSupabaseServerClient();

    const typeId = formData.get("type_id") as string;
    const constructionTypeId = formData.get("construction_type_id") as string;

    const updateData: any = {
        updated_at: new Date().toISOString(),
        type_id: (typeId && typeId !== "null") ? typeId : null,
        construction_type_id: (constructionTypeId && constructionTypeId !== "null") ? constructionTypeId : null,
    };

    const fields = [
        "name", "code", "description", "address", "geocode",
        "start_date", "end_date", "customer_id", "project_manager", "status"
    ];

    fields.forEach(field => {
        const value = formData.get(field);
        if (value !== null) {
            updateData[field] = value === "" ? null : value;
        }
    });

    if (formData.has("budget")) updateData.budget = Number(formData.get("budget"));

    const { error } = await supabase
        .from("projects")
        .update(updateData)
        .eq("id", projectId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/projects");
    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Cập nhật thành công!" };
}

export async function deleteProject(projectId: string): Promise<ActionResponse> {
    const hasPermission = await checkPermission("projects", "delete");
    if (!hasPermission) return { success: false, error: "⛔ Bạn không có quyền xóa dự án này!" };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("projects").delete().eq("id", projectId);

    if (error) return { success: false, error: error.message };

    revalidatePath("/projects");
    return { success: true, message: "Đã xóa dự án." };
}

// ... (Giữ nguyên các hàm khác: getProjectRoles, getProjectMembers, v.v...)
export async function getProjectRoles() {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
        .from("sys_dictionaries")
        .select("id, name, code")
        .eq("category", "PROJECT_ROLE")
        .order("sort_order", { ascending: true });
    return data || [];
}

export async function getProjectMembers(projectId: string) {
    if (!isValidUUID(projectId)) return { data: [], error: "ID dự án không hợp lệ." };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("project_members")
        .select(`
            project_id, 
            joined_at, 
            employee_id,
            role_id,
            role:sys_dictionaries!role_id ( name, code ),
            employee:employees (
                id, 
                name, 
                email,
                position:sys_dictionaries!position_id ( name ),
                user_profiles ( avatar_url )
            )
        `)
        .eq("project_id", projectId);

    if (error) {
        console.error("Lỗi getProjectMembers:", error.message);
        return { data: [], error: error.message };
    }

    const formattedMembers = data?.map((m: any) => {
        let avatarUrl = null;
        if (m.employee?.user_profiles) {
            avatarUrl = Array.isArray(m.employee.user_profiles)
                ? m.employee.user_profiles[0]?.avatar_url
                : m.employee.user_profiles.avatar_url;
        }

        return {
            ...m,
            role_name: m.role?.name || "Thành viên",
            role_code: m.role?.code || "MEMBER",
            employee: m.employee ? {
                ...m.employee,
                avatar_url: avatarUrl || null,
                position: m.employee.position?.name || "—"
            } : null
        }
    }) || [];

    return { data: formattedMembers, error: null };
}

export async function getCurrentUserRoleInProject(projectId: string) {
    if (!isValidUUID(projectId)) return null;

    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.entityId) return null;

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
        .from("project_members")
        .select(`role:sys_dictionaries!role_id ( code )`)
        .eq("project_id", projectId)
        .eq("employee_id", session.entityId)
        .maybeSingle();

    return (data?.role as any)?.code || null;
}

export async function addProjectMember(projectId: string, employeeId: string, roleId: string) {
    const supabase = await createSupabaseServerClient();

    const { data: existing } = await supabase
        .from("project_members")
        .select("employee_id")
        .eq("project_id", projectId)
        .eq("employee_id", employeeId)
        .single();

    if (existing) {
        return { success: false, error: "Nhân viên này đã có trong dự án." };
    }

    const { error } = await supabase.from("project_members").insert({
        project_id: projectId,
        employee_id: employeeId,
        role_id: roleId,
        joined_at: new Date().toISOString()
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm thành viên thành công." };
}

export async function removeProjectMember(projectId: string, employeeId: string) {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
        .from("project_members")
        .delete()
        .eq("project_id", projectId)
        .eq("employee_id", employeeId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa thành viên khỏi dự án." };
}

export async function getProjectDocuments(projectId: string): Promise<GetDocumentsResult> {
    if (!isValidUUID(projectId)) return { data: null, error: { message: "ID không hợp lệ", code: "400" } };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("project_documents")
        .select(`
            id, name, type, url, uploaded_at, project_id, description, category,
            uploaded_by:employees!project_documents_uploaded_by_fkey ( name )
        `)
        .eq("project_id", projectId);

    if (error) {
        console.error("Lỗi getProjectDocuments:", error);
        return { data: null, error: { message: error.message, code: error.code } };
    }

    const documentsData: DocumentData[] = (data || []).map((item: any) => ({
        ...item,
        uploaded_by: Array.isArray(item.uploaded_by) ? item.uploaded_by[0] : item.uploaded_by || { name: "N/A" }
    }));

    return { data: documentsData, error: null };
}

export async function getProjectFinance(projectId: string): Promise<GetFinanceResult> {
    if (!isValidUUID(projectId)) return { data: null, error: { message: "ID không hợp lệ", code: "400" } };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("project_finance")
        .select(`
            id, budget, spent, remaining, updated_at,
            allocation:finance_allocation ( * )
        `)
        .eq("project_id", projectId)
        .maybeSingle();

    if (error) return { data: null, error: { message: error.message, code: error.code } };

    return { data: data as FinanceData | null, error: null };
}

export async function getProjectTasks(projectId: string): Promise<GetTasksResult> {
    if (!isValidUUID(projectId)) return { data: null, error: { message: "ID không hợp lệ", code: "400" } };

    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("project_tasks")
        .select(`
            *,
            assigned_to:employees ( 
                id, name, 
                user_profiles ( avatar_url )
            )
        `)
        .eq("project_id", projectId)
        .order("due_date", { ascending: true, nullsFirst: false });

    if (error) return { data: null, error: { message: error.message, code: error.code } };

    const tasksData: TaskData[] = (data || []).map((item: any) => ({
        ...item,
        assigned_to: item.assigned_to ? {
            id: item.assigned_to.id,
            name: item.assigned_to.name,
            avatar_url: item.assigned_to.user_profiles?.avatar_url || null
        } : null
    }));

    return { data: tasksData, error: null };
}

export async function getProjectMilestones(projectId: string): Promise<GetMilestonesResult> {
    if (!isValidUUID(projectId)) return { data: null, error: { message: "ID không hợp lệ", code: "400" } };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("project_milestones")
        .select("*")
        .eq("project_id", projectId)
        .order("planned_start_date", { ascending: true });

    if (error) return { data: null, error: { message: error.message, code: error.code } };
    return { data: data as MilestoneData[], error: null };
}

export async function createTask(projectId: string, formData: FormData): Promise<ActionResponse> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập." };

    const supabase = await createSupabaseServerClient();

    const assignedTo = formData.get("assigned_to") as string;
    const insertData = {
        project_id: projectId,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        status: (formData.get("status") as string) || "pending",
        assigned_to: (assignedTo === "unassigned" || !assignedTo) ? null : assignedTo,
        priority: (formData.get("priority") as string) || "low",
        progress: Number(formData.get("progress")) || 0,
        start_date: (formData.get("start_date") as string) || null,
        due_date: (formData.get("due_date") as string) || null,
        created_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("project_tasks").insert(insertData);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Tạo công việc thành công!" };
}

export async function updateTask(taskId: string, formData: FormData): Promise<ActionResponse> {
    if (!isValidUUID(taskId)) return { success: false, error: "ID không hợp lệ." };

    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập." };

    const supabase = await createSupabaseServerClient();
    const updatedData: any = { updated_at: new Date().toISOString() };

    const fields = ["name", "description", "status", "priority", "start_date", "due_date", "progress"];
    fields.forEach(f => {
        const val = formData.get(f);
        if (val !== null) updatedData[f] = val;
    });

    const assignedTo = formData.get("assigned_to") as string;
    if (assignedTo !== null) {
        updatedData.assigned_to = (assignedTo === "unassigned" || assignedTo === "") ? null : assignedTo;
    }

    const { error } = await supabase.from("project_tasks").update(updatedData).eq("id", taskId);
    if (error) return { success: false, error: error.message };

    const { data } = await supabase.from("project_tasks").select("project_id").eq("id", taskId).single();
    if (data?.project_id) revalidatePath(`/projects/${data.project_id}`);

    return { success: true, message: "Cập nhật thành công!" };
}

export async function deleteTask(taskId: string): Promise<ActionResponse> {
    if (!isValidUUID(taskId)) return { success: false, error: "ID không hợp lệ." };

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("project_tasks").select("project_id").eq("id", taskId).single();

    const { error } = await supabase.from("project_tasks").delete().eq("id", taskId);
    if (error) return { success: false, error: error.message };

    if (data?.project_id) revalidatePath(`/projects/${data.project_id}`);
    return { success: true, message: "Đã xóa công việc." };
}

export async function getTaskComments(taskId: string): Promise<GetCommentsResult> {
    if (!isValidUUID(taskId)) return { data: null, error: { message: "ID không hợp lệ", code: "400" } };

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("project_comments")
        .select(`*, created_by:user_profiles ( id, name, avatar_url )`)
        .eq("task_id", taskId)
        .order("created_at", { ascending: true });

    if (error) return { data: null, error: { message: error.message, code: error.code } };

    const comments = data?.map(item => ({
        ...item,
        created_by: item.created_by || { id: "unknown", name: "Ẩn danh", avatar_url: null }
    })) as CommentData[];

    return { data: comments, error: null };
}

export async function createComment(
    projectId: string,
    taskId: string,
    prevState: ActionFormState,
    formData: FormData
): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.userId) return { success: false, error: "Chưa đăng nhập." };

    const content = (formData.get("content") as string)?.trim();
    if (!content) return { success: false, error: "Nội dung trống." };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("project_comments").insert({
        project_id: projectId,
        task_id: taskId,
        content: content,
        created_by: session.userId,
        parent_comment_id: (formData.get("parent_comment_id") as string) || null
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}/tasks/${taskId}`);
    return { success: true, message: "Đã gửi bình luận." };
}

export async function toggleTaskLike(taskId: string, isLiking: boolean): Promise<ActionResponse> {
    if (!isValidUUID(taskId)) return { success: false, error: "ID không hợp lệ." };

    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập." };

    const supabase = await createSupabaseServerClient();
    const userId = session.userId;

    if (isLiking) {
        await supabase.from("task_likes").insert({ task_id: taskId, user_id: userId });
    } else {
        await supabase.from("task_likes").delete().eq("task_id", taskId).eq("user_id", userId);
    }

    const { count } = await supabase.from("task_likes").select('*', { count: 'exact', head: true }).eq("task_id", taskId);
    await supabase.from("project_tasks").update({ likes_count: count || 0 }).eq("id", taskId);

    const { data } = await supabase.from("project_tasks").select("project_id").eq("id", taskId).single();
    if (data?.project_id) revalidatePath(`/projects/${data.project_id}`);

    return { success: true };
}

export async function uploadDocument(
    prevState: ActionFormState,
    formData: FormData
): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.entityId) return { success: false, error: "Chưa đăng nhập." };

    const projectId = formData.get("projectId") as string;
    const file = formData.get("document_file") as File;
    const name = (formData.get("name") as string)?.trim();
    const category = (formData.get("category") as string)?.trim() || 'others';

    if (!projectId || !file || !name) return { success: false, error: "Thiếu thông tin." };

    const supabase = await createSupabaseServerClient();
    const fileExt = file.name.split('.').pop()?.toLowerCase() || '';
    const filePath = `${projectId}/${category}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
    const bucketName = 'project-documents';

    const { error: uploadError } = await supabase.storage.from(bucketName).upload(filePath, file);
    if (uploadError) return { success: false, error: `Lỗi upload: ${uploadError.message}` };

    const { data: urlData } = supabase.storage.from(bucketName).getPublicUrl(filePath);

    const { error: insertError } = await supabase.from("project_documents").insert({
        project_id: projectId,
        name: name,
        description: formData.get("description") as string,
        type: fileExt,
        url: urlData.publicUrl,
        uploaded_by: session.entityId,
        category: category,
    });

    if (insertError) {
        await supabase.storage.from(bucketName).remove([filePath]);
        return { success: false, error: insertError.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Tải tài liệu thành công!" };
}

export async function updateDocument(
    prevState: ActionFormState,
    formData: FormData
): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập." };

    const documentId = formData.get("documentId") as string;
    const projectId = formData.get("projectId") as string;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("project_documents").update({
        name: formData.get("name") as string,
        description: formData.get("description") as string,
        category: formData.get("category") as string,
    }).eq("id", documentId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Cập nhật thành công!" };
}

export async function deleteDocument(
    prevState: ActionFormState,
    formData: FormData
): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập." };

    const documentId = formData.get("documentId") as string;
    const projectId = formData.get("projectId") as string;

    const supabase = await createSupabaseServerClient();

    const { data: doc } = await supabase.from("project_documents").select("url").eq("id", documentId).single();

    const { error } = await supabase.from("project_documents").delete().eq("id", documentId);
    if (error) return { success: false, error: error.message };

    if (doc?.url) {
        const bucketName = 'project-documents';
        const filePath = doc.url.split(`${bucketName}/`)[1];
        if (filePath) await supabase.storage.from(bucketName).remove([filePath]);
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa tài liệu." };
}

export async function updateComment(
    prevState: ActionFormState,
    formData: FormData
): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.userId) return { success: false, error: "Chưa đăng nhập." };

    const content = (formData.get("content") as string)?.trim();
    const commentId = formData.get("comment_id") as string;
    const projectId = formData.get("project_id") as string;

    if (!content) return { success: false, error: "Nội dung trống." };

    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
        .from("project_comments")
        .update({ content: content, updated_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("created_by", session.userId);

    if (error) return { success: false, error: error.message };

    const { data } = await supabase.from("project_comments").select("task_id").eq("id", commentId).single();
    if (data?.task_id) revalidatePath(`/projects/${projectId}/tasks/${data.task_id}`);

    return { success: true, message: "Đã cập nhật bình luận." };
}

export async function deleteComment(
    prevState: ActionFormState,
    formData: FormData
): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.userId) return { success: false, error: "Chưa đăng nhập." };

    const commentId = formData.get("comment_id") as string;
    const projectId = formData.get("project_id") as string;

    const supabase = await createSupabaseServerClient();

    const { data } = await supabase.from("project_comments").select("task_id").eq("id", commentId).single();

    const { error } = await supabase
        .from("project_comments")
        .delete()
        .eq("id", commentId)
        .eq("created_by", session.userId);

    if (error) return { success: false, error: error.message };

    if (data?.task_id) revalidatePath(`/projects/${projectId}/tasks/${data.task_id}`);

    return { success: true, message: "Đã xóa bình luận." };
}

export async function toggleCommentLike(commentId: string, isLiking: boolean): Promise<ActionResponse> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.userId) return { success: false, error: "Chưa đăng nhập." };

    const supabase = await createSupabaseServerClient();
    const userId = session.userId;

    if (isLiking) {
        await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: userId });
    } else {
        await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
    }

    const { count } = await supabase
        .from("comment_likes")
        .select('*', { count: 'exact', head: true })
        .eq("comment_id", commentId);

    await supabase
        .from("project_comments")
        .update({ likes_count: count || 0 })
        .eq("id", commentId);

    const { data } = await supabase.from("project_comments").select("project_id, task_id").eq("id", commentId).single();
    if (data?.project_id && data?.task_id) {
        revalidatePath(`/projects/${data.project_id}/tasks/${data.task_id}`);
    }

    return { success: true };
}

export async function getProjectById(id: string) {
    const result = await getProject(id);
    if (!result.data) {
        return { success: false, error: result.error?.message || "Không tìm thấy dự án" };
    }
    return { success: true, data: result.data };
}