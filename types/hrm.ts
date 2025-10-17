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
}

