"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isValidUUID } from "@/lib/utils/uuid";
import { getCurrentUser } from "./authActions"; // Import từ authActions
import { ProjectData, MemberData, DocumentData, FinanceData, MilestoneData, TaskData, CommentData } from "@/types/project";
interface ActionError {
    message: string;
    code: string;
}

// Kiểu trả về chung cho các hàm query/fetch
interface ActionFetchResult<T> {
    data: T | null;
    error: ActionError | null;
}

// Kiểu trả về cho các hàm CRUD (Create, Update, Delete)
interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
    data?: ProjectData[]; // Chỉ dùng cho createProject
}

// Định nghĩa kiểu cho tham số state đầu tiên của useFormState/useActionState
interface ActionFormState {
    success: boolean;
    message?: string;
    error?: string;
}

// Định nghĩa các kiểu trả về cụ thể cho từng hàm
type GetProjectResult = ActionFetchResult<ProjectData>;
type GetMembersResult = ActionFetchResult<MemberData[]>;
type GetDocumentsResult = ActionFetchResult<DocumentData[]>;
type GetFinanceResult = ActionFetchResult<FinanceData>;
type GetMilestonesResult = ActionFetchResult<MilestoneData[]>;
type GetTasksResult = ActionFetchResult<TaskData[]>;
type GetCommentsResult = ActionFetchResult<CommentData[]>;

// --- Helper function để xử lý token ---
async function getSupabaseClient() {
    // Luôn cần truyền cookiestore vào createSupabaseServerClient nếu muốn tạo client server
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;

    if (!token) {
        return {
            client: null,
            error: {
                message: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
                code: "jwt_expired"
            }
        };
    }

    // Tạo Supabase client server với token đã lấy
    return {
        client: createSupabaseServerClient(token),
        error: null
    };
}


// ----------------------------------------------------------------------
// --- Project Actions ---
// ----------------------------------------------------------------------

/**
 * Lấy danh sách thành viên của một dự án.
 */
export async function getProjectMembers(projectId: string): Promise<GetMembersResult> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { data: null, error: authError };

    if (!supabase) {
        return { data: null, error: { message: "Lỗi kết nối máy chủ.", code: "server_error" } };
    }

    const { data, error } = await supabase
        .from("project_members")
        .select(`
            project_id,           
            role,
            joined_at,
            employee:employees ( 
                id,
                name,
                email,
                phone,
                position,
                avatar_url
            )
        `)
        .eq("project_id", projectId);

    if (error) {
        console.error("Lỗi Supabase trong getProjectMembers:", error.message);
        return {
            data: null,
            error: { message: `Lỗi truy vấn thành viên dự án: ${error.message}`, code: error.code || "supabase_error" }
        };
    }

    // START FIX: Ánh xạ dữ liệu an toàn để trích xuất đối tượng `employee` duy nhất
    const membersData: MemberData[] = (data || []).map((item: any) => {
        let employeeDetails: any = null;

        // 1. Nếu item.employee là MẢNG (Supabase join): Lấy phần tử đầu tiên
        if (Array.isArray(item.employee) && item.employee.length > 0) {
            employeeDetails = item.employee[0];
        }
        // 2. Nếu item.employee là ĐỐI TƯỢỢNG (hoặc null): Giữ nguyên
        else if (item.employee && typeof item.employee === 'object') {
            employeeDetails = item.employee;
        }

        // 3. Chỉ trả về nếu employeeDetails hợp lệ (vì MemberData yêu cầu employee BẮT BUỘC)
        if (employeeDetails && employeeDetails.name && employeeDetails.email) {
            return {
                project_id: item.project_id,
                role: item.role,
                joined_at: item.joined_at,
                employee: employeeDetails,
            } as MemberData;
        }

        // Nếu không có thông tin nhân viên hợp lệ, trả về null để lọc
        return null;
    }).filter((item): item is MemberData => item !== null); // Loại bỏ các mục null

    return { data: membersData, error: null };
}

/**
 * Lấy một dự án cụ thể theo ID.
 */
export async function getProject(id: string): Promise<GetProjectResult> {
    if (!isValidUUID(id)) {
        return {
            data: null,
            error: { message: "ID dự án không đúng định dạng.", code: "invalid_uuid" },
        };
    }

    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { data: null, error: authError };

    if (!supabase) {
        return { data: null, error: { message: "Lỗi kết nối máy chủ.", code: "server_error" } };
    }

    // ✅ CẬP NHẬT TRUY VẤN: Sử dụng count trong join
    // NOTE: Supabase sẽ trả về các trường count dưới dạng mảng lồng nhau: 
    // { project_members: [{ count: X }], project_documents: [{ count: Y }], ...}
    const { data: project, error } = await supabase
        .from("projects")
        .select(`
            *,
            customers(name),
            manager_data:employees!projects_project_manager_fkey(name),
            created_by_data:employees!projects_created_by_fkey(name),
            member_counts:project_members(count),
            document_counts:project_documents(count)
        `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("Lỗi Supabase trong getProject:", error.message);
        return {
            data: null,
            error: { message: `Lỗi Supabase: ${error.message}`, code: error.code || "supabase_fetch_error" },
        };
    }

    if (!project) {
        return {
            data: null,
            error: { message: "Không tìm thấy dự án với ID đã cung cấp.", code: "project_not_found" },
        };
    }

    // ✅ FIX LOGIC TRÍCH XUẤT VÀ ÁNH XẠ:
    // Đặt tên alias cho các field count và join để truy cập an toàn hơn
    // và trích xuất giá trị count từ cấu trúc [{ count: X }]
    const rawProject = project as any;

    const memberCount = rawProject.member_counts?.[0]?.count || 0;
    const documentCount = rawProject.document_counts?.[0]?.count || 0;

    // Tuy nhiên, để đảm bảo an toàn tuyệt đối, ta dùng một cách tạo object không chứa các trường thừa:
    const finalProject: ProjectData = {
        ...project,
        customers: rawProject.customers,
        manager: rawProject.manager_data,
        created: rawProject.created_by_data,
        member_count: memberCount,
        document_count: documentCount,
        // Loại bỏ các trường join/count raw để tránh lỗi kiểu
        manager_data: undefined,
        created_by_data: undefined,
        member_counts: undefined,
        document_counts: undefined,
    } as ProjectData;

    return { data: finalProject, error: null };
}

/**
 * Tạo một dự án mới.
 */
export async function createProject(formData: FormData): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { success: false, error: authError.message };

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
        project_type: (formData.get("project_type") as string),
        construction_type: (formData.get("construction_type") as string),
        risk_level: (formData.get("risk_level") as string) || null,
        project_manager: (formData.get("project_manager") as string) || null,
        customer_id: (formData.get("customer_id") as string) || null,
        progress: Number.parseInt(formData.get("progress") as string) || 0,
        budget: Number.parseFloat(formData.get("budget") as string) || 0,
        start_date: (formData.get("start_date") as string),
        end_date: (formData.get("end_date") as string),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // created_by: currentUser.id, // Giả định created_by nên là id của người dùng hiện tại
    };

    const { data, error } = await supabase!
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

    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { success: false, error: authError.message };

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
        project_type: (formData.get("project_type") as string),
        construction_type: (formData.get("construction_type") as string),
        risk_level: (formData.get("risk_level") as string) || null,
        project_manager: (formData.get("project_manager") as string) || null,
        customer_id: (formData.get("customer_id") as string) || null,
        progress: Number.parseInt(formData.get("progress") as string) || 0,
        budget: Number.parseFloat(formData.get("budget") as string) || 0,
        start_date: (formData.get("start_date") as string),
        end_date: (formData.get("end_date") as string),
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase!
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

    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    const { error } = await supabase!
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

/**
 * Lấy danh sách tài liệu của một dự án.
 */
export async function getProjectDocuments(projectId: string): Promise<GetDocumentsResult> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase!
        .from("project_documents")
        .select(`
            id,
            name,
            type,
            url,
            uploaded_at,
            uploaded_by:project_documents_uploaded_by_fkey ( name ) 
        `)
        .eq("project_id", projectId);

    if (error) {
        console.error("Lỗi Supabase trong getProjectDocuments:", error.message);
        return {
            data: null,
            error: { message: `Lỗi truy vấn tài liệu: ${error.message}`, code: error.code || "supabase_error" }
        };
    }

    // START FIX TS2352/DATA MAPPING: Ánh xạ dữ liệu để trích xuất đối tượng `uploaded_by` duy nhất
    const documentsData: DocumentData[] = (data || []).map((item: any) => {
        // Trích xuất phần tử đầu tiên của mảng `uploaded_by` (do Supabase trả về mảng khi join)
        const uploaderDetails = Array.isArray(item.uploaded_by) && item.uploaded_by.length > 0
            ? item.uploaded_by[0]
            : { name: "N/A" }; // Cung cấp giá trị mặc định để đảm bảo kiểu DocumentData hợp lệ

        return {
            id: item.id,
            name: item.name,
            type: item.type,
            url: item.url,
            uploaded_at: item.uploaded_at,
            uploaded_by: uploaderDetails, // Đã là đối tượng đơn
        } as DocumentData;
    });

    return { data: documentsData, error: null };
}

/**
 * Lấy thông tin tài chính của một dự án.
 */
export async function getProjectFinance(projectId: string): Promise<ActionFetchResult<FinanceData>> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase!
        .from("project_finance")
        .select(`budget,spent,remaining,allocation_id,updated_at`)
        .eq("project_id", projectId)
        .maybeSingle();

    if (error) {
        console.error("Lỗi Supabase trong getProjectFinance:", error.message);
        return {
            data: null,
            error: { message: `Lỗi truy vấn tài chính: ${error.message}`, code: error.code || "supabase_error" }
        };
    }

    return { data: data as FinanceData | null, error: null };
}

/**
 * Lấy danh sách các mốc thời gian (milestones) của dự án.
 */
export async function getProjectMilestones(projectId: string): Promise<GetMilestonesResult> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase!
        .from("project_milestones")
        .select(`id,milestone, actual_end_date, status`)
        .eq("project_id", projectId)
        .order("planned_start_date", { ascending: true });

    if (error) {
        console.error("Lỗi Supabase trong getProjectMilestones:", error.message);
        return {
            data: null,
            error: { message: `Lỗi truy vấn mốc thời gian: ${error.message}`, code: error.code || "supabase_error" }
        };
    }

    return { data: data as MilestoneData[], error: null };
}

/**
 * Lấy danh sách các công việc (tasks) của dự án.
 */
export async function getProjectTasks(projectId: string): Promise<GetTasksResult> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { data: null, error: authError };

    const { data, error } = await supabase!
        .from("project_tasks")
        .select(`
            id,
            project_id,
            name,
            description,
            status,
            priority,
            progress, 
            start_date,
            due_date,
            completed_at,
            created_at,
            updated_at,
            assigned_to:employees ( 
                id,
                name,
                avatar_url
            )
        `)
        .eq("project_id", projectId)
        .order("due_date", { ascending: true });

    if (error) {
        console.error("Lỗi Supabase trong getProjectTasks:", error.message);
        return {
            data: null,
            error: { message: `Lỗi truy vấn công việc: ${error.message}`, code: error.code || "supabase_error" }
        };
    }

    // START FIX TS2352/DATA MAPPING: Ánh xạ dữ liệu để trích xuất đối tượng `assigned_to` duy nhất
    const tasksData: TaskData[] = (data || []).map((item: any) => {
        // Trích xuất phần tử đầu tiên của mảng `assigned_to`
        const assigneeDetails = Array.isArray(item.assigned_to) && item.assigned_to.length > 0
            ? item.assigned_to[0]
            : undefined; // `assigned_to` là optional (?) trong TaskData

        return {
            id: item.id,
            project_id: item.project_id,
            name: item.name,
            description: item.description,
            status: item.status,
            priority: item.priority,
            progress: item.progress,
            start_date: item.start_date,
            due_date: item.due_date,
            created_at: item.created_at,
            updated_at: item.updated_at, // Cần thêm trường này vào TaskData nếu muốn sử dụng
            completed_at: item.completed_at, // Cần thêm trường này vào TaskData nếu muốn sử dụng
            assigned_to: assigneeDetails, // Đã là đối tượng đơn (hoặc undefined)
        } as TaskData;
    });

    return { data: tasksData, error: null };
}

// --- Task Actions ---
// ----------------------------------------------------------------------

/**
 * Tạo một công việc (task) mới cho dự án.
 */
export async function createTask(projectId: string, formData: FormData): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    // ✅ FIX ReferenceError: Đảm bảo biến được định nghĩa ở đây
    const assignedToValue = (formData.get("assigned_to") as string) || null;
    const progressValue = Number.parseInt(formData.get("progress") as string) || 0;

    // Chuẩn bị dữ liệu để insert vào Supabase (dùng object literals để tránh lỗi TS2322)
    const insertData = {
        project_id: projectId,
        name: formData.get("name") as string,
        description: (formData.get("description") as string) || null,
        status: (formData.get("status") as string) || "pending",

        // Gán ID (string) hoặc NULL (khớp với cột Foreign Key trong DB)
        assigned_to: assignedToValue === "unassigned" ? null : assignedToValue,

        priority: (formData.get("priority") as string) || "low",
        progress: progressValue,
        start_date: (formData.get("start_date") as string) || null,
        due_date: (formData.get("due_date") as string) || null,
        created_at: new Date().toISOString(),
    };


    const { error } = await supabase!
        .from("project_tasks")
        .insert(insertData);

    if (error) {
        console.error("Lỗi khi tạo công việc:", error.message);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Công việc đã được tạo thành công!" };
}

/**
* Cập nhật thông tin chi tiết của một công việc.
*/
export async function updateTask(taskId: string, formData: FormData): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này" };
    }

    if (!isValidUUID(taskId)) {
        return { success: false, error: "ID công việc không hợp lệ." };
    }

    // Lấy dữ liệu từ FormData
    const updatedTaskData: { [key: string]: any } = {};

    // Danh sách các trường có thể cập nhật
    const fields = ["name", "description", "status", "assigned_to", "priority", "start_date", "due_date", "progress"];

    fields.forEach(field => {
        const value = formData.get(field);
        if (value !== null && value !== undefined) {
            // ✅ FIX TS2322: Xử lý trường assigned_to để gửi ID hoặc NULL
            if (field === "assigned_to") {
                // Nếu là 'unassigned' hoặc chuỗi rỗng (không được gán), gán NULL cho DB
                updatedTaskData[field] = (value === "unassigned" || value === "") ? null : value;
            } else if (field === "progress") {
                updatedTaskData[field] = Number.parseInt(value as string) || 0;
            }
            else if (value === "") {
                updatedTaskData[field] = null;
            } else {
                updatedTaskData[field] = value;
            }
        }
    });

    // Cập nhật updated_at
    updatedTaskData.updated_at = new Date().toISOString();

    const { error } = await supabase!
        .from("project_tasks")
        .update(updatedTaskData)
        .eq("id", taskId);

    if (error) {
        console.error("Lỗi khi cập nhật công việc:", error.message);
        return { success: false, error: error.message };
    }

    // Lấy project_id để revalidate
    const { data: taskData, error: fetchError } = await supabase!
        .from("project_tasks")
        .select("project_id")
        .eq("id", taskId)
        .single();

    if (taskData?.project_id) {
        revalidatePath(`/projects/${taskData.project_id}`);
    }

    return { success: true, message: "Công việc đã được cập nhật thành công!" };
}

/**
 * Xóa một công việc khỏi dự án.
 */
export async function deleteTask(taskId: string): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { success: false, error: authError.message };

    if (!isValidUUID(taskId)) {
        return { success: false, error: "ID công việc không hợp lệ." };
    }

    // Lấy project_id trước khi xóa để revalidate
    const { data: taskData, error: fetchError } = await supabase!
        .from("project_tasks")
        .select("project_id")
        .eq("id", taskId)
        .single();

    if (fetchError || !taskData?.project_id) {
        console.error("Không tìm thấy project ID để xóa công việc:", fetchError?.message);
        // Vẫn tiếp tục xóa, nhưng không thể revalidate chính xác
    }

    const { error } = await supabase!
        .from("project_tasks")
        .delete()
        .eq("id", taskId);

    if (error) {
        console.error("Lỗi khi xóa công việc:", error.message);
        return { success: false, error: error.message };
    }

    if (taskData?.project_id) {
        revalidatePath(`/projects/${taskData.project_id}`);
    }

    return { success: true, message: "Công việc đã được xóa thành công!" };
}
/**
 * Lấy danh sách bình luận cho một Task cụ thể.
 * @param taskId ID của công việc.
 * @returns ActionFetchResult<CommentData[]>
 */
export async function getTaskComments(taskId: string): Promise<GetCommentsResult> {
    try {
        // ✅ CẬP NHẬT: Kiểm tra cả giá trị null/undefined và kiểu dữ liệu trước khi kiểm tra UUID
        if (!taskId || typeof taskId !== 'string' || !isValidUUID(taskId)) {
            // Thay đổi thông báo để bao gồm cả trường hợp thiếu ID
            return { data: null, error: { message: "ID công việc không hợp lệ hoặc bị thiếu.", code: "400" } };
        }

        const { client: supabase, error: authError } = await getSupabaseClient();
        if (authError || !supabase) {
            return { data: null, error: { message: authError?.message || "Lỗi xác thực", code: "500" } };
        }

        // Thực hiện query: Lấy bình luận, sắp xếp theo thời gian tạo, và join thông tin người dùng
        const { data, error } = await supabase
            .from("project_comments")
            .select(
                `
                *,
                author:user_profiles(id, name, avatar_url)
                `
            )
            .eq("task_id", taskId)
            .order("created_at", { ascending: true });

        if (error) {
            console.error("Lỗi Supabase khi tải bình luận:", error);
            // Trả về lỗi chi tiết từ Supabase
            return {
                data: null,
                error: {
                    message: `Lỗi Supabase khi tải bình luận: ${error.message}`,
                    code: error.code,
                },
            };
        }

        // Ép kiểu dữ liệu sang CommentData[]
        // Supabase join (user_profiles) sẽ trả về mảng lồng nhau, cần ánh xạ lại nếu cần,
        // nhưng với `author:user_profiles(id, name, avatar_url)`, Supabase tự động
        // chuyển đổi thành đối tượng nếu quan hệ 1-1, nhưng an toàn nhất là ánh xạ.
        const commentsData: CommentData[] = (data || []).map((item: any) => {
            // Trích xuất phần tử đầu tiên của mảng `author` (do Supabase trả về mảng khi join)
            const authorDetails = Array.isArray(item.author) && item.author.length > 0
                ? item.author[0]
                : { id: "unknown", name: "Unknown User", avatar_url: null };

            return {
                ...item,
                author: authorDetails
            } as CommentData;
        });

        return { data: commentsData, error: null };
    } catch (e) {
        // Xử lý lỗi runtime không mong muốn
        const errorMessage = e instanceof Error ? e.message : "Đã xảy ra lỗi không xác định khi tải bình luận.";
        console.error("Lỗi Runtime không mong muốn trong getTaskComments:", e);
        return {
            data: null,
            error: {
                message: `Lỗi nội bộ Server: ${errorMessage}`,
                code: "500"
            }
        };
    }
}

/**
 * Tạo một bình luận mới cho công việc.
 */
export async function createComment(
    projectId: string,
    taskId: string,
    // ✅ THAY ĐỔI: Thêm tham số state (tên là prevState để không sử dụng)
    prevState: ActionFormState,
    formData: FormData
): Promise<ActionFormState> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để tạo bình luận." };
    }

    const content = formData.get("content") as string;
    const parentCommentId = formData.get("parent_comment_id") as string | undefined;

    if (!content || content.trim().length === 0) {
        return { success: false, error: "Nội dung bình luận không được để trống." };
    }

    if (!isValidUUID(projectId) || !isValidUUID(taskId)) {
        return { success: false, error: "ID Dự án hoặc ID Công việc không hợp lệ." };
    }

    const newComment = {
        project_id: projectId,
        task_id: taskId,
        content: content.trim(),
        created_by: currentUser.id,
        parent_comment_id: parentCommentId || null,
        // Giả định created_by_name và created_by_avatar được xử lý trong RLS/Trigger, 
        // hoặc bạn phải thêm chúng vào đây nếu schema yêu cầu. 
        // Ta sẽ dùng created_by_id và dựa vào JOIN trong RLS.
    };

    const { data, error } = await supabase!
        .from("project_comments")
        .insert(newComment)
        .select()
        .single();

    if (error) {
        console.error("Lỗi khi tạo bình luận:", error.message);
        return { success: false, error: error.message };
    }

    // Revalidate Task Detail page
    revalidatePath(`/projects/${projectId}/tasks/${taskId}`);

    return { success: true, message: "Bình luận đã được tạo thành công." };
}

/**
 * Cập nhật nội dung bình luận. (Chữ ký được điều chỉnh cho useFormState)
 */
export async function updateComment(
    prevState: ActionFormState,
    formData: FormData
): Promise<ActionFormState> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để sửa bình luận." };
    }

    const content = formData.get("content") as string;
    const commentId = formData.get("comment_id") as string;
    const projectId = formData.get("project_id") as string;


    if (!content || content.trim().length === 0) {
        return { success: false, error: "Nội dung bình luận không được để trống." };
    }

    if (!isValidUUID(commentId) || !isValidUUID(projectId)) {
        return { success: false, error: "ID Bình luận hoặc ID Dự án không hợp lệ." };
    }

    // First, update the comment
    const { error: updateError } = await supabase!
        .from("project_comments")
        .update({ content: content.trim(), updated_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("created_by", currentUser.id); // Ensure only the owner can edit

    if (updateError) {
        console.error("Lỗi khi cập nhật bình luận:", updateError.message);
        return { success: false, error: updateError.message };
    }

    // After successful update, get the task_id for revalidation
    const { data: commentData, error: fetchError } = await supabase
        .from("project_comments")
        .select("task_id")
        .eq("id", commentId)
        .single();

    if (fetchError || !commentData?.task_id) {
        console.error("Lỗi khi lấy task_id để revalidate:", fetchError?.message);
        // Return success but with a warning that revalidation might have failed
        return { success: true, message: "Bình luận đã được cập nhật, nhưng có lỗi khi làm mới trang." };
    }

    // Revalidate the specific task detail page
    revalidatePath(`/projects/${projectId}/tasks/${commentData.task_id}`);
    return { success: true, message: "Bình luận đã được cập nhật thành công." };
}


/**
 * Xóa bình luận. (Chữ ký được điều chỉnh cho useActionState)
 */
export async function deleteComment(
    prevState: ActionFormState,
    formData: FormData
): Promise<ActionFormState> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) {
        return { success: false, error: "Bạn cần đăng nhập để xóa bình luận." };
    }

    const commentId = formData.get("comment_id") as string;
    const projectId = formData.get("project_id") as string;

    if (!isValidUUID(commentId) || !isValidUUID(projectId)) {
        return { success: false, error: "ID Bình luận hoặc ID Dự án không hợp lệ." };
    }

    // First, get the task_id for revalidation before deleting
    const { data: commentData, error: fetchError } = await supabase
        .from("project_comments")
        .select("task_id")
        .eq("id", commentId)
        .single();

    if (fetchError || !commentData?.task_id) {
        console.error("Lỗi khi lấy task_id để revalidate:", fetchError?.message);
        // Don't block deletion, but we won't be able to revalidate
    }

    // Now, delete the comment
    const { error: deleteError } = await supabase!
        .from("project_comments")
        .delete()
        .eq("id", commentId)
        .eq("created_by", currentUser.id); // Ensure only the owner can delete

    if (deleteError) {
        console.error("Lỗi khi xóa bình luận:", deleteError.message);
        return { success: false, error: deleteError.message };
    }

    // Revalidate if we got the task_id
    if (commentData?.task_id) {
        revalidatePath(`/projects/${projectId}/tasks/${commentData.task_id}`);
    }

    return { success: true, message: "Bình luận đã được xóa thành công." };
}

// Hàm trợ giúp tính toán lại likes_count
async function recountLikes(supabase: any, targetTable: 'project_tasks' | 'project_comments', targetId: string, likeTable: 'task_likes' | 'comment_likes', idColumn: 'task_id' | 'comment_id'): Promise<number> {
    const { count, error: countError } = await supabase
        .from(likeTable)
        .select('*', { count: 'exact', head: true })
        .eq(idColumn, targetId);

    if (countError) {
        console.error(`Error counting likes for ${targetTable}:`, countError.message);
        return 0;
    }

    const newCount = count ?? 0;

    const { error: updateError } = await supabase
        .from(targetTable)
        .update({ likes_count: newCount })
        .eq("id", targetId);

    if (updateError) {
        console.error(`Error updating likes_count for ${targetTable}:`, updateError.message);
    }

    return newCount;
}

// ==========================================================
// BÌNH LUẬN & LIKES ACTIONS
// ==========================================================

export async function toggleTaskLike(taskId: string, isLiking: boolean): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    const userId = currentUser.id;

    if (isLiking) {
        const { error } = await supabase
            .from("task_likes")
            .insert({ task_id: taskId, user_id: userId, created_at: new Date().toISOString() });

        if (error && error.code !== '23505') { // Bỏ qua lỗi trùng lặp key
            console.error("Error liking task:", error.message);
            return { success: false, error: "Không thể thích công việc." };
        }
    } else {
        const { error } = await supabase.from("task_likes").delete().eq("task_id", taskId).eq("user_id", userId);
        if (error) {
            console.error("Error unliking task:", error.message);
            return { success: false, error: "Không thể bỏ thích công việc." };
        }
    }

    await recountLikes(supabase, 'project_tasks', taskId, 'task_likes', 'task_id');
    const { data: taskData } = await supabase.from("project_tasks").select("project_id").eq("id", taskId).single();
    if (taskData?.project_id) {
        revalidatePath(`/projects/${taskData.project_id}`);
    }

    return { success: true };
}

export async function toggleCommentLike(commentId: string, isLiking: boolean): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const currentUser = await getCurrentUser();
    if (!currentUser) return { success: false, error: "Bạn cần đăng nhập." };

    const userId = currentUser.id;

    if (isLiking) {
        const { error } = await supabase
            .from("comment_likes")
            .insert({ comment_id: commentId, user_id: userId, created_at: new Date().toISOString() });

        if (error && error.code !== '23505') { // Bỏ qua lỗi trùng lặp key
            console.error("Error liking comment:", error.message);
            return { success: false, error: "Không thể thích bình luận." };
        }
    } else {
        const { error } = await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", userId);
        if (error) {
            console.error("Error unliking comment:", error.message);
            return { success: false, error: "Không thể bỏ thích bình luận." };
        }
    }

    await recountLikes(supabase, 'project_comments', commentId, 'comment_likes', 'comment_id');
    const { data: commentData } = await supabase.from("project_comments").select("project_id, task_id").eq("id", commentId).single();
    if (commentData?.project_id && commentData.task_id) {
        revalidatePath(`/projects/${commentData.project_id}/tasks/${commentData.task_id}`);
    }

    return { success: true };
}

