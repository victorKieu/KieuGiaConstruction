// types/hrm.d.ts

// Đường dẫn này cần chính xác đến file Database.ts của bạn.
// Ví dụ: '@/types/supabase' nếu Database.ts của bạn nằm ở root/types/supabase.ts
// Hoặc '@/lib/supabase/Database' nếu nó ở root/lib/supabase/Database.ts
import { Database } from '@/types/supabase'; // <--- HÃY KIỂM TRA LẠI ĐƯỜNG DẪN NÀY CHO CHÍNH XÁC!

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
export interface UserProfile {
    id: string;
    email: string | null;
    phone: string | null; // From auth.users
    app_metadata: object;
    user_metadata: object;
    created_at: string;
    updated_at: string;
    last_sign_in_at: string | null;

    user_type: 'employee' | 'customer' | 'supplier' | null;
    permission_role_name: string | null;

    profile_id: string | null;
    profile_name: string | null;
    profile_avatar_url: string | null;
    contact_email: string | null;
    contact_phone: string | null;
    contact_address: string | null;
    tax_code: string | null;
    code: string | null;
    status: string | null;

    birth_date?: string | null;
    gender?: string | null;
    position?: string | null;
    department?: string | null;
    hire_date?: string | null;
    rank?: string | null;

    contact_person?: string | null;
    notes?: string | null;
    facebook?: string | null;
    zalo?: string | null;
    type?: string | null;
    website?: string | null;
    owner_id?: string | null;
    source?: string | null;
    tag_id?: string | null;

    payment_terms?: string | null;
    bank_account?: string | null;
    bank_name?: string | null;
}
