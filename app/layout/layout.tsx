import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next"; // Đã import
import type { Metadata, Viewport } from "next";
import "./globals.css";

// 1. Cấu hình Viewport để vô hiệu hóa zoom và tràn viền
export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#0f172a", // Màu nền thanh trạng thái (status bar) sếp có thể đổi tùy ý
};

// 2. Cấu hình Metadata để biến Web thành App trên iOS
export const metadata: Metadata = {
    title: "Kiều Gia Construction",
    description: "Hệ thống quản lý Kiều Gia",
    // ĐOẠN CODE QUAN TRỌNG NHẤT ĐỂ ẨN THANH CÔNG CỤ CỦA SAFARI:
    appleWebApp: {
        capable: true, // Cho phép chạy full màn hình như App
        statusBarStyle: "black-translucent", // Làm trong suốt thanh trạng thái trên cùng
        title: "Kiều Gia", // Tên App hiển thị trên màn hình chính
    },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="vi" suppressHydrationWarning>
            <body className="bg-background text-foreground antialiased">
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <AuthProvider>
                        {children}
                        <Toaster />
                        <SpeedInsights />
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}