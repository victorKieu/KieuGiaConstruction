import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);

    // 1. Lấy mã code từ URL của email
    const code = searchParams.get('code');
    // 2. Lấy đích đến tiếp theo (ở đây sẽ là /reset-password)
    const next = searchParams.get('next') ?? '/';

    if (code) {
        const supabase = await createSupabaseServerClient();

        // 3. Thực hiện ĐỔI CODE LẤY SESSION (Lưu vào Cookies)
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error) {
            // 4. Đổi thành công, chuyển hướng người dùng về trang Đổi mật khẩu
            return NextResponse.redirect(`${origin}${next}`);
        }
        console.error("Lỗi đổi code:", error.message);
    }

    // Nếu link hỏng hoặc code hết hạn -> Đuổi về trang Đăng nhập
    return NextResponse.redirect(`${origin}/login?error=Link+đã+hết+hạn+hoặc+không+hợp+lệ`);
}