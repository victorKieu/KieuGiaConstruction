// 📂 types/employee.ts

import { Database } from '@/types/supabase';

// --- A. SUPABASE DATABASE TYPES (Dữ liệu thô từ DB) ---
export type EmployeeRow = Database['public']['Tables']['employees']['Row'];
export type InsertEmployee = Database['public']['Tables']['employees']['Insert'];
export type UpdateEmployee = Database['public']['Tables']['employees']['Update'];

// --- B. HELPER TYPES (Dùng cho Dropdown/Badge) ---
export interface DictionaryOption {
    id: string;
    code: string;
    name: string;
    color?: string;
}

// --- C. MAIN UI TYPE (Dùng cho Danh sách nhân viên & Client Page) ---
// Đây là Interface quan trọng nhất để fix lỗi TS2339
export interface Employee {
    id: string;
    code: string;
    name: string;
    email: string;
    phone?: string | null;
    avatar_url?: string | null;

    // Các trường hiển thị (đã được join bảng hoặc format)
    position?: string;       // Tên chức vụ (VD: "Giám đốc")
    department?: string | null; // Tên phòng ban (VD: "Phòng IT")
    status?: string;         // Tên trạng thái (VD: "Đang làm việc")
    hire_date?: string;      // Ngày vào làm (ISO string)
    created_at?: string;
    has_account?: boolean;
}

// --- D. FORM DATA TYPE (Dùng cho Create/Update Form) ---
export interface EmployeeFormData {
    code?: string; // Có thể optional vì server tự sinh
    name: string;
    email: string;
    phone: string;
    identity_card: string;
    address: string;
    birth_date?: string;
    avatar_url?: string | null;

    // Dropdown (Chỉ lưu ID vào DB)
    gender_id?: string;
    position_id?: string;
    department_id?: string;
    status_id?: string;
    contract_type_id?: string;
    marital_status_id?: string;

    basic_salary: number;
    hire_date: string;
}

// --- E. DETAIL DATA TYPE (Dùng cho trang Chi tiết - Dữ liệu đầy đủ hơn) ---
export interface EmployeeDetail extends EmployeeRow {
    // Override các trường quan hệ để chứa Object chi tiết thay vì null
    gender?: DictionaryOption | null;
    position?: DictionaryOption | null;
    department?: DictionaryOption | null;
    status?: DictionaryOption | null;
    contract_type?: DictionaryOption | null;
    marital_status?: DictionaryOption | null;

    // Auth info
    user_profiles?: {
        auth_id?: string | null;
        avatar_url?: string | null;
        email?: string | null;
    } | null;
}

// --- F. ACTION TYPES (Tham số và Kết quả trả về của Server Action) ---
export interface GetEmployeesParams {
    search?: string;
    status?: string;
    department?: string;
    page?: number;
    limit?: number;
}

export interface GetEmployeesResult {
    employees: Employee[]; // Trả về danh sách theo Interface Employee ở mục C
    totalCount: number;
}

export interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
    userId?: string;
    fields?: Record<string, any>;
}