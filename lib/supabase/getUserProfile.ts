// lib/supabase/getUserProfile.ts
"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

// Đảm bảo interface UserProfile được định nghĩa hoặc import đúng cách
// Nếu bạn muốn giữ nó ở đây:
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


export async function getUserProfile(): Promise<UserProfile | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
        console.error("Lỗi khi lấy thông tin user từ Auth:", userError);
        return null;
    }

    if (!user) {
        console.log("Không có user nào đang đăng nhập.");
        return null;
    }

    // Khởi tạo đối tượng profile kết quả với các giá trị mặc định từ Auth User
    let userProfile: UserProfile = {
        id: user.id,
        email: user.email || null, // Đảm bảo email cũng có thể là null
        phone: user.phone || null, // Ép undefined thành null
        app_metadata: user.app_metadata || {},
        user_metadata: user.user_metadata || {},
        created_at: user.created_at || '', // Ép thành chuỗi rỗng nếu undefined
        updated_at: user.updated_at || '', // Ép thành chuỗi rỗng nếu undefined
        last_sign_in_at: user.last_sign_in_at || null, // Ép undefined thành null
        user_type: null,
        permission_role_name: null,
        profile_id: null,
        profile_name: user.email || 'Người dùng',
        profile_avatar_url: '/images/default_avatar.png',
        contact_email: null,
        contact_phone: null,
        contact_address: null,
        tax_code: null,
        code: null,
        status: null,
    };

    // --- Bước 1: Lấy loại người dùng từ public.user_roles ---
    const { data: userRoleData, error: userRoleError } = await supabase
        .from("user_profiles")
        .select("user_types(code)")
        .eq("id", user.id) // sửa lại đúng cột khóa chính
        .single();
            
    if (userRoleError && userRoleError.code !== "PGRST116") {
        console.error("Lỗi khi lấy user_type:", userRoleError.message);
        return userProfile;
    }
        
    if (userRoleData?.user_types?.code) {
        userProfile.user_type = userRoleData.user_types.code as "employee" | "customer" | "supplier";
        console.log(`Loại người dùng được xác định từ user_types: ${userProfile.user_type}`);
    } else {
        console.log(`Không tìm thấy loại người dùng trong user_types cho user ID: ${user.id}. Trả về profile cơ bản.`);
        return userProfile;
    }

    // --- Bước 2 & 3: Lấy thông tin profile cụ thể và vai trò phân quyền ---
    switch (userProfile.user_type) {
        case 'employee':
            const { data: employeeProfile, error: employeeError } = await supabase
                .from('employees')
                .select(`
          id, code, name, position, status, email, phone, hire_date, department, salary, manager_id,
          birth_date, avatar_url, rank, role_id, address, tax_code, gender,
          roles(name)
        `)
                .eq('id', user.id)
                .single();

            if (employeeProfile) {
                userProfile.profile_id = employeeProfile.id || null;
                userProfile.profile_name = employeeProfile.name || user.email || null;
                userProfile.permission_role_name = Array.isArray(employeeProfile.roles)
                    ? employeeProfile.roles[0]?.name || null
                    : (employeeProfile.roles as { name: string | null })?.name || null; // Cập nhật kiểu cho roles.name
                userProfile.profile_avatar_url = employeeProfile.avatar_url || '/images/default_avatar.png';

                userProfile.contact_email = employeeProfile.email || null;
                userProfile.contact_phone = employeeProfile.phone || null;
                userProfile.contact_address = employeeProfile.address || null;
                userProfile.tax_code = employeeProfile.tax_code || null;
                userProfile.code = employeeProfile.code || null;
                userProfile.status = employeeProfile.status || null;

                userProfile.birth_date = employeeProfile.birth_date || null;
                userProfile.gender = employeeProfile.gender || null;
                userProfile.position = employeeProfile.position || null;
                userProfile.department = employeeProfile.department || null;
                userProfile.hire_date = employeeProfile.hire_date || null;
                userProfile.rank = employeeProfile.rank || null;

                console.log(`Tìm thấy profile nhân viên. Vai trò phân quyền: ${userProfile.permission_role_name}`);
            } else if (employeeError && employeeError.code !== 'PGRST116') {
                console.error("Lỗi khi lấy profile nhân viên:", employeeError.message);
            }
            break;

        case 'customer':
            const { data: customerProfile, error: customerError } = await supabase
                .from('customers')
                .select(`
          id, name, code, email, phone, address, contact_person, tax_code, notes,
          avatar_url, birthday, facebook, zalo, gender, note, owner_id, source, status, tag_id, type, website,
          roles(name)
        `)
                .eq('id', user.id)
                .single();

            if (customerProfile) {
                userProfile.profile_id = customerProfile.id || null;
                userProfile.profile_name = customerProfile.name || user.email || null;
                userProfile.permission_role_name = Array.isArray(customerProfile.roles)
                    ? customerProfile.roles[0]?.name || null
                    : (customerProfile.roles as { name: string | null })?.name || null;
                userProfile.profile_avatar_url = customerProfile.avatar_url || '/images/default_avatar.png';

                userProfile.contact_email = customerProfile.email || null;
                userProfile.contact_phone = customerProfile.phone || null;
                userProfile.contact_address = customerProfile.address || null;
                userProfile.tax_code = customerProfile.tax_code || null;
                userProfile.code = customerProfile.code || null;
                userProfile.status = customerProfile.status || null;

                userProfile.birth_date = customerProfile.birthday || null;
                userProfile.gender = customerProfile.gender || null;
                userProfile.contact_person = customerProfile.contact_person || null;
                userProfile.notes = customerProfile.notes || (customerProfile as any).note || null;
                userProfile.facebook = customerProfile.facebook || null;
                userProfile.zalo = customerProfile.zalo || null;
                userProfile.type = customerProfile.type || null;
                userProfile.website = customerProfile.website || null;
                userProfile.owner_id = customerProfile.owner_id || null;
                userProfile.source = customerProfile.source || null;
                userProfile.tag_id = customerProfile.tag_id || null;

                console.log(`Tìm thấy profile khách hàng. Vai trò phân quyền: ${userProfile.permission_role_name}`);
            } else if (customerError && customerError.code !== 'PGRST116') {
                console.error("Lỗi khi lấy profile khách hàng:", customerError.message);
            }
            break;

        case 'supplier':
            const { data: supplierProfile, error: supplierError } = await supabase
                .from('suppliers')
                .select(`
          id, name, code, email, phone, address, contact_person, tax_code, notes,
          avatar_url, status, payment_terms, bank_account, bank_name,
          roles(name)
        `)
                .eq('id', user.id)
                .single();

            if (supplierProfile) {
                userProfile.profile_id = supplierProfile.id || null;
                userProfile.profile_name = supplierProfile.name || user.email || null;
                userProfile.permission_role_name = Array.isArray(supplierProfile.roles)
                    ? supplierProfile.roles[0]?.name || null
                    : (supplierProfile.roles as { name: string | null })?.name || null;
                userProfile.profile_avatar_url = supplierProfile.avatar_url || '/images/default_avatar.png';

                userProfile.contact_email = supplierProfile.email || null;
                userProfile.contact_phone = supplierProfile.phone || null;
                userProfile.contact_address = supplierProfile.address || null;
                userProfile.tax_code = supplierProfile.tax_code || null;
                userProfile.code = supplierProfile.code || null;
                userProfile.status = supplierProfile.status || null;

                userProfile.contact_person = supplierProfile.contact_person || null;
                userProfile.notes = supplierProfile.notes || null;
                userProfile.payment_terms = supplierProfile.payment_terms || null;
                userProfile.bank_account = supplierProfile.bank_account || null;
                userProfile.bank_name = supplierProfile.bank_name || null;

                console.log(`Tìm thấy profile nhà cung cấp. Vai trò phân quyền: ${userProfile.permission_role_name}`);
            } else if (supplierError && supplierError.code !== 'PGRST116') {
                console.error("Lỗi khi lấy profile nhà cung cấp:", supplierError.message);
            }
            break;

        default:
            console.log(`Loại người dùng '${userProfile.user_type}' được tìm thấy trong user_roles nhưng không có logic profile tương ứng.`);
            break;
    }
    console.log("UserProfile cuối cùng trả về:", userProfile); // Log toàn bộ userProfile trước khi return
    return userProfile;
}