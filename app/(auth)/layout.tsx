export default function AuthLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // Chỉ đơn giản là container full màn hình, nền trắng
    return (
        <div className="min-h-screen w-full bg-background">
            {children}
        </div>
    );
}