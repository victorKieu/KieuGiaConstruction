// types/hrm.d.ts

import { Database } from '@/types/supabase'; // <--- HÃY KIỂM TRA LẠI ĐƯỜNG DẪN NÀY CHO CHÍNH XÁC!
export type project = Database['public']['Tables']['employees']['Row'];

// Định nghĩa kiểu Employee DỰA TRÊN bảng 'employees' từ database
export type employee = Database['public']['Tables']['employees']['Row'];
export type InsertEmployee = Database['public']['Tables']['employees']['Insert'];
export type UpdateEmployee = Database['public']['Tables']['employees']['Update'];

// Các interface phụ trợ khác (có thể giữ lại trong file này)
export interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
    userId?: string;
}

export interface EmployeeData {
    address: string | null;
    avatar_url: string | null;
    birth_date: string | null;
    code: string;
    created_at: string;
    department_id: { name: string } | null;
    email: string;
    gender: string | null;
    hire_date: string;
    id: string;
    manager_id: string | null;
    name: string;
    phone: string | null;
    position: string;
    rank: string | null;
    role_id: string | null;
    salary: number | null;
    status: string;
    tax_code: string | null;
    updated_at: string;
}

export interface GetEmployeesParams {
    search?: string;
    status?: string;
    department?: string;
    page?: number;
    limit?: number;
}

export interface GetEmployeesResult {
    employees: Employee[];
    totalCount: number;
}


export interface Employee {
    id: string;
    name: string;
    email: string;
    phone?: string | null;

    // --- CÁC TRƯỜNG BẠN ĐANG THIẾU ---
    code: string;           // Mã nhân viên
    avatar_url?: string | null; // Ảnh đại diện
    position: string;       // Chức vụ
    department?: string | null; // Tên phòng ban (Lưu ý: Server Action cần join để lấy tên, không phải ID)
    hire_date: string;      // Ngày vào làm
    status: string;         // Trạng thái (đang làm việc, nghỉ việc...)

    // Các trường khác có thể có trong DB (tùy chọn)
    gender?: string | null;
    birth_date?: string | null;
    address?: string | null;
    tax_code?: string | null;
    manager_id?: string | null;
    created_at?: string;
}

export interface GetEmployeesParams {
    search?: string;
    status?: string;
    department?: string;
    page?: number;
    limit?: number;
}

export interface GetEmployeesResult {
    employees: Employee[];
    totalCount: number;
}