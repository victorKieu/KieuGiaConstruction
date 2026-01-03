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

    // 2. Lấy thông tin từ user_profiles (Lấy Avatar tập trung tại đây)
    const { data: profile } = await supabase
        .from("user_profiles")
        .select(`
            id,
            avatar_url,  
            type_data:sys_dictionaries!type_id ( code ),
            role_data:sys_dictionaries!role_id ( code )
        `)
        .eq("id", user.id)
        .single();

    if (!profile) {
        return {
            isAuthenticated: true,
            userId: user.id,
            id: user.id,
            entityId: null,
            role: 'guest',
            type: 'guest',
            error: 'Profile not found',
            email: user.email
        };
    }

    // Ép kiểu để lấy code từ dictionaries
    const userType = (profile.type_data as any)?.code?.toLowerCase() || 'guest';
    const userRole = (profile.role_data as any)?.code?.toLowerCase() || 'viewer';
    const avatarUrl = profile.avatar_url || "";

    // 3. Lấy Tên hiển thị từ bảng chi tiết (Employees / Customers)
    let entityId = null;
    let name = "";

    if (userType === 'employee') {
        const { data: employee } = await supabase
            .from("employees")
            .select("id, name")
            .eq("auth_id", user.id)
            .single();

        if (employee) {
            entityId = employee.id;
            name = employee.name;
        }
    } else if (userType === 'customer') {
        const { data: customer } = await supabase
            .from("customers")
            .select("id, name")
            .eq("auth_id", user.id)
            .single();

        if (customer) {
            entityId = customer.id;
            name = customer.name;
        }
    }

    return {
        id: user.id,
        isAuthenticated: true,
        userId: user.id,
        entityId: entityId,
        role: userRole,
        type: userType as UserSession['type'],
        email: user.email,
        name: name || user.email?.split('@')[0] || "User",
        avatarUrl: avatarUrl
    };
});