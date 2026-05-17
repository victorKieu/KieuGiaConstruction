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
            id: user.id,
            authId: user.id,
            email: user.email,
            name: user.email?.split('@')[0] || "Người dùng",
            role: "VIEWER",
            type: "GUEST",
            avatar_url: null
        };
    }

    // ✅ Thêm toUpperCase() để đảm bảo map đúng tên bảng dù DB nhập chữ thường
    const roleCode = ((profile.role_data as any)?.code || "VIEWER").toUpperCase();
    const typeCode = ((profile.type_data as any)?.code || "GUEST").toUpperCase();

    // 3. Truy vấn ID nghiệp vụ (Entity ID)
    let entityId = null;
    let entityName = profile.name;

    const tableMap: Record<string, string> = {
        'EMPLOYEE': 'employees',
        'CUSTOMER': 'customers',
        'SUPPLIER': 'suppliers'
    };

    const targetTable = tableMap[typeCode];

    if (targetTable) {
        // ✅ FIX LỖI: Đổi "profile_id" thành "id" để khớp với kiến trúc Shared ID của sếp
        const { data: entity, error } = await supabase
            .from(targetTable)
            .select("id, name")
            .eq("id", profile.id) // Tìm bằng ID thay vì profile_id
            .single();

        if (entity) {
            entityId = entity.id;
            entityName = entity.name;
        } else {
            console.error(`[getUserProfile] Không tìm thấy dữ liệu trong bảng ${targetTable} với ID: ${profile.id}`, error?.message);
        }
    }

    return {
        isAuthenticated: true,
        id: user.id,
        authId: user.id,
        profileId: profile.id,
        entityId: entityId,    // Giờ chắc chắn sẽ có ID nhân viên (nếu có trong bảng employees)
        name: entityName || user.email?.split('@')[0] || "Người dùng",
        email: user.email,
        role: roleCode,
        type: typeCode,
        avatar_url: profile.avatar_url || null
    };
});

export const checkIsAdmin = async () => {
    const profile = await getUserProfile();
    return profile?.isAuthenticated && profile.role === 'ADMIN';
};

/**
* Lấy thông tin chi tiết của NHÂN VIÊN (Employee)
* Dùng cho phân hệ: Quản lý dự án, Nhân sự, Giao việc...
*/
export const getEmployeeDetails = cache(async (employeeId: string) => {
    if (!employeeId) return null;
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('employees')
        .select(`
            *,
            department:sys_dictionaries!department_id(name, code),
            position:sys_dictionaries!position_id(name, code)
        `)
        .eq('id', employeeId)
        .single();

    if (error) {
        console.error(`[getEmployeeDetails] Lỗi lấy thông tin nhân viên ${employeeId}:`, error.message);
        return null;
    }
    return data;
});

/**
 * Lấy thông tin chi tiết của KHÁCH HÀNG (Customer / Chủ đầu tư)
 * Dùng cho phân hệ: CRM, Hợp đồng, Thanh toán, Chăm sóc KH...
 */
export const getCustomerDetails = cache(async (customerId: string) => {
    if (!customerId) return null;
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('customers')
        .select(`
            *,
            group:sys_dictionaries!customer_group_id(name, code)
        `)
        .eq('id', customerId)
        .single();

    if (error) {
        console.error(`[getCustomerDetails] Lỗi lấy thông tin khách hàng ${customerId}:`, error.message);
        return null;
    }
    return data;
});

/**
 * Lấy thông tin chi tiết của NHÀ CUNG CẤP / THẦU PHỤ (Supplier / Subcontractor)
 * Dùng cho phân hệ: Mua hàng (Procurement), Kho bãi, Hợp đồng thầu phụ...
 */
export const getSupplierDetails = cache(async (supplierId: string) => {
    if (!supplierId) return null;
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('suppliers')
        .select(`
            *,
            group:sys_dictionaries!supplier_group_id(name, code)
        `)
        .eq('id', supplierId)
        .single();

    if (error) {
        console.error(`[getSupplierDetails] Lỗi lấy thông tin NCC ${supplierId}:`, error.message);
        return null;
    }
    return data;
});

/**
 * HÀM TIỆN ÍCH TỔNG HỢP: Tự động lấy Profile + Detail
 * Phù hợp dùng ở Root Layout hoặc các Page cần Full Data ngay từ đầu
 */
export const getFullUserContext = cache(async () => {
    const profile = await getUserProfile();
    if (!profile || !profile.entityId) return { profile, details: null };

    let details = null;

    switch (profile.type) {
        case 'EMPLOYEE':
            details = await getEmployeeDetails(profile.entityId);
            break;
        case 'CUSTOMER':
            details = await getCustomerDetails(profile.entityId);
            break;
        case 'SUPPLIER':
            details = await getSupplierDetails(profile.entityId);
            break;
    }

    return { profile, details };
});