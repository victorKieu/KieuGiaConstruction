// types/userProfile.ts

import { Database } from '@/types/supabase';
export type project = Database['public']['Tables']['employees']['Row'];

// Định nghĩa kiểu Employee DỰA TRÊN bảng 'employees'
export type userProfiles = Database['public']['Tables']['user_profiles']['Row'];
export interface UserProfile {
    address: string | null;
    avatar_url: string | null;
    birth_date: string | null;
    code: string;
    email: string | null;
    created_at: string;
    department_id: { name: string } | null; // <-- Đã khớp với RPC (Bước 1)
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

    // Các trường JOIN thêm từ RPC
    user_type?: string;
    permission_role_name?: string;
}
