// app/(app)/profile/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile } from '@/lib/supabase/getUserProfile';
import { redirect } from "next/navigation";
import ProfileForm from '@/components/profile/ProfileForm'; // Import component vừa tạo ở Bước 1

export default async function ProfilePage() {
    const supabase = await createSupabaseServerClient();

    // 1. Kiểm tra đăng nhập
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        redirect('/login'); // Nếu chưa đăng nhập thì đẩy về login
    }

    // 2. Lấy dữ liệu Profile từ Database
    const userProfile = await getUserProfile();

    // 3. Kiểm tra dữ liệu Profile
    if (!userProfile) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <div className="text-center">
                    <h2 className="text-xl font-semibold text-red-500">Không tìm thấy hồ sơ</h2>
                    <p className="text-gray-500">Vui lòng liên hệ quản trị viên.</p>
                </div>
            </div>
        );
    }

    // 4. Truyền dữ liệu vào Client Component
    return (
        <div className="container mx-auto p-6 max-w-5xl">
            <h1 className="text-3xl font-bold mb-6 text-slate-800">Hồ sơ cá nhân</h1>

            {/* Đây là nơi initialData được truyền vào */}
            <ProfileForm initialData={userProfile} />
        </div>
    );
}