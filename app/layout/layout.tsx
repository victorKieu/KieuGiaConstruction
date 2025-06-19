import AuthProvider from "@/lib/auth/AuthProvider";

export default function RootLayout({ children }) {
    return (
        <html lang="vi">
            <body>
                <AuthProvider>
                    {children}
                </AuthProvider>
            </body>
        </html>
    )
}