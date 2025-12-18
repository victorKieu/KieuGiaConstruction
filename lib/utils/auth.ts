// lib/utils/auth.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Danh sách các quyền (Permissions)
export const PERMISSIONS = {
    MANAGE_PROJECT: ["manager", "admin", "quản lý", "quản trị viên"], // Sửa, Xóa dự án
    MANAGE_MEMBERS: ["manager", "admin", "supervisor", "quản lý", "giám sát"], // Phân công nhân sự
    MANAGE_TASKS: ["manager", "admin", "supervisor", "quản lý", "giám sát"], // Tạo, sửa nhiệm vụ
};

/**
 * Lấy vai trò của người dùng hiện tại trong một dự án cụ thể.
 * Trả về tên Role (đã normalized về lowercase) hoặc null nếu không tham gia.
 */
export async function getCurrentUserRoleInProject(projectId: string): Promise<string | null> {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy User ID hiện tại
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    // 2. Query bảng project_members kết hợp project_roles để lấy tên vai trò
    const { data: member, error } = await supabase
        .from("project_members")
        .select(`
            role_id,
            project_role:project_roles ( name )
        `)
        .eq("project_id", projectId)
        .eq("employee_id", user.id) // Giả định employee_id trùng với auth.uid()
        .single();

    if (error || !member) return null;

    // Lấy tên role từ bảng project_roles
    // @ts-ignore
    const roleName = member.project_role?.name || "";
    return roleName.toLowerCase();
}

/**
 * Hàm kiểm tra quyền dùng cho Server Action.
 * Nếu không đủ quyền, sẽ throw error hoặc return false.
 */
export async function checkProjectPermission(projectId: string, allowedRoles: string[]) {
    const role = await getCurrentUserRoleInProject(projectId);
    
    if (!role) return false;

    // Kiểm tra xem role của user có nằm trong danh sách cho phép không
    // (So sánh tương đối để bao gồm cả tiếng Anh/Việt)
    return allowedRoles.some(allowed => role.includes(allowed));
}