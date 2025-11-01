// types/hrm.d.ts

import { Database } from '@/types/supabase'; // <--- HÃY KIỂM TRA LẠI ĐƯỜNG DẪN NÀY CHO CHÍNH XÁC!
export type project = Database['public']['Tables']['employees']['Row'];

// Định nghĩa kiểu Employee DỰA TRÊN bảng 'employees' từ database
export type userProfiles = Database['public']['Tables']['user_profiles']['Row'];
export interface UserProfile {
    address: string | null;
    avatar_url: string | null;
    birth_date: string | null;
    code: string;
    email: string | null;
    created_at: string;
    department_id: { name: string } | null;
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



