// types/project.ts
import { Database } from '@/types/supabase';

// --- ENUMS & BASIC TYPES ---
export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "on_hold" | "done" | "todo";
export type PriorityLevel = "low" | "medium" | "high" | "critical";
export type ConstructionPhase = 'setup' | 'legal' | 'execution' | 'handing_over' | 'closing';

// Type alias cho row gốc từ Supabase (nếu cần dùng raw)
export type project = Database['public']['Tables']['projects']['Row'];

// --- PROJECT DATA CORE ---
export interface ProjectData {
    // 1. Thông tin cơ bản
    id: string;
    name: string;
    code: string;
    project_code?: string | null; // Alias cho code nếu DB dùng tên khác
    description: string | null;
    address: string | null;
    geocode?: string | null;

    // 2. Phân loại & Trạng thái
    status: string;
    project_type: string;
    construction_type: string | null;
    risk_level: string | null;
    construction_phase?: ConstructionPhase; // Giai đoạn thi công (Mới)

    // 3. Nhân sự & Khách hàng
    customer_id: string | null;
    project_manager?: string | null; // ID quản lý
    created_by: string | null;

    // 4. Thời gian & Tiến độ
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string | null;
    progress: number | null;
    progress_percent?: number;

    // 5. Tài chính (Cơ bản từ DB)
    budget: number;
    actual_cost: number | null;
    contract_value?: number | null;

    // 6. THÔNG TIN PHÁP LÝ & KỸ THUẬT (MỚI BỔ SUNG)
    land_lot_number?: string | null;       // Số tờ
    land_parcel_number?: string | null;    // Số thửa
    construction_permit_code?: string | null; // Số GPXD
    permit_issue_date?: string | null;     // Ngày cấp GPXD
    total_floor_area?: number | null;      // Tổng diện tích sàn
    num_floors?: number | null;            // Số tầng

    // 7. CÁC TRƯỜNG JOIN/COMPUTED (Dùng cho UI hiển thị)
    customers?: { name: string; phone?: string; email?: string; avatar_url?: string } | null;
    manager?: { id: string; name: string; email?: string; avatar_url?: string } | null; // Thông tin PM đầy đủ
    created?: { name: string } | null;

    // Dữ liệu từ bảng sys_dictionaries (Join)
    status_data?: { name: string; color: string; code?: string } | null;
    priority_data?: { name: string; color: string; code?: string } | null;
    type_data?: { name: string; code?: string } | null;
    construction_type_data?: { name: string; code?: string } | null;

    // Số liệu tổng hợp (Dashboard)
    member_count?: number;
    document_count?: number;
    total_tasks?: number | null;

    // Tài chính tổng hợp (Dashboard)
    total_contract_value?: number; // Tổng giá trị hợp đồng
    total_income?: number;         // Tổng thực thu
    total_expenses?: number;       // Tổng thực chi
    estimated_cost_total?: number | null;
    quoted_amount_total?: number | null;
    is_permit_required?: boolean;
}

// --- MEMBERS ---
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
        position?: string | { name: string } | null;
        avatar_url?: string | null;
        user_profiles?: {
            avatar_url: string | null;
        } | null;
    };
}

// --- MILESTONES ---
export interface MilestoneData {
    id: string;
    milestone: string; // Tên mốc
    description: string;
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date: string;
    actual_end_date: string;
    status: string;
    created_at: string;
    updated_at: string;
    completion_percentage: number;
    project_id?: string;
}

// --- DOCUMENTS & LEGAL ---
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

// (MỚI) Hồ sơ pháp lý
export interface LegalDoc {
    id: string;
    project_id: string;
    doc_type: string; // GPXD, BAN_VE, TB_KHOI_CONG...
    doc_code?: string;
    issue_date?: string;
    issuing_authority?: string;
    file_url?: string;
    status: 'pending' | 'approved' | 'rejected';
    notes?: string;
    created_at: string;
}

// --- CONSTRUCTION LOGS (MỚI) ---
// Nhật ký thi công
export interface ConstructionLog {
    id: string;
    project_id: string;
    log_date: string;
    weather?: string;
    manpower_count?: number;
    work_description?: string;
    issues?: string;
    images?: string[];
    created_by?: string;
    created_at: string;
}

// --- TASKS & COMMENTS ---
export interface TaskData {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    status: TaskStatus;
    priority?: PriorityLevel;
    progress?: number;
    start_date?: string;
    completed_at?: string;
    assigned_to?: {
        id: string;
        name: string;
        avatar_url?: string;
    } | null;
    due_date?: string;
    created_at: string;
    updated_at: string;
}

export interface CommentData {
    id: string;
    project_id: string;
    task_id?: string;
    content: string;
    created_at: string;
    update_at: string;
    parent_comment_id?: string;
    created_by: {
        id: string;
        name: string;
        avatar_url?: string;
    };
    replies?: CommentData[];
}

export interface TaskFeedItem {
    id: string;
    type: 'task_status_change' | 'comment' | 'milestone_update';
    timestamp: string;
    user_name: string;
    details: string;
}

// --- SURVEYS ---
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
    estimated_cost: number | null;
}

// --- FINANCE & ESTIMATION (BOQ) ---
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

// Mẫu định mức (Từ bảng qto_templates)
export interface QtoTemplate {
    id: string;
    code: string;
    name: string;
    unit: string;
    type: string | null;
    estimated_price: number | null;
    created_at: string | null;
}

// Công tác bóc tách (Từ bảng qto_items)
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

    // Join
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

// Dự toán chi tiết (Từ bảng estimation_items)
export interface EstimationItem {
    id: string;
    project_id: string;
    qto_item_id: string | null;
    material_code: string;
    material_name: string;
    unit: string;
    quantity: number;
    unit_price: number;
    total_cost: number;

    // Support cho giao diện BOQ Mapper
    original_name?: string;
    is_mapped?: boolean;
    section_name?: string;
}