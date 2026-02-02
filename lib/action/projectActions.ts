"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/session";
import { isValidUUID } from "@/lib/utils/uuid";
import { ProjectData, MemberData, FinanceData, MilestoneData } from "@/types/project";
import { getDictionaryItems } from "@/lib/action/dictionaryActions";
import { revalidatePath } from "next/cache";
import { checkPermission } from "@/lib/auth/permissions";

// --- TYPES ---
export interface ActionError { message: string; code: string; }
export interface ActionFetchResult<T> { data: T | null; error: any; }
export interface ActionResponse { success: boolean; message?: string; error?: string; data?: any; }

// --- 1. DICTIONARIES ---
export async function getProjectTypes() {
    const items = await getDictionaryItems("PROJECT_TYPE");
    return items || [];
}
export async function getConstructionTypes() {
    const items = await getDictionaryItems("CONSTRUCTION_TYPE");
    return items || [];
}
export async function getProjectRoles() {
    const items = await getDictionaryItems("PROJECT_ROLE");
    return items || [];
}

// --- 2. PROJECT READ ACTIONS (QUAN TRỌNG NHẤT) ---
export async function getProjects(): Promise<ActionFetchResult<ProjectData[]>> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated || !session.entityId) return { data: [], error: "Auth required" };

    const supabase = await createSupabaseServerClient();

    // 1. Phân quyền (Security)
    let allowedProjectIds: string[] | null = null;
    if (session.role !== 'admin' && session.entityId) {
        const { data: memberProjects } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("employee_id", session.entityId);

        if (memberProjects && memberProjects.length > 0) {
            allowedProjectIds = memberProjects.map((m: any) => m.project_id);
        } else {
            // Nếu không phải admin và không tham gia dự án nào
            return { data: [], error: null };
        }
    }

    // 2. QUERY TỪ VIEW (Nhanh và Chính xác)
    let query = supabase.from("projects_dashboard_view").select("*");

    if (allowedProjectIds !== null) {
        query = query.in('id', allowedProjectIds);
    }

    if (session.type === 'customer') {
        query = query.eq('customer_id', session.entityId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
        console.error("❌ getProjects View Error:", error.message);
        // Fallback: Trả về mảng rỗng thay vì crash nếu view lỗi
        return { data: [], error };
    }

    // 3. Map dữ liệu (Chuẩn hóa để Frontend dùng ngay)
    const formattedData = data.map((p: any) => ({
        ...p,
        // Map các cột từ View sang đúng tên Frontend cần
        progress: p.calculated_progress,
        project_code: p.code,
        // Các trường JSONB (status_data, manager,...) Supabase tự parse thành Object
    }));

    return { data: formattedData as ProjectData[], error: null };
}

export async function getProject(id: string): Promise<ActionFetchResult<ProjectData>> {
    if (!isValidUUID(id)) return { data: null, error: { message: "ID không hợp lệ", code: "400" } };

    const session = await getCurrentSession();
    const supabase = await createSupabaseServerClient();

    // Query từ VIEW thay vì table
    const { data, error } = await supabase
        .from("project_details_view")
        .select("*")
        .eq("id", id)
        .single();

    if (error || !data) {
        return { data: null, error: error ? { message: error.message, code: error.code } : { message: "Not found", code: "404" } };
    }

    // Map dữ liệu để đảm bảo tương thích
    const projectData = {
        ...data,
        progress: data.calculated_progress, // Sử dụng tiến độ tính toán
        // Các trường JSONB (manager, customer, status_data...) Supabase tự parse
    };

    return { data: projectData as ProjectData, error: null };
}

export async function createProject(formData: FormData): Promise<ActionResponse> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập" };
    const supabase = await createSupabaseServerClient();

    let statusId = formData.get("status_id");
    if (!statusId) {
        const defaultStatus = (await getDictionaryItems("PROJECT_STATUS")) as any[];
        statusId = defaultStatus?.find((s: any) => s.code === 'INITIAL')?.id || null;
    }

    const payload: any = {
        name: formData.get("name"),
        code: formData.get("code"),
        description: formData.get("description"),
        address: formData.get("address"),
        geocode: formData.get("geocode"),
        project_manager: formData.get("project_manager") || null,
        customer_id: formData.get("customer_id") || null,
        status_id: statusId,
        type_id: formData.get("type_id") || null,
        construction_type_id: formData.get("construction_type_id") || null,
        start_date: formData.get("start_date") || null,
        end_date: formData.get("end_date") || null,
        budget: Number(formData.get("budget")) || 0,
        created_by: session.entityId,
    };

    const { data, error } = await supabase.from("projects").insert(payload).select().single();
    if (error) return { success: false, error: error.message };

    if (session.type === 'employee') {
        const roles = (await getDictionaryItems("PROJECT_ROLE")) as any[];
        const managerRole = roles?.find((r: any) => r.code === 'MANAGER');
        if (managerRole) {
            await supabase.from("project_members").insert({
                project_id: data.id,
                employee_id: session.entityId,
                role_id: managerRole.id,
                joined_at: new Date().toISOString()
            });
        }
    }

    // 🔥 QUAN TRỌNG: Tự tạo dòng tài chính ban đầu để tránh lỗi null khi query
    const { error: financeError } = await supabase.from("project_finance").insert({
        project_id: data.id,
        budget: payload.budget,
        spent: 0
    });
    if (financeError) console.error("Lỗi tạo project_finance:", financeError.message);

    revalidatePath("/projects");
    return { success: true, message: "Tạo dự án thành công", data };
}

export async function updateProject(formData: FormData): Promise<ActionResponse> {
    const projectId = formData.get("id") as string;
    const supabase = await createSupabaseServerClient();

    const payload: any = { updated_at: new Date() };
    const fields = ["name", "code", "description", "address", "geocode", "start_date", "end_date", "customer_id", "project_manager", "type_id", "construction_type_id", "status_id"];
    fields.forEach(f => {
        const val = formData.get(f);
        if (val !== null) payload[f] = val === "" ? null : val;
    });
    if (formData.has("budget")) payload.budget = Number(formData.get("budget"));

    const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
    if (error) return { success: false, error: error.message };

    revalidatePath("/projects");
    return { success: true, message: "Cập nhật thành công" };
}

export async function deleteProject(projectId: string): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("projects").delete().eq("id", projectId);
    if (error) return { success: false, error: error.message };
    revalidatePath("/projects");
    return { success: true, message: "Đã xóa dự án" };
}

// ----------------------------------------------------------------------
// --- 4. PROJECT MEMBERS & FINANCE & MILESTONES ---
// ----------------------------------------------------------------------

export async function getProjectMembers(projectId: string): Promise<ActionFetchResult<MemberData[]>> {
    if (!isValidUUID(projectId)) return { data: [], error: { message: "Invalid ID", code: "400" } };
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase.from("project_members").select(`
        *, role:sys_dictionaries!role_id(name, code),
        employee:employees(id, name, email, user_profiles(avatar_url), position:sys_dictionaries!position_id(name))
    `).eq("project_id", projectId);

    if (error) return { data: [], error: { message: error.message, code: error.code } };

    const formatted = data.map((m: any) => ({
        ...m,
        role_name: Array.isArray(m.role) ? m.role[0]?.name : m.role?.name,
        role_code: Array.isArray(m.role) ? m.role[0]?.code : m.role?.code,
        employee: m.employee ? {
            ...m.employee,
            avatar_url: Array.isArray(m.employee.user_profiles) ? m.employee.user_profiles[0]?.avatar_url : m.employee.user_profiles?.avatar_url,
            position: Array.isArray(m.employee.position) ? m.employee.position[0]?.name : m.employee.position?.name
        } : null
    }));

    return { data: formatted, error: null };
}

export async function getCurrentUserRoleInProject(projectId: string) {
    if (!isValidUUID(projectId)) return null;
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return null;

    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.from("project_members").select(`role:sys_dictionaries!role_id(code)`)
        .eq("project_id", projectId).eq("employee_id", session.entityId).maybeSingle();

    // ✅ FIX TS: Kiểm tra và ép kiểu an toàn
    const roleData = data as any;
    const roleCode = Array.isArray(roleData?.role) ? roleData.role[0]?.code : roleData?.role?.code;
    return roleCode;
}

export async function addProjectMember(projectId: string, employeeId: string, roleId: string) {
    const supabase = await createSupabaseServerClient();
    const { data: existing } = await supabase.from("project_members").select("employee_id").eq("project_id", projectId).eq("employee_id", employeeId).single();
    if (existing) return { success: false, error: "Đã tồn tại" };

    const { error } = await supabase.from("project_members").insert({ project_id: projectId, employee_id: employeeId, role_id: roleId });
    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã thêm thành viên" };
}

export async function removeProjectMember(projectId: string, employeeId: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("project_members").delete().eq("project_id", projectId).eq("employee_id", employeeId);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa thành viên" };
}

export async function getProjectFinance(projectId: string): Promise<ActionFetchResult<FinanceData>> {
    if (!isValidUUID(projectId)) return { data: null, error: { message: "Invalid ID", code: "400" } };
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("project_finance")
        .select(`id, budget, spent, remaining, updated_at, allocation:finance_allocation ( * )`)
        .eq("project_id", projectId)
        .maybeSingle();

    if (error) return { data: null, error: { message: error.message, code: error.code } };
    if (!data) return { data: null, error: null };

    const rawAlloc = Array.isArray(data.allocation) ? data.allocation[0] : data.allocation;
    const allocation = {
        materials: rawAlloc?.materials || 0,
        labor: rawAlloc?.labor || 0,
        equipment: rawAlloc?.equipment || 0,
        others: rawAlloc?.others || 0,
    };

    return {
        data: { ...data, allocation } as FinanceData,
        error: null
    };
}

export async function getProjectMilestones(projectId: string): Promise<ActionFetchResult<MilestoneData[]>> {
    if (!isValidUUID(projectId)) return { data: null, error: { message: "Invalid ID", code: "400" } };
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.from("project_milestones").select("*").eq("project_id", projectId).order("planned_start_date", { ascending: true });
    return { data: data as MilestoneData[], error: error ? { message: error.message, code: error.code } : null };
}