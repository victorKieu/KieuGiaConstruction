// app/dashboard/layout.tsx (hoặc app/(app)/layout.tsx tùy theo cấu trúc của bạn)
import { AuthProvider } from "@/lib/auth/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader"; // Đây là component Header của bạn
import { getUserProfile, UserProfile } from '@/lib/supabase/getUserProfile'; // Import UserProfile interface

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    // Fetch userProfile ở đây vì DashboardLayout là Server Component.
    const userProfile: UserProfile | null = await getUserProfile();

    return (
        <AuthProvider>
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex flex-col flex-1">
                    {/* Truyền userProfile xuống AppHeader qua props */}
                    <AppHeader userProfile={userProfile} />
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}