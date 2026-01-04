import { Sidebar } from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { redirect } from "next/navigation";
import AutoLogoutProvider from "@/components/auth/AutoLogoutProvider"; // 1. Import Component tự động logout

export default async function AppLayout({ children }: { children: React.ReactNode }) {
    const session = await getUserProfile();

    if (!session || !session.isAuthenticated) {
        redirect("/login");
    }

    // ✅ Ép kiểu session về 'any' hoặc interface mà Sidebar/AppHeader mong đợi
    const userData = session as any;

    return (
        <AutoLogoutProvider>
            <div className="flex h-screen bg-gray-50">
                <Sidebar user={userData} />
                <div className="flex flex-col flex-1 overflow-hidden">
                    <AppHeader user={userData} />
                    <main className="flex-1 overflow-y-auto p-4 md:p-6">
                        {children}
                    </main>
                </div>
            </div>
        </AutoLogoutProvider>
    );
}