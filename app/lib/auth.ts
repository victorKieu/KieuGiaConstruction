import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type SignUpParams = { email: string; password: string; name: string };

export async function signUpWithEmail({ email, password, name }: SignUpParams) {
    const { error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } }
    });

    if (authError) {
        let errorMessage = authError.message;
        // Xử lý các thông báo lỗi phổ biến, tùy vào Supabase trả về
        if (
            errorMessage.toLowerCase().includes('user') &&
            errorMessage.toLowerCase().includes('already') &&
            (errorMessage.toLowerCase().includes('registered') ||
                errorMessage.toLowerCase().includes('exists') ||
                errorMessage.toLowerCase().includes('exist'))
        ) {
            errorMessage = 'Email này đã được đăng ký tài khoản. Nếu bạn quên mật khẩu, hãy sử dụng chức năng "Quên mật khẩu" để đặt lại.';
        }
        return { error: { message: errorMessage } };
    }

    return { error: null };
}