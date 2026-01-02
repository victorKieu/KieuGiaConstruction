import { Sidebar } from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { redirect } from "next/navigation";
import AutoLogoutProvider from "@/components/auth/AutoLogoutProvider"; // 1. Import Component tự động logout

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Fetch dữ liệu Server
    const userProfile = await getUserProfile();

    // 2. Security Check: BẮT BUỘC NÊN CÓ
    // Nếu không lấy được profile (token hết hạn, user bị xóa...), đá về login ngay.
    // Điều này giúp tránh lỗi render ở AppHeader khi userProfile bị null.
    if (!userProfile) {
        redirect("/login");
    }

    // 3. Render giao diện
    return (
        <div className="flex h-screen overflow-hidden">
            {/* Nhúng AutoLogoutProvider vào đây.
                Vì nó là "Client Component", nó sẽ chạy ngầm bên dưới
                và lắng nghe sự kiện chuột/phím của người dùng.
            */}
            <AutoLogoutProvider />

            {/* Sidebar tĩnh bên trái */}
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header nhận data user truyền xuống */}
                <AppHeader userProfile={userProfile} />

                {/* Khu vực nội dung chính */}
                <main className="flex-1 overflow-y-auto bg-slate-50 p-4">
                    {children}
                </main>
            </div>
        </div>
    );
}