// lib/actions/projectActions.ts
"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isValidUUID } from "@/lib/utils/uuid";
import { getCurrentUser } from "./authActions"; // Import từ authActions

// --- Giao diện dữ liệu (Interfaces) ---
interface ProjectData {
    id: string;
    name: string;
    code: string;
    description: string | null;
    address: string | null;
    location: string | null;
    status: string | null;
    project_type: string | null;
    construction_type: string | null;
    risk_level: string | null;
    project_manager: string | null;
    customer_id: string | null;
    progress: number | null;
    budget: number | null;
    start_date: string | null;
    end_date: string | null;
    created_at: string;
    updated_at: string;
    customers?: { name: string } | null;
    manager?: { name: string } | null;
}

interface GetProjectResult {
    data: ProjectData | null;
    error: { message: string; code: string } | null;
    isSpecialRoute?: boolean;
    type?: string;
}

interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
    data?: ProjectData[];
}

// --- Project Actions ---

/**
 * Lấy một dự án cụ thể theo ID.
 */
export async function getProject(id: string): Promise<GetProjectResult> {
    if (!isValidUUID(id)) {
        return { data: null, error: { message: "ID dự án không đúng định dạng.", code: "invalid_uuid" } };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { data: project, error } = await supabase
        .from("projects")
        .select(`
            *,
            customers(name),
            manager:employees(name)
        `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("Lỗi Supabase trong getProject:", error.message);
        return { data: null, error: { message: `Lỗi Supabase: ${error.message}`, code: error.code || "supabase_fetch_error" } };
    }

    if (!project) {
        return { data: null, error: { message: "Không tìm thấy dự án với ID đã cung cấp.", code: "project_not_found" } };
    }

    return { data: project as ProjectData, error: null };
}

/**
 * Tạo một dự án mới.
 */
export async function createProject(formData: FormData): Promise<ActionResponse> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client là null trong createProject");
        return { success: false, error: "Không thể kết nối đến Supabase để tạo dự án" };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const projectData: Partial<ProjectData> = {
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        description: (formData.get("description") as string) || null,
        address: (formData.get("address") as string) || null,
        location: (formData.get("location") as string) || null,
        status: formData.get("status") as string,
        project_type: (formData.get("project_type") as string) || null,
        construction_type: (formData.get("construction_type") as string) || null,
        risk_level: (formData.get("risk_level") as string) || null,
        project_manager: (formData.get("project_manager") as string) || null,
        customer_id: (formData.get("customer_id") as string) || null,
        progress: Number.parseInt(formData.get("progress") as string) || 0,
        budget: Number.parseFloat(formData.get("budget") as string) || 0,
        start_date: (formData.get("start_date") as string) || null,
        end_date: (formData.get("end_date") as string) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
        .from("projects")
        .insert(projectData)
        .select();

    if (error) {
        console.error("Lỗi khi tạo dự án:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath("/projects");
    return { success: true, message: "Dự án đã được tạo thành công!", data: data as ProjectData[] };
}

/**
 * Cập nhật thông tin một dự án.
 */
export async function updateProject(id: string, formData: FormData): Promise<ActionResponse> {
    if (!isValidUUID(id)) {
        return { success: false, error: "ID dự án không đúng định dạng" };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client là null trong updateProject");
        return { success: false, error: "Không thể kết nối đến Supabase để cập nhật dự án" };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const projectData: Partial<ProjectData> = {
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        description: (formData.get("description") as string) || null,
        address: (formData.get("address") as string) || null,
        location: (formData.get("location") as string) || null,
        status: formData.get("status") as string,
        project_type: (formData.get("project_type") as string) || null,
        construction_type: (formData.get("construction_type") as string) || null,
        risk_level: (formData.get("risk_level") as string) || null,
        project_manager: (formData.get("project_manager") as string) || null,
        customer_id: (formData.get("customer_id") as string) || null,
        progress: Number.parseInt(formData.get("progress") as string) || 0,
        budget: Number.parseFloat(formData.get("budget") as string) || 0,
        start_date: (formData.get("start_date") as string) || null,
        end_date: (formData.get("end_date") as string) || null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("projects")
        .update(projectData)
        .eq("id", id);
    if (error) {
        console.error("Lỗi khi cập nhật dự án:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${id}`);
    revalidatePath("/projects");
    return { success: true, message: "Dự án đã được cập nhật thành công!" };
}

/**
 * Xóa một dự án.
 */
export async function deleteProject(id: string): Promise<ActionResponse> {
    if (!isValidUUID(id)) {
        return { success: false, error: "ID dự án không đúng định dạng" };
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client là null trong deleteProject");
        return { success: false, error: "Không thể kết nối đến Supabase để xóa dự án" };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", id);
    if (error) {
        console.error("Lỗi khi xóa dự án:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath("/projects");
    return { success: true, message: "Dự án đã được xóa thành công!" };
}