import supabase from '@/lib/supabase/client'; // Đảm bảo bạn đang sử dụng client singleton
//import { getUserProfile } from '@/lib/supabase/getUserProfile'; // Import hàm lấy vai trò

type SignUpParams = {
    email: string;
    password: string;
    name: string;
    role?: 'customer' | 'supplier' | 'employee' | string;
};

export async function signUpUserAndHandleRedirect({ email, password, name, role = 'customer' }: SignUpParams) {
    const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                name,
                role
            }
        }
    });

    console.log('Supabase signUp response data:', data);
    console.log('Supabase signUp response error:', authError);

    if (authError) {
        return { success: false, message: authError.message };
    }

    if (data.user) {
        // KHÔNG CẦN INSERT VÀO BẢNG CUSTOMERS Ở ĐÂY NỮA
        // BẢN GHI CUSTOMERS SẼ ĐƯỢC TẠO KHI USER ĐĂNG NHẬP VÀ CẬP NHẬT LẦN ĐẦU

        if (data.session) {
            console.log('Đăng ký thành công và đăng nhập.');
            // Chuyển hướng đến trang profile của user để họ tự điền thông tin
            return { success: true, user: data.user, redirectToOnboarding: true }; // Hoặc redirectToProfileEdit
        } else {
            console.log('Đăng ký thành công! Vui lòng kiểm tra email để xác minh.');
            return { success: true, user: data.user, message: 'Đăng ký thành công! Vui lòng kiểm tra email của bạn để xác minh tài khoản.', redirectToOnboarding: true }; // Hoặc redirectToProfileEdit
        }
    }

    return { success: false, message: 'Có lỗi không xác định xảy ra trong quá trình đăng ký. Vui lòng thử lại.' };
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