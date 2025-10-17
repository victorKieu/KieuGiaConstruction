"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { UserProfile } from "@/types/hrm";

/**
 * Lấy thông tin đầy đủ của người dùng đang đăng nhập bằng cách gọi một hàm RPC duy nhất.
 * Hàm này hiệu quả hơn vì nó gộp nhiều truy vấn cơ sở dữ liệu thành một lệnh gọi duy nhất.
 * @returns {Promise<UserProfile | null>} Một đối tượng UserProfile đầy đủ hoặc null nếu không thành công.
 */
export async function getUserProfile(): Promise<UserProfile | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    // Bước 1: Vẫn kiểm tra xem người dùng đã đăng nhập hay chưa để có thông tin cơ bản
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
        console.log("Xác thực thất bại hoặc không có người dùng đăng nhập.");
        return null;
    }

    // Bước 2: Gọi hàm RPC 'get_full_user_profile' để lấy toàn bộ dữ liệu chỉ với MỘT lệnh gọi
    const { data: profileData, error: rpcError } = await supabase
        .rpc('get_full_user_profile');

    if (rpcError) {
        console.error("Lỗi khi gọi RPC get_full_user_profile:", rpcError.message);
        // Trong trường hợp RPC lỗi, chúng ta vẫn có thể trả về thông tin tối thiểu từ auth.users
        // để giao diện người dùng không bị lỗi hoàn toàn.
        return {
            id: user.id,
            email: user.email || null,
            phone: user.phone || null,
            app_metadata: user.app_metadata || {},
            user_metadata: user.user_metadata || {},
            created_at: user.created_at || '', // SỬA LỖI: Cung cấp giá trị mặc định
            updated_at: user.updated_at || '', // SỬA LỖI: Cung cấp giá trị mặc định
            last_sign_in_at: user.last_sign_in_at || null,
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
    }

    if (!profileData) {
        console.log("Hàm RPC không trả về dữ liệu cho người dùng:", user.id);
        return null;
    }

    // Bước 3: Định hình lại dữ liệu JSON trả về từ RPC để khớp hoàn toàn với type UserProfile
    // Dùng toán tử spread (...) để gán tự động các thuộc tính có tên trùng khớp
    const userProfile: UserProfile = {
        ...profileData, // Gán tất cả dữ liệu từ RPC
        id: profileData.id || user.id,
        email: profileData.email || user.email,
        phone: profileData.phone || user.phone,
        profile_id: profileData.id, // ID của profile chính là user ID
        profile_name: profileData.name || profileData.email || 'Người dùng',
        profile_avatar_url: profileData.avatar_url || '/images/default_avatar.png',
        // Các trường khác như contact_email, code, status, v.v.
        // sẽ được tự động gán nếu chúng tồn tại trong `profileData`.
        // Nếu không, chúng sẽ là `undefined`, và chúng ta cần đảm bảo
        // kiểu UserProfile cho phép điều này hoặc cung cấp giá trị mặc định.
    };

    //console.log("UserProfile cuối cùng trả về từ RPC:", userProfile);

    // Ép kiểu cuối cùng để đảm bảo tính nhất quán với kiểu UserProfile đã định nghĩa
    return userProfile as UserProfile;
}

