import type { Metadata } from 'next';

// Named export cho metadata
export const metadata: Metadata = {
    title: 'Đăng ký nhà cung cấp - Kiều Gia Construction',
};

// Default export cho Component chính
export default function SupplierRegisterPage() {
    return (
        <div className="container mx-auto">
            <h1>Form Đăng Ký</h1>
            {/* Component logic */}
        </div>
    );
}