import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cache } from "react";

export type UserSession = {
    isAuthenticated: boolean;
    userId: string;
    entityId: string | null;
    role: string;
    type: 'employee' | 'customer' | 'supplier' | 'guest';
    error?: string;
    id: string;
    email?: string;
    name?: string;
    avatarUrl?: string;
};

export const getCurrentSession = cache(async (): Promise<UserSession> => {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy Auth User từ Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        return {
            isAuthenticated: false,
            userId: '',
            id: '',
            entityId: null,
            role: 'guest',
            type: 'guest'
        };
    }

    // 2. Lấy thông tin từ user_profiles (FIX THEO CẤU TRÚC SQL MỚI)
    const { data: profile } = await supabase
        .from("user_profiles")
        .select(`
            id,
            email,
            name,        
            avatar_url,  
            type_data:sys_dictionaries!type_id ( code ),
            role_data:sys_dictionaries!role_id ( code )
        `)
        // ✅ QUAN TRỌNG: Tìm theo auth_id (vì auth.users.id map với user_profiles.auth_id)
        .eq("auth_id", user.id)
        .single();

    if (!profile) {
        // Trường hợp có Auth nhưng chưa có Profile (hoặc bị lỗi RLS chặn)
        return {
            isAuthenticated: true,
            userId: user.id,
            id: user.id,
            entityId: null,
            role: 'guest',
            type: 'guest',
            error: 'Profile not found',
            email: user.email,
            name: user.email?.split('@')[0]
        };
    }

    // 3. Xử lý dữ liệu
    const userType = (profile.type_data as any)?.code?.toLowerCase() || 'guest';
    const userRole = (profile.role_data as any)?.code?.toLowerCase() || 'viewer';
    const avatarUrl = profile.avatar_url || "";
    // ✅ FIX: Dùng cột 'name' thay vì first_name/last_name
    const displayName = profile.name || user.email?.split('@')[0] || "User";

    // 4. XÁC ĐỊNH ENTITY ID (QUAN TRỌNG NHẤT)
    // Hệ thống cần biết "Nhân viên ID" của bạn là gì để so khớp với bảng project_members.

    // Mặc định dùng Profile ID (nếu user_profiles là bảng gốc)
    let entityId = profile.id;

    // NHƯNG: Nếu bạn có bảng 'employees' riêng và project_members dùng ID của bảng đó
    // thì ta cần ưu tiên lấy ID từ bảng employees.
    if (userType === 'employee') {
        const { data: employee } = await supabase
            .from("employees")
            .select("id, name")
            // Thử tìm theo auth_id trước (ưu tiên)
            .eq("auth_id", user.id)
            .single();

        if (employee) {
            entityId = employee.id; // ✅ Lấy ID thật sự được dùng trong nghiệp vụ
        }
    } else if (userType === 'customer') {
        const { data: customer } = await supabase
            .from("customers")
            .select("id, name")
            .eq("auth_id", user.id)
            .single();

        if (customer) {
            entityId = customer.id;
        }
    }

    return {
        id: user.id,
        isAuthenticated: true,
        userId: user.id,
        entityId: entityId, // ID này sẽ được dùng để filter dự án
        role: userRole,
        type: userType as UserSession['type'],
        email: profile.email || user.email,
        name: displayName,
        avatarUrl: avatarUrl
    };
});