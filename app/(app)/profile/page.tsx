import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/session";
import { getDictionaryOptions } from "@/lib/action/dictionaryActions";
import { redirect } from "next/navigation";
import ProfileForm from "@/components/profile/ProfileForm";
import PasswordForm from "@/components/profile/PasswordForm";

export default async function ProfilePage() {
    const session = await getCurrentSession();

    if (!session || !session.isAuthenticated) {
        redirect('/login');
    }

    const supabase = await createSupabaseServerClient();

    // 1. Lấy User Profile trước (Dựa vào Auth ID của session)
    // Đây là bước quan trọng để tìm ra ID thật của nhân viên
    const { data: profile, error: profileError } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("auth_id", session.id) // Tìm theo Auth ID
        .single();

    // Nếu không có profile (lỗi hệ thống nghiêm trọng)
    if (profileError || !profile) {
        return <div className="p-6 text-red-500">Lỗi: Không tìm thấy hồ sơ liên kết với tài khoản này.</div>;
    }

    // 2. Lấy thông tin Nhân viên (Dựa vào ID của Profile - Shared ID)
    const { data: employee, error: empError } = await supabase
        .from("employees")
        .select("*")
        .eq("id", profile.id) // ✅ QUAN TRỌNG: Tìm theo ID (Shared ID), không phải auth_id
        .single();

    // 3. Kiểm tra xem người dùng này có phải là nhân viên không?
    // (Vì Customer cũng có Profile nhưng không có trong bảng employees)
    if (empError || !employee) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <div className="bg-yellow-50 text-yellow-700 p-6 rounded-lg border border-yellow-200">
                    <h2 className="text-xl font-semibold mb-2">⚠️ Tài khoản chưa kích hoạt</h2>
                    <p className="text-sm">Bạn chưa có hồ sơ Nhân viên chính thức.</p>
                </div>
            </div>
        );
    }

    // 4. Gộp dữ liệu để đẩy vào Form
    const combinedData = {
        ...employee,
        // Ưu tiên lấy avatar/email từ profile (nơi chứa thông tin đăng nhập chính)
        avatar_url: profile.avatar_url || employee.avatar_url,
        email: profile.email || employee.email,
        name: profile.name || employee.name
    };

    // 5. Lấy dữ liệu Từ điển cho Dropdown
    const [departments, positions, genders, maritalStatuses] = await Promise.all([
        getDictionaryOptions('DEPARTMENT'),
        getDictionaryOptions('POSITION'),
        getDictionaryOptions('GENDER'),
        getDictionaryOptions('MARITAL_STATUS')
    ]);

    return (
        <div className="container mx-auto p-6 max-w-4xl space-y-6">
            <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-800">Hồ sơ cá nhân</h1>
                <p className="text-gray-500 text-sm mt-1">Quản lý thông tin tài khoản và bảo mật.</p>
            </div>

            {/* Khối thông tin cá nhân */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <ProfileForm
                    // Thêm key để React reset form khi dữ liệu thay đổi (quan trọng)
                    key={combinedData.updated_at || 'profile-init'}
                    initialData={combinedData}
                    options={{ departments, positions, genders, maritalStatuses }}
                />
            </div>

            {/* Khối bảo mật/Đổi mật khẩu */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <PasswordForm />
            </div>
        </div>
    );
}