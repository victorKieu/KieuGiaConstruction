import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next"; // Đã import
import "./globals.css";

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
                        {/* ✅ THÊM DÒNG NÀY VÀO ĐÂY LÀ XONG NÀY SẾP: */}
                        <SpeedInsights />
                    </AuthProvider>
                </ThemeProvider>
            </body>
        </html>
    );
}