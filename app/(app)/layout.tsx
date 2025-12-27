import { Sidebar } from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { redirect } from "next/navigation"; // Thêm để xử lý bảo mật

// Đổi tên thành AppLayout cho đúng ngữ nghĩa (không phải RootLayout)
export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. Fetch dữ liệu Server
    const userProfile = await getUserProfile();

    // 2. (Optional) Security Check: Nếu chưa login, đá về trang login ngay tại đây
    // if (!userProfile) {
    //   redirect("/login");
    // }

    // 3. Render giao diện Dashboard (Sidebar + Header + Content)
    // KHÔNG có html, body, ThemeProvider (những cái này để ở Root Layout)
    return (
        <div className="flex h-screen overflow-hidden">
            {/* Sidebar tĩnh bên trái */}
            <Sidebar />

            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header nhận data user truyền xuống */}
                <AppHeader userProfile={userProfile} />

                {/* Khu vực nội dung chính (thay đổi theo page) */}
                <main className="flex-1 overflow-y-auto bg-background p-4">
                    {children}
                </main>
            </div>
        </div>
    );
}