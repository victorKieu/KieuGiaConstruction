// types/hrm.d.ts

// Đường dẫn này cần chính xác đến file Database.ts của bạn.
// Ví dụ: '@/types/supabase' nếu Database.ts của bạn nằm ở root/types/supabase.ts
// Hoặc '@/lib/supabase/Database' nếu nó ở root/lib/supabase/Database.ts
import { Database } from "../types/supabase"; // <--- HÃY KIỂM TRA LẠI ĐƯỜNG DẪN NÀY CHO CHÍNH XÁC!

// Định nghĩa kiểu Employee DỰA TRÊN bảng 'employees' từ database
export type Employee = Database['public']['Tables']['employees']['Row'];
export type InsertEmployee = Database['public']['Tables']['employees']['Insert'];
export type UpdateEmployee = Database['public']['Tables']['employees']['Update'];

// Các interface phụ trợ khác (có thể giữ lại trong file này)
export interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
    userId?: string;
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
