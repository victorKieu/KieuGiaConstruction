// types/project.ts
import { Database } from '@/types/supabase';

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "on_hold" | "done" | "todo";
export type PriorityLevel = "low" | "medium" | "high" | "critical";
export type project = Database['public']['Tables']['projects']['Row'];

type ProjectManager = {
    name: string;
} | null;

type ProjectManagerFK = string | null;
export interface ProjectData {
    id: string;
    name: string;
    code: string;
    description: string | null;
    address: string | null;
    status: string;
    project_type: string;
    construction_type: string | null;
    risk_level: string | null;
    customer_id: string | null;
    progress: number | null;
    budget: number;
    actual_cost: number | null;
    start_date: string;
    end_date: string;
    created_at: string; // Ensure this is not null if DB requires it
    updated_at: string | null;
    project_manager: ProjectManagerFK;
    customers: { name: string } | null;
    employees: ProjectManager;
    created_by: string | null; // Sửa type cho khớp supabase.ts
    created?: { name: string } | null; // Có thể bỏ nếu không dùng JOIN này
    progress_percent?: number;
    member_count?: number;
    document_count?: number;
    total_tasks?: number | null;
    estimated_cost_total?: number | null;
    quoted_amount_total?: number | null;
    total_income?: number | null;
    total_expenses?: number | null;
    contract_value?: number | null;
    manager?: { name: string } | null;
    geocode?: string | null;
}

export interface ProjectMember { 
    id: string;
    project_id: string;
    user_id: string;
    role_id: string;
    joined_at: string;
    employee: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        position: string;
        avatar_url?: string;
    };
}   

export interface MilestoneData {
    id: string;
    // name: string;
    milestone: string;
    description: string;
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date: string;
    actual_end_date: string;
    status: string; // Tạm giữ string
    created_at: string;
    updated_at: string;
    completion_percentage: number;
    project_id?: string;
}

// --- MEMBER DATA ---
export interface MemberData {
    project_id: string;
    employee_id: string;
    joined_at: string;
    role_id: string;
    role_name?: string;
    role_code?: string;
    employee?: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        // Chỉnh sửa đoạn này:
        position?: string | { name: string } | null;
        avatar_url?: string | null;
        // Thêm trường này để khớp với dữ liệu Join từ Supabase
        user_profiles?: {
            avatar_url: string | null;
        } | null;
    };
}
// --- DOCUMENT DATA ---
export interface DocumentData {
    id: string;
    name: string;
    type: string;
    url: string;
    uploaded_at: string;
    uploaded_by: { name: string; } | null;
    project_id: string;
    description: string | null;
    category: string | null;
}

// --- FINANCE DATA ---
export interface FinanceData {
    id: string;
    budget: number;
    spent: number;
    remaining: number | null;
    allocation: {
        materials: number;
        labor: number;
        equipment: number;
        others: number;
    } | null;
    updated_at: string | null;
}

// --- TASK DATA ---
export interface TaskData {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    status: TaskStatus; // Dùng TaskStatus type đã định nghĩa
    priority?: PriorityLevel; // Dùng PriorityLevel type đã định nghĩa
    progress?: number;
    start_date?: string;
    completed_at?: string;
    assigned_to?: {
        id: string;
        name: string;
        avatar_url?: string;
    } | null; // Sửa: Cho phép null
    due_date?: string;
    created_at: string;
    updated_at: string;
}

// --- COMMENT DATA ---
export interface CommentData {
    id: string;
    project_id: string;
    task_id?: string;
    content: string;
    created_at: string;
    update_at: string;
    parent_comment_id?: string; // <-- ID của bình luận cha
    created_by: {
        id: string;
        name: string;
        avatar_url?: string;
    };
    replies?: CommentData[]; // <-- Mảng các bình luận trả lời (cho Tree View)
}

// --- TASK FEED ITEM (Dành cho Activity Log) ---
export interface TaskFeedItem {
    id: string;
    type: 'task_status_change' | 'comment' | 'milestone_update';
    timestamp: string;
    user_name: string;
    details: string;
}

// Định nghĩa Đợt Khảo sát (Lấy từ project_surveys + JOIN)
export interface Survey {
    id: string;
    name: string;
    survey_date: string;
    status: string;
    project_id: string;
    created_at: string;
    created_by: {
        name: string,
        avatar_url: string | null
    } | null;
}

export interface SurveyTask {
    id: string;
    survey_id: string;
    title: string;
    status: string;
    due_date: string | null;
    result_data: JSON | null;
    notes: string | null;
    assigned_to: {
        name: string,
        avatar_url: string | null
    } | null;
}

export interface SurveyTemplate {
    id: string;
    name: string;
    description: string | null;
}

export interface SurveyTaskTemplate {
    id: string;
    title: string;
    category: string | null;
    description: string | null;
}

// Định nghĩa Mẫu Công việc Khảo sát (Lấy từ survey_task_templates)
export interface SurveyTaskTemplate {
    id: string;
    title: string;
    category: string | null;
    description: string | null;
    estimated_cost: number | null; // Đã fix (File 215, 216)
}

// --- PHẦN FIX: THÊM 2 TYPE MỚI VÀO CUỐI FILE ---

/**
 * Định nghĩa Mẫu Công tác (Lấy từ CSDL 'qto_templates' - File 215)
 */
export interface QtoTemplate {
    id: string;
    code: string;
    name: string;
    unit: string;
    type: string | null;
    estimated_price: number | null;
    created_at: string | null;
}

/**
 * Định nghĩa Công tác Bóc tách (Lấy từ CSDL 'qto_items' - File 190)
 */
export interface QtoItem {
    id: string;
    created_at: string | null;
    is_active: boolean | null;
    item_name: string;
    item_type: Database["public"]["Enums"]["qto_item_type_enum"];
    notes: string | null;
    project_id: string;
    quantity: number;
    unit: string;
    unit_price: number;
    updated_at: string | null;

    // Trường JOIN (từ qtoActions.ts - File 216)
    template?: {
        code: string;
        name: string;
        unit: string;
        estimated_price: number;
    } | null;
    components?: {
        id: string;
        material_code: string;
        material_name: string;
        unit: string;
        quantity: number;
    }[];
}

// Định nghĩa Mẫu Công việc Khảo sát
export interface SurveyTaskTemplate {
    id: string;
    title: string;
    category: string | null;
    description: string | null;
    estimated_cost: number | null;
}

// --- PHẦN FIX: THÊM TYPE MỚI VÀO CUỐI FILE ---

/**
 * Định nghĩa Dòng Dự toán Chi tiết (Lấy từ CSDL 'estimation_items' - File 229)
 * Đây là kết quả sau khi "nổ" (explode) QTO qua Định mức (Norms).
 */
export interface EstimationItem {
    id: string;
    project_id: string;
    qto_item_id: string | null; // (Liên kết với QTO)
    material_code: string; // (Mã Vật tư/Nhân công/Máy)
    material_name: string; // (Tên Vật tư/Nhân công/Máy)
    unit: string; // (Đơn vị: kg, m3, công...)
    quantity: number; // (Khối lượng đã phân tích)
    unit_price: number; // (Đơn giá)
    total_cost: number; // (Thành tiền: quantity * unit_price)
}