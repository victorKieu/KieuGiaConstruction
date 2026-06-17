import { getUserProfile } from "@/lib/supabase/getUserProfile";
import RFQDashboardClient from "@/components/procurement/RFQDashboardClient"; // Đảm bảo import đúng đường dẫn
import { redirect } from "next/navigation";

export default async function RFQPage() {
    // 1. Gọi hàm getUserProfile có sẵn của hệ thống
    const profile = await getUserProfile();

    // 2. Chặn truy cập nếu chưa đăng nhập
    if (!profile || !profile.isAuthenticated) {
        redirect("/login");
    }

    // 3. Render giao diện và truyền quyền xuống
    return <RFQDashboardClient userProfile={profile} />;
}