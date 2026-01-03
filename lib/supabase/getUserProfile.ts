import { createSupabaseServerClient } from "./server";
import { cache } from "react";

export const getUserProfile = cache(async () => {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    // ✅ Lấy thẳng avatar_url và role từ bảng user_profiles
    const { data: profile } = await supabase
        .from("user_profiles")
        .select(`
            id,
            avatar_url,
            role_data:sys_dictionaries!role_id(code),
            type_data:sys_dictionaries!type_id(code)
        `)
        .eq("id", user.id)
        .single();

    const role = (profile?.role_data as any)?.code || "VIEWER";
    const type = (profile?.type_data as any)?.code || "GUEST";

    // Lấy tên từ bảng employees nếu là nhân viên
    let displayName = user.email?.split('@')[0];
    if (type === 'EMPLOYEE') {
        const { data: emp } = await supabase
            .from("employees")
            .select("name")
            .eq("auth_id", user.id)
            .single();
        if (emp) displayName = emp.name;
    }

    return {
        id: user.id,
        name: displayName,
        email: user.email,
        role: role,
        // ✅ Đảm bảo trả về avatar_url lấy từ profile ở trên
        avatar_url: profile?.avatar_url || null
    };
});