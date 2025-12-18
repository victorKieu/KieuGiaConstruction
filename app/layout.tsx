import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider"; // Giả sử bạn có provider này
import AppHeader from "@/components/layout/AppHeader";
import { Sidebar } from "@/components/layout/Sidebar";
import { getUserProfile } from "@/lib/supabase/getUserProfile"; // Hàm lấy data từ Server

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "Kiều Gia Construction",
    description: "Hệ thống quản lý xây dựng",
};

export default async function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // 1. Fetch dữ liệu ngay tại Server Layout (Nhanh và bảo mật)
    const userProfile = await getUserProfile();

    return (
        <html lang="vi" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <div className="flex h-screen overflow-hidden">
                        {/* Sidebar tĩnh */}
                        <Sidebar />

                        <div className="flex-1 flex flex-col overflow-hidden">
                            {/* 2. Truyền dữ liệu xuống Client Component */}
                            <AppHeader userProfile={userProfile} />

                            <main className="flex-1 overflow-y-auto bg-background p-4">
                                {children}
                            </main>
                        </div>
                    </div>
                </ThemeProvider>
            </body>
        </html>
    );
}