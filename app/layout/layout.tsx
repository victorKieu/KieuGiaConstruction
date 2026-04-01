import { AuthProvider } from "@/lib/auth/AuthProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    themeColor: "#0f172a",
};

export const metadata: Metadata = {
    title: "Kiều Gia Construction",
    description: "Hệ thống quản lý Kiều Gia",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "Kiều Gia",
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