import { redirect } from 'next/navigation';
import { getUserProfile } from '@/lib/supabase/getUserProfile'; // Đảm bảo đường dẫn này đúng với file của anh

export default async function ProcurementLayout({ children }: { children: React.ReactNode }) {
    // Gọi hàm getUserProfile đã được tối ưu cache của anh
    const profile = await getUserProfile();

    // KIỂM TRA CHÍNH XÁC ROLE IN HOA THEO ĐÚNG TỪ ĐIỂN DỮ LIỆU
    if (!profile || (profile.role !== 'PROCUREMENT' && profile.role !== 'ADMIN')) {
        redirect('/dashboard');
    }

    return (
        <div className="procurement-container">
            {children}
        </div>
    );
}