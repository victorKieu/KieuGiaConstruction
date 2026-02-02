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
export async function getProjects() {
    console.log("\n🚀 [DEBUG] Bắt đầu gọi hàm getProjects()...");

    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.entityId) {
        console.log("❌ [DEBUG] Chưa đăng nhập.");
        return { data: [], error: { message: "Chưa đăng nhập", code: "403" } };
    }

    const supabase = await createSupabaseServerClient();

    // 1. Query Data
    // Lưu ý: Tôi dùng tên relation chính xác như bạn đã cung cấp ở các bước trước
    let query = supabase.from("projects").select(`
        *,
        status_data:sys_dictionaries!status_id (name, color, code),
        priority_data:sys_dictionaries!priority_id (name, color, code),
        construction_type_data:sys_dictionaries!construction_type_id (name, code),
        contracts:contracts!contracts_project_id_fkey (value, status) 
    `);

    // Phân quyền (Nếu cần)
    if (session.type === 'customer') {
        query = query.eq('customer_id', session.entityId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    // --- 🔍 DEBUG LOG: KIỂM TRA DỮ LIỆU THÔ TỪ DB ---
    if (error) {
        console.error("❌ [DEBUG] Lỗi Query Supabase:", error);
        return { data: [], error: { message: error.message, code: error.code } };
    }

    if (data && data.length > 0) {
        console.log(`✅ [DEBUG] Tìm thấy ${data.length} dự án.`);

        // Log thử dự án đầu tiên xem cấu trúc status_data và contracts trả về là Mảng hay Object
        const firstP = data[0];
        console.log("🔍 [DEBUG] Sample Project Raw Data (ID):", firstP.id);
        console.log("   -> status_data (Raw):", JSON.stringify(firstP.status_data));
        console.log("   -> contracts (Raw):", JSON.stringify(firstP.contracts));
    } else {
        console.log("⚠️ [DEBUG] Không tìm thấy dự án nào (Data rỗng).");
    }
    // ------------------------------------------------

    // 2. CHUẨN HÓA DỮ LIỆU
    const formattedData = data?.map((p: any) => {
        // Normalize: Xử lý trường hợp Supabase trả về mảng 1 phần tử thay vì Object
        const normalize = (field: any) => Array.isArray(field) ? field[0] : field;

        const contracts = p.contracts || [];
        // Tính tổng tiền
        const totalContractValue = Array.isArray(contracts)
            ? contracts.reduce((sum: number, c: any) => {
                return c.status !== 'cancelled' ? sum + (c.value || 0) : sum;
            }, 0)
            : 0;

        // Log kiểm tra tính toán tiền
        // console.log(`   -> Project ${p.project_code}: Contracts Count = ${contracts.length}, Total = ${totalContractValue}`);

        return {
            ...p,
            total_contract_value: totalContractValue,

            // ✅ ÉP KIỂU DỮ LIỆU TỪ DIỂN THÀNH OBJECT
            status_data: normalize(p.status_data),
            priority_data: normalize(p.priority_data),
            construction_type_data: normalize(p.construction_type_data),

            // Map Customer/Manager (Giữ nguyên logic cũ)
            customer: p.customer ? { ...normalize(p.customer), avatar_url: normalize(p.customer)?.user_profiles?.avatar_url } : null,
            manager: p.manager ? { ...normalize(p.manager), avatar_url: normalize(p.manager)?.user_profiles?.avatar_url } : null,
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

// Hàm lấy danh sách dự án (id, name, code) để sử dụng trong dropdown hoặc liên kết
export async function getProjectsList() {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('projects')
        .select('id, name, code')
        .order('created_at', { ascending: false });

    if (error) return [];
    return data || [];
}

// --- 1. LẤY DỮ LIỆU TỪ ĐIỂN (Để đổ vào Dropdown) ---
export async function getTaskDictionaries() {
    const supabase = await createSupabaseServerClient();

    // ✅ SỬA 1: Đổi 'type' thành 'category' (theo chuẩn các hàm khác của bạn)
    // ✅ SỬA 2: Query cả chữ thường và chữ hoa đề phòng DB lưu không thống nhất
    const { data, error } = await supabase
        .from('sys_dictionaries')
        .select('id, name, code, category, color') // Đổi type -> category
        .in('category', ['task_status', 'task_priority', 'TASK_STATUS', 'TASK_PRIORITY']);

    if (error) {
        // ✅ SỬA 3: Log chi tiết lỗi
        console.error("Lỗi lấy dictionaries:", JSON.stringify(error, null, 2));
        return { statuses: [], priorities: [] };
    }

    // Map dữ liệu về chuẩn chữ thường để dễ filter
    const normalizedData = data?.map(d => ({
        ...d,
        category: d.category.toLowerCase() // Chuẩn hóa về chữ thường
    })) || [];

    const statuses = normalizedData.filter(d => d.category === 'task_status');
    const priorities = normalizedData.filter(d => d.category === 'task_priority');

    return { statuses, priorities };
}

// --- 2. LẤY DANH SÁCH TASK (JOIN BẢNG) ---
export async function getProjectTasks(projectId: string) {
    if (!isValidUUID(projectId)) {
        console.error("❌ Project ID không hợp lệ:", projectId);
        return [];
    }

    const supabase = await createSupabaseServerClient();
    console.log(`🔍 Đang lấy task cho Project ID: ${projectId}`);

    // --- BƯỚC 1: TEST QUERY ĐƠN GIẢN (KHÔNG JOIN) ---
    // Để kiểm tra xem có task nào tồn tại không (Loại trừ lỗi do Join)
    const { count, error: rawError } = await supabase
        .from('project_tasks')
        .select('*', { count: 'exact', head: true })
        .eq('project_id', projectId);

    if (rawError) {
        console.error("❌ Lỗi Query Cơ bản (Check RLS/Table):", rawError.message);
        return [];
    }
    console.log(`📊 Tìm thấy tổng cộng: ${count} task trong DB (Query thô)`);

    if (count === 0) {
        return []; // Không có dữ liệu thì trả về rỗng luôn
    }

    // --- BƯỚC 2: QUERY FULL (CÓ JOIN) ---
    const { data, error } = await supabase
        .from('project_tasks')
        .select(`
            *,
            assignee:employees!fk_assigned_to (
                id, 
                name, 
                user_profiles ( avatar_url ) 
            ),
            status:sys_dictionaries!project_tasks_status_id_fkey (id, name, code, color),
            priority:sys_dictionaries!project_tasks_priority_id_fkey (id, name, code, color)
        `)
        .eq('project_id', projectId)
        .order('start_date', { ascending: true });

    if (error) {
        console.error("❌ Lỗi Query Full (Lỗi do Join/Constraint):", JSON.stringify(error, null, 2));
        return [];
    }

    // --- BƯỚC 3: XỬ LÝ DỮ LIỆU (FLATTEN AVATAR) ---
    const formattedData = data?.map((task: any) => {
        // Safe check avatar
        let avatarUrl = null;
        if (task.assignee?.user_profiles) {
            avatarUrl = Array.isArray(task.assignee.user_profiles)
                ? task.assignee.user_profiles[0]?.avatar_url
                : task.assignee.user_profiles.avatar_url;
        }

        return {
            ...task,
            assignee: task.assignee ? {
                id: task.assignee.id,
                name: task.assignee.name,
                avatar_url: avatarUrl
            } : null
        };
    });

    console.log(`✅ Lấy thành công: ${formattedData?.length} task (Sau khi xử lý)`);
    return formattedData || [];
}

// --- 3. CREATE TASK (Gửi UUID) ---
export async function createTask(projectId: string, formData: FormData) {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập" };

    const supabase = await createSupabaseServerClient();

    const name = formData.get("name") as string;
    const parent_id = formData.get("parent_id") as string;
    const assigned_to = formData.get("assigned_to") as string;

    // Lấy UUID từ form
    const priority_id = formData.get("priority_id") as string;
    const status_id = formData.get("status_id") as string;

    const start_date = formData.get("start_date") as string;
    const due_date = formData.get("due_date") as string;
    const description = formData.get("description") as string;
    const weight = formData.get("weight");

    // Xử lý logic null
    const validParentId = parent_id && parent_id !== "root" ? parent_id : null;
    const validAssignee = assigned_to && assigned_to !== "unassigned" ? assigned_to : null;
    const validPriority = priority_id && priority_id !== "" ? priority_id : null;
    const validStatus = status_id && status_id !== "" ? status_id : null;

    try {
        const { error } = await supabase.from('project_tasks').insert({
            name,
            project_id: projectId,
            parent_id: validParentId,
            assigned_to: validAssignee,
            priority_id: validPriority,
            status_id: validStatus,
            start_date: start_date || null,
            due_date: due_date || null,
            description: description,
            weight: weight ? Number(weight) : 0,
            progress: 0,
            created_by: session.entityId 
        });

        if (error) throw new Error(error.message);

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã tạo công việc mới" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 4. UPDATE TASK ---
export async function updateTask(taskId: string, projectId: string, formData: FormData) {
    const supabase = await createSupabaseServerClient();

    const name = formData.get("name") as string;
    const assigned_to = formData.get("assigned_to") as string;
    const priority_id = formData.get("priority_id") as string;
    const status_id = formData.get("status_id") as string;
    const progress = formData.get("progress");
    const start_date = formData.get("start_date") as string;
    const due_date = formData.get("due_date") as string;
    const description = formData.get("description") as string;
    const weight = formData.get("weight");

    const validAssignee = assigned_to && assigned_to !== "unassigned" ? assigned_to : null;

    try {
        const { error } = await supabase.from('project_tasks').update({
            name,
            assigned_to: validAssignee,
            priority_id: priority_id || null,
            status_id: status_id || null,
            progress: progress ? Number(progress) : 0,
            weight: weight ? Number(weight) : 0,
            start_date: start_date || null,
            due_date: due_date || null,
            description,
            updated_at: new Date().toISOString()
        }).eq('id', taskId);

        if (error) throw new Error(error.message);

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Cập nhật thành công" };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// --- 5. DELETE TASK ---
export async function deleteTask(taskId: string, projectId: string) {
    const supabase = await createSupabaseServerClient();
    try {
        const { error } = await supabase.from('project_tasks').delete().eq('id', taskId);
        if (error) throw new Error(error.message);
        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã xóa công việc" };
    } catch (e: any) { return { success: false, error: e.message }; }
}