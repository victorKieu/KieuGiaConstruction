import { ThemeProvider } from "@/components/providers/theme-provider"
import "@/app/globals.css"
import { ToasterProvider } from "@/components/ui/toaster-provider";
import GlobalProjectShortcut from "@/components/projects/GlobalProjectShortcut";
export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        // suppressHydrationWarning BẮT BUỘC phải có ở thẻ html khi dùng next-themes
        <html lang="vi" suppressHydrationWarning>
            <head />
            <body>
                <ThemeProvider
                    attribute="class" // Sử dụng class 'dark' của Tailwind
                    defaultTheme="system" // Tương ứng với chế độ Auto
                    enableSystem={true} // Bật tính năng lắng nghe cài đặt hệ điều hành
                    disableTransitionOnChange // Ngăn hiệu ứng CSS transition chạy khi mới load trang gây giật
                >
                    {children}
                    {/* ✅ BƯỚC 2: Đặt Toaster ở đây để nó có thể hiển thị đè lên trên mọi trang */}
                    <ToasterProvider />
                    <GlobalProjectShortcut />
                </ThemeProvider>
            </body>
        </html>
    )
}