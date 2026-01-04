// app/(app)/loading.tsx
import GlobalLoader from "@/components/ui/GlobalLoader";

export default function Loading() {
    // Component này sẽ tự động được Next.js hiển thị khi
    // Server Component (trang mới) đang fetch dữ liệu.

    return <GlobalLoader text="Đang tải trang..." />;
}   