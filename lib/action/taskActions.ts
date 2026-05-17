"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/session";
import { isValidUUID } from "@/lib/utils/uuid";
import { TaskData, CommentData } from "@/types/project";
import { getDictionaryItems } from "@/lib/action/dictionaryActions";
import { calculateTaskDates, Holiday } from "@/lib/utils/scheduleEngine";

// Chỉ import đúng hàm này từ projectActions
import { getCurrentUserRoleInProject } from "./projectActions";

// 👇 TỰ ĐỊNH NGHĨA CÁC TYPE CẦN THIẾT NGAY TẠI ĐÂY 👇
export type ActionResponse = { success: boolean; message?: string; error?: string; data?: any };
export type ActionFormState = { success: boolean; message?: string; error?: string; fields?: any };
export type ActionFetchResult<T> = { data: T; error: { message: string; code?: string } | null };

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
export async function getProjectTasks(projectId: string): Promise<any[]> {
    if (!isValidUUID(projectId)) return [];
    
    const session = await getCurrentSession();
    const roleCode = await getCurrentUserRoleInProject(projectId);
    
    const isManagerOrAdmin = session.role === "admin" || roleCode === "MANAGER";
    const isMasked = !isManagerOrAdmin; 

    const supabase = await createSupabaseServerClient();

    // 🔥 BỔ SUNG 1: Dùng project_comments(count) để đếm số lượng bình luận trực tiếp
    const { data, error } = await supabase.from('project_tasks').select(`
        *,
        assignee:employees ( id, name, user_profiles ( avatar_url ) ),
        status:sys_dictionaries!status_id ( id, name, code, color ),
        priority:sys_dictionaries!priority_id ( id, name, code, color ),
        parent:project_tasks!parent_id ( name ),
        project_comments ( count ) 
    `).eq('project_id', projectId).order('wbs_code', { ascending: true });

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

        // Lấy con số đếm được từ DB
        const realCommentCount = t.project_comments?.[0]?.count
            || (Array.isArray(t.project_comments) ? t.project_comments.length : 0);

        return {
            ...t,
            weight: Number(t.weight) || 0,
            progress: Number(t.progress) || 0,
            
            wbs_code: t.wbs_code || "",
            unit: t.unit || "",
            planned_quantity: Number(t.planned_quantity) || 0,
            actual_quantity: Number(t.actual_quantity) || 0,
            parent_id: t.parent_id || null,

            cost_estimate: isMasked ? null : (Number(t.cost_estimate) || 0),
            planned_price: isMasked ? null : (Number(t.planned_price) || 0),
            planned_cost:  isMasked ? null : (Number(t.planned_cost) || 0),   
            actual_cost:   isMasked ? null : (Number(t.actual_cost) || 0),    
            earned_value:  isMasked ? null : (Number(t.earned_value) || 0),   

            status: normalize(t.status),
            priority: normalize(t.priority),
            
            // 🔥 BỔ SUNG 2: Xuất số liệu chuẩn ra cho Kanban
            comments_count: realCommentCount, 

            assignee: assigneeData ? {
                id: assigneeData.id,
                name: assigneeData.name,
                avatar_url: avatarUrl
            } : null
        };
    });
}

// --- 3. CREATE TASK (EVM UPGRADED) ---
export async function createTask(projectId: string, formData: FormData): Promise<ActionResponse> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập" };

    const supabase = await createSupabaseServerClient();

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
        progress: 0,
        created_by: session.entityId,

        // 🔥 THÊM CÁC TRƯỜNG EVM & WBS 🔥
        wbs_code: formData.get("wbs_code") || null,
        unit: formData.get("unit") || null,
        planned_quantity: Number(formData.get("planned_quantity")) || 0,
        planned_price: Number(formData.get("planned_price")) || 0,
        planned_cost: Number(formData.get("planned_cost")) || 0,
    };

    const { error } = await supabase.from('project_tasks').insert(payload);
    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Tạo công việc thành công" };
}

// --- 4. UPDATE TASK (EVM UPGRADED) ---
export async function updateTask(taskId: string, projectId: string, formData: FormData): Promise<ActionResponse> {
    const supabase = await createSupabaseServerClient();

    const payload = {
        name: formData.get("name"),
        assigned_to: cleanUUID(formData.get("assigned_to")),
        priority_id: cleanUUID(formData.get("priority_id")),
        status_id: cleanUUID(formData.get("status_id")),
        progress: Number(formData.get("progress")) || 0,
        weight: Number(formData.get("weight")) || 0,

        start_date: formData.get("start_date") || null,
        due_date: formData.get("due_date") || null,
        description: formData.get("description"),
        updated_at: new Date().toISOString(),

        // 🔥 THÊM CÁC TRƯỜNG EVM & WBS 🔥
        wbs_code: formData.get("wbs_code") || null,
        unit: formData.get("unit") || null,
        planned_quantity: Number(formData.get("planned_quantity")) || 0,
        planned_price: Number(formData.get("planned_price")) || 0,
        planned_cost: Number(formData.get("planned_cost")) || 0,
    };

    const { error } = await supabase.from('project_tasks').update(payload).eq('id', taskId);
    if (error) return { success: false, error: error.message };

    await rollupTaskProgressAndCost(taskId, projectId);

    await updateProjectOverallProgress(projectId);

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

    // 🔥 SỬA LỖI LỆCH PHA: Dùng entityId (Mã nhân sự) thay vì userId (Auth ID)
    const employeeId = session.entityId;

    // Mặc dù cột trong DB có thể đang tên là 'user_id', nhưng chúng ta sẽ lưu Mã nhân sự vào đây
    if (isLiking) {
        await supabase.from("task_likes").insert({ task_id: taskId, user_id: employeeId });
    } else {
        await supabase.from("task_likes").delete().eq("task_id", taskId).eq("user_id", employeeId);
    }

    // Cập nhật lại bộ đếm Likes của Task
    const { count } = await supabase.from("task_likes").select('*', { count: 'exact', head: true }).eq("task_id", taskId);
    await supabase.from("project_tasks").update({ likes_count: count || 0 }).eq("id", taskId);

    const { data } = await supabase.from("project_tasks").select("project_id").eq("id", taskId).single();
    if (data?.project_id) revalidatePath(`/projects/${data.project_id}`);

    return { success: true };
}

// --- 5. COMMENTS ---
export async function getTaskComments(taskId: string): Promise<ActionFetchResult<CommentData[]>> {
    if (!isValidUUID(taskId)) return { data: [], error: { message: "ID không hợp lệ", code: "400" } };
    const supabase = await createSupabaseServerClient();

    // SỬA LỖI 1: Join với bảng employees để lấy đúng thông tin người bình luận
    const { data, error } = await supabase.from("project_comments")
        .select(`*, created_by:employees ( id, name, user_profiles ( avatar_url ) )`)
        .eq("task_id", taskId).order("created_at", { ascending: true });

    if (error) return { data: [], error: { message: error.message, code: error.code } };

    // Chuẩn hóa dữ liệu trả về để Avatar không bị lỗi
    const formattedData = data.map((c: any) => {
        const normalize = (f: any) => Array.isArray(f) ? f[0] : f;
        const creator = normalize(c.created_by);
        let avatar = null;
        if (creator?.user_profiles) {
            avatar = normalize(creator.user_profiles)?.avatar_url;
        }
        return {
            ...c,
            created_by: creator ? { id: creator.id, name: creator.name, avatar_url: avatar } : null
        };
    });

    return { data: formattedData as CommentData[], error: null };
}

export async function createComment(projectId: string, taskId: string, prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Chưa đăng nhập" };

    const content = (formData.get("content") as string)?.trim();
    if (!content) return { success: false, error: "Nội dung trống" };

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("project_comments").insert({
        project_id: projectId,
        task_id: taskId,
        content,
        created_by: session.entityId, // SỬA LỖI 2: Truyền đúng entityId (Mã nhân sự)
        parent_comment_id: formData.get("parent_comment_id") || null
    });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã gửi bình luận" };
}

export async function updateComment(prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Auth required" };

    const commentId = formData.get("comment_id") as string;
    const projectId = formData.get("project_id") as string;
    const content = formData.get("content") as string;

    const supabase = await createSupabaseServerClient();

    // Sửa userId thành entityId
    const { error } = await supabase.from("project_comments")
        .update({ content, updated_at: new Date().toISOString() })
        .eq("id", commentId)
        .eq("created_by", session.entityId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã cập nhật" };
}

export async function deleteComment(prevState: any, formData: FormData): Promise<ActionFormState> {
    const session = await getCurrentSession();
    const commentId = formData.get("comment_id") as string;
    const projectId = formData.get("project_id") as string;

    const supabase = await createSupabaseServerClient();

    // Sửa userId thành entityId
    const { error } = await supabase.from("project_comments")
        .delete()
        .eq("id", commentId)
        .eq("created_by", session.entityId);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa" };
}

// Hàm toggleCommentLike giữ nguyên do bảng Like sử dụng Auth UUID
export async function toggleCommentLike(commentId: string, isLiking: boolean): Promise<ActionResponse> {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) return { success: false, error: "Auth required" };

    const supabase = await createSupabaseServerClient();

    // 🔥 SỬA LỖI LỆCH PHA: Dùng entityId (Mã nhân sự)
    const employeeId = session.entityId;

    if (isLiking) {
        await supabase.from("comment_likes").insert({ comment_id: commentId, user_id: employeeId });
    } else {
        await supabase.from("comment_likes").delete().eq("comment_id", commentId).eq("user_id", employeeId);
    }

    // Cập nhật lại bộ đếm Likes của Comment
    const { count } = await supabase.from("comment_likes").select('*', { count: 'exact', head: true }).eq("comment_id", commentId);
    await supabase.from("project_comments").update({ likes_count: count || 0 }).eq("id", commentId);

    return { success: true };
}

// =========================================================================
// THUẬT TOÁN ĐỆ QUY: TỰ ĐỘNG TÍNH TOÁN TIẾN ĐỘ & NGÂN SÁCH (EVM ROLL-UP)
// =========================================================================
export async function rollupTaskProgressAndCost(taskId: string, projectId: string) {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy thông tin task hiện tại để biết ID của task cha
    const { data: currentTask } = await supabase.from('project_tasks').select('parent_id').eq('id', taskId).single();
    if (!currentTask || !currentTask.parent_id) return; // Nếu không có cha (là cấp cao nhất) thì dừng đệ quy

    const parentId = currentTask.parent_id;

    // 2. Lấy TẤT CẢ các anh em (siblings - các task con cùng chung 1 cha)
    const { data: siblings } = await supabase.from('project_tasks').select('progress, planned_cost').eq('parent_id', parentId);
    if (!siblings || siblings.length === 0) return;

    // 3. Khởi tạo biến cộng dồn
    let totalPV = 0; // Tổng ngân sách kế hoạch (Planned Value)
    let totalEV = 0; // Tổng giá trị thực tế đạt được (Earned Value)
    let sumProgress = 0; // Dùng cho trường hợp chia đều

    // 4. Quét qua các task con để cộng dồn
    siblings.forEach(child => {
        const cost = Number(child.planned_cost) || 0;
        const prog = Number(child.progress) || 0;

        totalPV += cost;
        totalEV += cost * (prog / 100); // Công thức EV = PV * % Hoàn thành
        sumProgress += prog;
    });

    // 5. Tính toán lại Tiến độ cho Task Cha
    let newParentProgress = 0;
    if (totalPV > 0) {
        // Nếu có nhập tiền: Tính theo trọng số Ngân sách (EVM)
        newParentProgress = Math.round((totalEV / totalPV) * 100);
    } else {
        // Nếu không nhập tiền: Chia trung bình cộng
        newParentProgress = Math.round(sumProgress / siblings.length);
    }

    // 6. Cập nhật số liệu mới lên Task Cha
    await supabase.from('project_tasks').update({
        progress: newParentProgress,
        planned_cost: totalPV,      // Tự động cuộn Ngân sách từ dưới lên
        earned_value: totalEV       // Tự động cuộn Giá trị đạt được từ dưới lên
    }).eq('id', parentId);

    // 7. ĐỆ QUY: Tiếp tục gọi hàm này để tính ngược lên cấp Cha/Ông Nội cao hơn
    await rollupTaskProgressAndCost(parentId, projectId);
}

// =========================================================================
// THUẬT TOÁN TÍNH TIẾN ĐỘ TỔNG THỂ DỰ ÁN (PROJECT LEVEL EVM)
// =========================================================================
export async function updateProjectOverallProgress(projectId: string) {
    const supabase = await createSupabaseServerClient();

    // 1. Chỉ lấy các Hạng mục Gốc (WBS Level 1 - không có parent_id)
    // Tránh việc cộng dồn trùng lặp (Double-counting) với các task con
    const { data: rootTasks } = await supabase
        .from('project_tasks')
        .select('progress, planned_cost, earned_value')
        .eq('project_id', projectId)
        .is('parent_id', null);

    if (!rootTasks || rootTasks.length === 0) return;

    let totalPV = 0; // Ngân sách toàn dự án (BAC)
    let totalEV = 0; // Giá trị đạt được toàn dự án (Earned Value)
    let sumProgress = 0;

    rootTasks.forEach(task => {
        totalPV += Number(task.planned_cost) || 0;
        totalEV += Number(task.earned_value) || 0;
        sumProgress += Number(task.progress) || 0;
    });

    // 2. Tính toán Tiến độ Tổng thể theo EVM
    let overallProgress = 0;
    if (totalPV > 0) {
        overallProgress = Math.round((totalEV / totalPV) * 100);
    } else {
        // Fallback: Nếu dự án chưa nhập tiền, chia trung bình cộng các hạng mục lớn
        overallProgress = Math.round(sumProgress / rootTasks.length);
    }

    // 3. Cập nhật thẳng vào bảng `projects`
    await supabase.from('projects').update({ progress: overallProgress }).eq('id', projectId);
}

// =========================================================================
// QUẢN LÝ TIẾN ĐỘ (SCHEDULE ENGINE) - HIỆU ỨNG DOMINO
// =========================================================================

export async function autoScheduleSuccessors(taskId: string, projectId: string, visited = new Set<string>()) {
    // 🛡️ CHỐNG LỖI VÒNG LẶP VÔ TẬN (Circular Dependency: A -> B -> A)
    if (visited.has(taskId)) {
        console.warn("⚠️ Phát hiện vòng lặp tiến độ tại Task ID:", taskId);
        return;
    }
    visited.add(taskId);

    const supabase = await createSupabaseServerClient();

    // 1. Lấy thông tin ngày tháng của Công việc hiện tại (Việc A)
    const { data: currentTask } = await supabase
        .from("project_tasks")
        .select("id, start_date, end_date")
        .eq("id", taskId)
        .single();

    if (!currentTask || !currentTask.start_date || !currentTask.end_date) return;

    // 2. Lấy danh sách ngày Lễ/Tết từ Database
    const { data: holidaysData } = await supabase.from("working_holidays").select("*");
    const holidays: Holiday[] = holidaysData?.map(h => ({
        date: h.is_yearly ? h.holiday_date.substring(5) : h.holiday_date, // Lấy MM-DD nếu là ngày lặp lại hàng năm
        isYearly: h.is_yearly
    })) || [];

    // 3. Tìm tất cả các Công việc đi sau (Successors - Việc B, C, D...) phụ thuộc vào Việc A
    const { data: dependencies } = await supabase
        .from("task_dependencies")
        .select(`
            dependency_type, lag_days,
            successor:project_tasks!successor_id ( id, duration, allow_weekend_work, start_date, end_date )
        `)
        .eq("predecessor_id", taskId);

    if (!dependencies || dependencies.length === 0) {
        // Nếu không có việc nào nối đuôi, ta chỉ cần cập nhật Tổng tiến độ dự án rồi dừng.
        await updateProjectOverallSchedule(projectId);
        return;
    }

    // 4. Tính toán và Cập nhật cho từng Việc đi sau
    for (const dep of dependencies) {
        const successor = Array.isArray(dep.successor) ? dep.successor[0] : dep.successor;
        if (!successor) continue;

        // 🧠 Gọi Động cơ tính toán từ lib/utils
        const newDates = calculateTaskDates(
            { startDate: new Date(currentTask.start_date), endDate: new Date(currentTask.end_date) },
            successor.duration || 1,
            dep.dependency_type as any,
            dep.lag_days || 0,
            holidays,
            successor.allow_weekend_work || false
        );

        // Chuyển đổi định dạng ngày YYYY-MM-DD
        const newStartStr = newDates.startDate.toISOString().split('T')[0];
        const newEndStr = newDates.endDate.toISOString().split('T')[0];

        // 🚨 CHỈ CẬP NHẬT & KÍCH HOẠT ĐỆ QUY NẾU NGÀY THÁNG THỰC SỰ BỊ THAY ĐỔI
        if (newStartStr !== successor.start_date || newEndStr !== successor.end_date) {
            await supabase
                .from("project_tasks")
                .update({ start_date: newStartStr, end_date: newEndStr })
                .eq("id", successor.id);

            // 🔥 ĐỆ QUY: Việc B vừa bị đổi ngày, gọi lại hàm này để bắt Việc B đi tìm Việc C cập nhật tiếp!
            await autoScheduleSuccessors(successor.id, projectId, visited);
        }
    }

    // 5. Cập nhật Tổng thời gian dự án ở bước cuối
    await updateProjectOverallSchedule(projectId);
}

// HÀM CẬP NHẬT TỔNG THỜI GIAN CỦA TOÀN BỘ DỰ ÁN (Project Start/End Date)
export async function updateProjectOverallSchedule(projectId: string) {
    const supabase = await createSupabaseServerClient();

    // Quét toàn bộ công việc trong dự án
    const { data } = await supabase
        .from("project_tasks")
        .select("start_date, end_date")
        .eq("project_id", projectId)
        .not("start_date", "is", null)
        .not("end_date", "is", null);

    if (!data || data.length === 0) return;

    // Tìm ngày bắt đầu SỚM NHẤT và ngày kết thúc MUỘN NHẤT
    const starts = data.map(t => new Date(t.start_date).getTime());
    const ends = data.map(t => new Date(t.end_date).getTime());

    const projectStart = new Date(Math.min(...starts)).toISOString().split('T')[0];
    const projectEnd = new Date(Math.max(...ends)).toISOString().split('T')[0];

    // Ghi vào bảng Dự án
    await supabase
        .from("projects")
        .update({ start_date: projectStart, end_date: projectEnd })
        .eq("id", projectId);
}

// =========================================================================
// API LƯU THÔNG SỐ TIẾN ĐỘ VÀ KÍCH HOẠT DOMINO
// =========================================================================

export async function updateTaskSchedule(
    taskId: string,
    projectId: string,
    updates: {
        start_date?: string;
        duration?: number;
        allow_weekend_work?: boolean;
    }
) {
    try {
        const supabase = await createSupabaseServerClient();

        // 1. Cập nhật thông số mới vào Database
        const { error } = await supabase
            .from("project_tasks")
            .update(updates)
            .eq("id", taskId);

        if (error) throw error;

        // 2. 🔥 KÍCH HOẠT ĐỘNG CƠ DOMINO TÍNH TOÁN LẠI TOÀN BỘ DỰ ÁN
        await autoScheduleSuccessors(taskId, projectId);

        // 3. Làm mới giao diện
        revalidatePath(`/projects/${projectId}`);

        return { success: true, message: "Đã cập nhật tiến độ tự động!" };
    } catch (error: any) {
        console.error("Lỗi updateTaskSchedule:", error.message);
        return { success: false, error: error.message };
    }
}

// =========================================================================
// AUTO-GENERATE WBS CODE
// =========================================================================
export async function generateNextWbsCode(projectId: string, parentId: string | null = null) {
    const supabase = await createSupabaseServerClient();

    if (!parentId) {
        // TẠO TASK CHA (GỐC): Đếm số lượng task gốc hiện có
        const { data } = await supabase
            .from('project_tasks')
            .select('wbs_code')
            .eq('project_id', projectId)
            .is('parent_id', null);

        if (!data || data.length === 0) return "1";

        // Trích xuất các số từ mã (đề phòng có người nhập chữ), tìm số lớn nhất + 1
        const codes = data.map(t => parseInt(t.wbs_code || "0")).filter(n => !isNaN(n));
        const maxCode = codes.length > 0 ? Math.max(...codes) : 0;
        return `${maxCode + 1}`;
    } else {
        // TẠO TASK CON: Nối mã của Cha với số thứ tự của Con
        const { data: parent } = await supabase
            .from('project_tasks')
            .select('wbs_code')
            .eq('id', parentId)
            .single();

        const parentWbs = parent?.wbs_code || "0";

        const { data: siblings } = await supabase
            .from('project_tasks')
            .select('wbs_code')
            .eq('project_id', projectId)
            .eq('parent_id', parentId);

        if (!siblings || siblings.length === 0) return `${parentWbs}.1`;

        // Tách phần đuôi của các task anh em (VD: "1.2" -> lấy số 2)
        const siblingNumbers = siblings.map(t => {
            const parts = (t.wbs_code || "").split('.');
            return parseInt(parts[parts.length - 1] || "0");
        }).filter(n => !isNaN(n));

        const maxSibling = siblingNumbers.length > 0 ? Math.max(...siblingNumbers) : 0;
        return `${parentWbs}.${maxSibling + 1}`;
    }
}

export async function updateTaskDependency(taskId: string, projectId: string, predecessorId: string | null) {
    try {
        const supabase = await createSupabaseServerClient();

        // 1. Xóa liên kết cũ (nếu có)
        await supabase.from("task_dependencies").delete().eq("successor_id", taskId);

        // 2. Nếu có chọn tiền nhiệm mới, tạo liên kết mới
        if (predecessorId) {
            const { error: depError } = await supabase
                .from("task_dependencies")
                .insert({
                    project_id: projectId,
                    predecessor_id: predecessorId,
                    successor_id: taskId,
                    dependency_type: 'FS', // Mặc định là xong mới bắt đầu
                    lag_days: 0
                });
            if (depError) throw depError;
        }

        // 3. 🔥 KÍCH HOẠT TÍNH TOÁN LẠI TOÀN BỘ CHUỖI TIẾN ĐỘ
        // Chúng ta bắt đầu tính từ task Tiền nhiệm để nó đẩy task hiện tại và các task sau nó
        if (predecessorId) {
            await autoScheduleSuccessors(predecessorId, projectId);
        } else {
            // Nếu bỏ liên kết, tính lại từ chính task này
            await autoScheduleSuccessors(taskId, projectId);
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}