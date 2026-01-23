import { createSupabaseServerClient } from "./server";
import { cache } from "react";

/**
 * Hàm trung tâm lấy thông tin danh tính và phiên làm việc.
 */
export const getUserProfile = cache(async () => {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy thông tin từ Supabase Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) return null;

    // 2. Lấy Profile trung gian kết hợp với Từ điển (Dictionary)
    const { data: profile } = await supabase
        .from("user_profiles")
        .select(`
            id,
            avatar_url,
            name,
            role_data:sys_dictionaries!role_id(code),
            type_data:sys_dictionaries!type_id(code)
        `)
        .eq("auth_id", user.id)
        .single();

    if (!profile) {
        return {
            isAuthenticated: true,
            id: user.id, // Vẫn trả về id để layout không bị lỗi
            authId: user.id,
            email: user.email,
            name: user.email?.split('@')[0] || "Người dùng",
            role: "VIEWER",
            type: "GUEST",
            avatar_url: null
        };
    }

    const roleCode = (profile.role_data as any)?.code || "VIEWER";
    const typeCode = (profile.type_data as any)?.code || "GUEST";

    // 3. Truy vấn ID nghiệp vụ (Entity ID) dựa trên USER_TYPE (Ảnh b1478c)
    let entityId = null;
    let entityName = profile.name;

    const tableMap: Record<string, string> = {
        'EMPLOYEE': 'employees',
        'CUSTOMER': 'customers',
        'SUPPLIER': 'suppliers'
    };

    const targetTable = tableMap[typeCode];

    if (targetTable) {
        const { data: entity } = await supabase
            .from(targetTable)
            .select("id, name")
            .eq("profile_id", profile.id)
            .single();

        if (entity) {
            entityId = entity.id;
            entityName = entity.name;
        }
    }

    // Trả về đối tượng đầy đủ, giữ các key cũ để Sidebar/Header không lỗi
    return {
        isAuthenticated: true,
        id: user.id,           // Key cũ (Auth ID)
        authId: user.id,       // Key rõ nghĩa cho Auth
        profileId: profile.id, // Key cho Profile trung gian
        entityId: entityId,    // Key cho nghiệp vụ (EmployeeID, CustomerID...)
        name: entityName || user.email?.split('@')[0] || "Người dùng",
        email: user.email,
        role: roleCode,        // ADMIN, MANAGER...
        type: typeCode,        // EMPLOYEE, CUSTOMER, SUPPLIER
        avatar_url: profile.avatar_url || null
    };
});

// ✅ THÊM HÀM NÀY VÀO CUỐI FILE
export const checkIsAdmin = async () => {
    const profile = await getUserProfile();
    // Kiểm tra role code là 'ADMIN' (Hoặc mã bạn quy định trong sys_dictionaries)
    return profile?.isAuthenticated && profile.role === 'ADMIN';
};