import { AuthProvider } from "@/lib/auth/AuthProvider"; // ✅ FIX: Thêm dấu ngoặc nhọn {}
import { ThemeProvider } from "@/components/theme-provider"; // Component theme đã tạo ở bước trước
import { Toaster } from "@/components/ui/sonner";
import "./globals.css"; // Đảm bảo import CSS

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="vi" suppressHydrationWarning>
            {/* Thêm class bg-background text-foreground để chuẩn Dark Mode */}
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
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}