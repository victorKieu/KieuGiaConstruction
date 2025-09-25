// lib/actions/authActions.ts
"use server";

import { cookies } from "next/headers";
//import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";

// --- Giao diện dữ liệu (Interfaces) ---
// Định nghĩa lại các interfaces cần thiết cho file này hoặc import từ một file chung nếu có

// Giao diện chung cho các phản hồi từ Server Action
interface ActionResponse {
    success: boolean;
    message?: string;
    error?: string;
    userId?: string | null;
    url?: string;
}

// --- Auth & User Management Actions ---

/**
 * Lấy thông tin người dùng hiện tại từ session Supabase.
 */
export async function getCurrentUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
        console.error("Lỗi Supabase trong getCurrentUser:", error?.message);
        return null;
    }
    return user;
}

/**
 * Tạo tài khoản người dùng (auth.users) cho một nhân viên mới bằng quyền admin.
 */
export async function createEmployeeAuthUser(formData: FormData): Promise<ActionResponse> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const employeeCode = (formData.get("employeeCode") as string) || null;

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
            full_name: fullName,
            role: 'employee',
            employee_code: employeeCode,
        },
    });

    if (userError) {
        console.error("Lỗi khi tạo tài khoản xác thực cho nhân viên:", userError.message);
        return { success: false, error: userError.message, userId: null };
    }
    return { success: true, message: "Tài khoản người dùng đã được tạo.", userId: userData.user.id };
}

/**
 * Đăng ký tài khoản mới cho Khách hàng (email/password).
 */
export async function signUpCustomer(email: string, password: string): Promise<ActionResponse> {
    const supabase = createSupabaseServerClient(null);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { role: 'customer' },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
    });

    if (signUpError) {
        console.error("Lỗi khi đăng ký tài khoản khách hàng:", signUpError.message);
        return { success: false, error: signUpError.message };
    }

    const user = signUpData.user;
    if (user?.id) {
        const { error: customerError } = await supabase
            .from('customers')
            .insert({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name || user.email?.split('@')[0] || "Khách hàng mới",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (customerError) {
            console.error("Lỗi khi tạo hồ sơ khách hàng:", customerError.message);
            return { success: false, error: `Không thể tạo hồ sơ khách hàng: ${customerError.message}.` };
        }
    }
    return { success: true, message: "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận." };
}

/**
 * Đăng ký tài khoản mới cho Nhà cung cấp (email/password).
 */
export async function signUpSupplier(formData: FormData): Promise<ActionResponse> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const companyName = formData.get("companyName") as string;

    const supabase = createSupabaseServerClient(null);

    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: {
                role: 'supplier',
                company_name: companyName,
            },
            emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
        },
    });

    if (signUpError) {
        console.error("Lỗi khi đăng ký tài khoản nhà cung cấp:", signUpError.message);
        return { success: false, error: signUpError.message };
    }

    const user = signUpData.user;
    if (user?.id) {
        const { error: supplierError } = await supabase
            .from('suppliers')
            .insert({
                id: user.id,
                email: user.email,
                name: user.user_metadata?.company_name || user.email?.split('@')[0] || "Nhà cung cấp mới",
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            });

        if (supplierError) {
            console.error("Lỗi khi tạo hồ sơ nhà cung cấp:", supplierError.message);
            return { success: false, error: `Không thể tạo hồ sơ nhà cung cấp: ${supplierError.message}.` };
        }
    }
    return { success: true, message: "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận." };
}

/**
 * Đăng nhập/đăng ký bằng OAuth (Google/Facebook).
 */
export async function signInWithOAuth(provider: 'google' | 'facebook', role: 'customer' | 'supplier' = 'customer'): Promise<ActionResponse> {
    const supabase = createSupabaseServerClient(null);

    const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
            redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`,
            queryParams: {
                access_type: 'offline',
                prompt: 'consent',
            },
        },
    });

    if (error) {
        console.error(`Lỗi khi đăng nhập với ${provider}:`, error.message);
        return { success: false, error: error.message };
    }

    return { success: true, url: data.url };
}