// src/app/layout.tsx (ROOT LAYOUT)
import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/providers/theme-provider";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="vi" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
                    {children} {/* AppLayout sẽ được render vào đây */}
                </ThemeProvider>
            </body>
        </html>
    );
}