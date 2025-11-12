// components/ui/GlobalLoader.tsx
import Image from 'next/image';

interface GlobalLoaderProps {
    text?: string;
}

/**
 * Component Loading toàn trang với logo Kiều Gia và vòng xoay.
 */
export default function GlobalLoader({ text = "Đang tải..." }: GlobalLoaderProps) {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/70 backdrop-blur-sm">
            <div className="flex flex-col items-center gap-4">

                {/* --- PHẦN FIX: Vòng xoay quanh Logo --- */}

                {/* 1. Container (relative) để căn giữa logo */}
                <div className="relative flex h-20 w-20 items-center justify-center">

                    {/* 2. Vòng xoay (absolute, lớn bằng container)
                           - border-4: Độ dày vòng
                           - border-gray-200: Màu nền của vòng
                           - border-t-blue-600: Màu của phần xoay (Bạn có thể đổi sang màu vàng 'gold' của Kiều Gia)
                           - animate-spin: Hiệu ứng xoay
                    */}
                    <div className="absolute h-full w-full rounded-full border-4 border-solid border-gray-200 border-t-blue-600 animate-spin"></div>

                    {/* 3. Logo (nằm bên trong) */}
                    <Image
                        src="/images/logo.png"
                        alt="Kiều Gia Construction Logo"
                        width={60} // Đặt kích thước nhỏ hơn container (80px)
                        height={60}
                        className="rounded-full" // Tùy chọn: Làm logo tròn cho đẹp
                        priority // Ưu tiên tải ảnh logo
                    />
                </div>
                {/* --- KẾT THÚC FIX --- */}

                <p className="text-lg font-semibold text-gray-700">{text}</p>
            </div>
        </div>
    );
}