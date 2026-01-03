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

    // 1. Lấy đồng thời Employee và Avatar từ user_profiles
    const [empRes, profileRes] = await Promise.all([
        supabase
            .from("employees")
            .select("*")
            .eq("auth_id", session.id)
            .single(),
        supabase
            .from("user_profiles")
            .select("avatar_url")
            .eq("id", session.id)
            .single()
    ]);

    const employee = empRes.data;
    const profile = profileRes.data;

    // 2. Kiểm tra dữ liệu nhân viên
    if (empRes.error || !employee) {
        return (
            <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
                <div className="bg-yellow-50 text-yellow-700 p-6 rounded-lg border border-yellow-200">
                    <h2 className="text-xl font-semibold mb-2">⚠️ Chưa liên kết hồ sơ</h2>
                    <p className="text-sm">Tài khoản <strong>{session.email}</strong> chưa có hồ sơ nhân viên.</p>
                </div>
            </div>
        );
    }

    // 3. Gộp dữ liệu ảnh từ profile vào employee
    const combinedData = {
        ...employee,
        avatar_url: profile?.avatar_url || null
    };

    // 4. Lấy dữ liệu Từ điển
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