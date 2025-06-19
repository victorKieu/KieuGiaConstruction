import { AuthProvider } from "@/lib/auth/AuthProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import AppHeader from "@/components/layout/AppHeader";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <AuthProvider>
            <div className="flex h-screen">
                <Sidebar />
                <div className="flex flex-col flex-1">
                    <AppHeader />
                    <main className="flex-1 overflow-y-auto">
                        {children}
                    </main>
                </div>
            </div>
        </AuthProvider>
    );
}