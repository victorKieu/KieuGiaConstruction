import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cache } from "react";

export const getUserProfile = cache(async () => {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy User ID
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return null;

    // 2. Query thông tin Profile + Join Role + Join Type
    // Lưu ý: Thay 'user_types' bằng tên bảng thực tế chứa định nghĩa type_id của bạn
    const { data: profile, error: profileError } = await supabase
        .from("user_profiles") // Hoặc 'employees'
        .select(`
            *,
            roles:role_id ( name ),     
            type:type_id ( code, id ) 
        `)
        // 👆 Join thêm bảng type để lấy code phân biệt
        .eq("id", user.id)
        .single();

    if (profileError) {
        console.error("Lỗi lấy profile:", profileError.message);
        return null;
    }

    // 3. XỬ LÝ LOGIC ROLE (QUAN TRỌNG)
    let finalRole = "anonymous";

    // Ép kiểu để TS không báo lỗi
    const typeData = profile.type as any;
    const roleData = profile.roles as any;

    const typeCode = typeData?.code?.toUpperCase() || ""; // Ví dụ: 'EMPLOYEE', 'CUSTOMER'

    if (typeCode === 'CUSTOMER') {
        // Nếu là Khách hàng -> Gán luôn role là 'customer'
        finalRole = "customer";
    } else if (typeCode === 'SUPPLIER') {
        // Nếu là Nhà cung cấp -> Gán luôn role là 'supplier'
        finalRole = "supplier";
    } else {
        // Nếu là Nhân viên (hoặc code rỗng mặc định coi là nhân viên) -> Lấy theo role_id
        finalRole = roleData?.name?.toLowerCase() || "employee";
    }

    // 4. Trả về kết quả
    return {
        ...user,
        ...profile,
        // Gán đè role_name hiển thị (cho đẹp)
        display_role: typeCode === 'EMPLOYEE' ? roleData?.name : typeData?.name,
        // Role dùng để phân quyền (logic code)
        role: finalRole
    };
});