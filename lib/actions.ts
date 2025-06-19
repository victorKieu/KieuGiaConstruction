"use server"; // Đảm bảo rằng đây là server component
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";


// Kiểm tra định dạng UUID
function isValidUUID(uuid: string) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Lấy thông tin người dùng hiện tại
export async function getCurrentUser() {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;

    // tạo supabase client với token
    const supabase = createSupabaseServerClient(token);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) return null;
    return user;
}

// Lấy danh sách nhân viên
export async function getEmployees() {

    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client is null in getEmployees");
        return [];
    }

    const { data, error } = await supabase.from("employees").select("*").order("created_at", { ascending: false });
    if (error) {
        console.error("Error fetching employees:", error);
        throw error;
    }

    return data;
}

// Lấy chi tiết dự án
export async function getProject(id: string) {
    if (!isValidUUID(id)) {
        throw new Error("Invalid UUID format");
    }

    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", id)
        .single();

    if (error) {
        console.error("Supabase error:", error);
        throw new Error(error.message);
    }
    if (!project) {
        throw new Error("Project not found");
    }
    return project;
}

// Tạo dự án mới
export async function createProject(formData: FormData) {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client is null in createProject");
        return { success: false, error: "Không thể kết nối đến Supabase để tạo dự án" };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const projectData: Record<string, any> = {
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        description: (formData.get("description") as string) || "",
        address: (formData.get("address") as string) || "",
        location: (formData.get("location") as string) || "",
        status: formData.get("status") as string,
        project_type: (formData.get("project_type") as string) || "",
        construction_type: (formData.get("construction_type") as string) || "",
        risk_level: (formData.get("risk_level") as string) || "",
        project_manager: (formData.get("project_manager") as string) || "",
        customer_id: (formData.get("customer_id") as string) || null,
        progress: Number.parseInt(formData.get("progress") as string) || 0,
        budget: Number.parseInt(formData.get("budget") as string) || 0,
        start_date: (formData.get("start_date") as string) || null,
        end_date: (formData.get("end_date") as string) || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from("projects").insert(projectData).select();
    if (error) {
        console.error("Error creating project:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/projects");
    return { success: true, data };
}

// Cập nhật dự án
export async function updateProject(id: string, formData: FormData) {
    if (!isValidUUID(id)) {
        throw new Error("Invalid UUID format");
    }

    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client is null in updateProject");
        return { success: false, error: "Không thể kết nối đến Supabase để cập nhật dự án" };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const projectData: Record<string, any> = {
        name: formData.get("name") as string,
        code: formData.get("code") as string,
        description: (formData.get("description") as string) || "",
        address: (formData.get("address") as string) || "",
        location: (formData.get("location") as string) || "",
        status: formData.get("status") as string,
        project_type: (formData.get("project_type") as string) || "",
        construction_type: (formData.get("construction_type") as string) || "",
        risk_level: (formData.get("risk_level") as string) || "",
        project_manager: (formData.get("project_manager") as string) || "",
        customer_id: (formData.get("customer_id") as string) || null,
        progress: Number.parseInt(formData.get("progress") as string) || 0,
        budget: Number.parseInt(formData.get("budget") as string) || 0,
        start_date: (formData.get("start_date") as string) || null,
        end_date: (formData.get("end_date") as string) || null,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("projects").update(projectData).eq("id", id);
    if (error) {
        console.error("Error updating project:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${id}`);
    return { success: true };
}

// Xóa dự án
export async function deleteProject(id: string) {
    if (!isValidUUID(id)) {
        throw new Error("Invalid UUID format");
    }

    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client is null in deleteProject");
        return { success: false, error: "Không thể kết nối đến Supabase để xóa dự án" };
    }

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) {
        console.error("Error deleting project:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/projects");
    return { success: true };
}

// Lấy danh sách khách hàng cho dropdown
export async function getCustomers() {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client is null in getCustomers");
        return [];
    }

    const { data, error } = await supabase
        .from("customers")
        .select("id, name, code")
        .order("created_at", { ascending: true }); // Sắp xếp theo ngày tạo

    if (error) {
        console.error("Error fetching customers:", error);
        throw error;
    }

    return data || [];
}

// Lấy danh sách khách hàng cho danh sách
export async function getCustomerList(filters: { search: string; status: string; tag: string } = { search: "", status: "all", tag: "all" }) {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client is null in getCustomerList");
        return [];
    }

    let query = supabase.from("customers").select("*").order("created_at", { ascending: false });

    if (filters.search) {
        query = query.ilike("name", `%${filters.search}%`);
    }

    if (filters.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
    }

    if (filters.tag && filters.tag !== "all") {
        query = query.eq("tag_id", filters.tag);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Error fetching customer list:", error);
        throw error;
    }

    return data || [];
}



// Lấy danh sách khách hàng gần đây (5 khách)
export async function getRecentCustomers() {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client is null in getRecentCustomers");
        return [];
    }

    const { data, error } = await supabase
        .from("customers")
        .select("id, name, email, created_at")
        .order("created_at", { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching recent customers:", error);
        throw error;
    }

    return data || [];
}

/// Lấy danh sách quản lý dự án (nhân viên trưởng phòng trở lên)
export async function getProjectManagers() {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    if (!supabase) {
        console.error("Supabase client is null in getProjectManagers");
        return [];
    }

    const MANAGER_RANKS = [
        "Trưởng phòng",
        "Phó phòng",
        "Ban giám đốc",
        "Giám đốc",
        "Phó giám đốc",
        "Quản lý"
    ];

    const { data, error } = await supabase
        .from("employees")
        .select("id, name, code, position, rank")
        .in("rank", MANAGER_RANKS);

    if (error) {
        console.error("Error fetching project managers:", error);
        throw error;
    }

    return data || [];
}

//Lấy nhật ký công trình
export async function getLogs(projectId: string) {
    const cookieStore = await cookies(); // Không cần await ở đây
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { data, error } = await supabase
        .from("project_logs")
        .select(
            `
            id,
            log_date,
            section,
            content,
            images,
            weather,
            temperature,
            participants,
            directive,
            projectname: project_id (
                name
            ),
            creator:user_id (
                avatar_url,
                name
            )
        `
        )
        .eq("project_id", projectId)
        .order("log_date", { ascending: false });

    if (error) {
        console.error("Error fetching logs:", JSON.stringify(error, null, 2));
        return [];
    }

    const normalized = (data as any[]).map((log) => ({
        ...log,
        images: Array.isArray(log.images)
            ? log.images
            : typeof log.images === "string" && log.images
                ? JSON.parse(log.images)
                : [],
    }));

    return normalized;
}