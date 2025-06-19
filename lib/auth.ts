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
        // Chuẩn hóa thông báo lỗi trùng email
        let errorMessage = authError.message;
        if (
            authError.message.toLowerCase().includes('user') &&
            authError.message.toLowerCase().includes('already') &&
            authError.message.toLowerCase().includes('registered')
        ) {
            errorMessage = 'Email này đã được đăng ký tài khoản. Nếu bạn quên mật khẩu, hãy sử dụng chức năng "Quên mật khẩu" để đặt lại.';
        }
        return { error: { message: errorMessage } };
    }
    return { error: null };
}

// Đăng ký bằng Google
export function signUpWithGoogle() {
  supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.origin + '/auth/callback',
      queryParams: { access_type: 'offline', prompt: 'consent' }
    }
  });
}

// Đăng ký bằng Facebook
export function signUpWithFacebook() {
  supabase.auth.signInWithOAuth({
    provider: 'facebook',
    options: {
      redirectTo: window.location.origin + '/auth/callback'
    }
  });
}