// app/profile/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getUserProfile, UserProfile } from '@/lib/supabase/getUserProfile';
import { cookies } from "next/headers";
import ProfileForm from '@/components/profile/ProfileForm'; // Chúng ta sẽ tạo component này sau

export default async function ProfilePage() {
    const cookieStore = cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        // Redirect hoặc hiển thị lỗi nếu người dùng chưa đăng nhập
        // Trong thực tế, bạn có thể redirect về trang đăng nhập
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-xl text-red-500">Bạn cần đăng nhập để xem hồ sơ.</p>
            </div>
        );
    }

    // Fetch userProfile chi tiết từ Server Action
    const userProfile: UserProfile | null = await getUserProfile();

    if (!userProfile) {
        return (
            <div className="flex items-center justify-center h-screen">
                <p className="text-xl text-gray-500">Không thể tải thông tin hồ sơ.</p>
            </div>
        );
    }

    return (
        <div className="container mx-auto p-6">
            <h1 className="text-3xl font-bold mb-6">Thông tin cá nhân</h1>
            {/* Truyền userProfile xuống Client Component để hiển thị và chỉnh sửa */}
            <ProfileForm initialData={userProfile} />
        </div>
    );
}