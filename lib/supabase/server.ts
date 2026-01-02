import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// 1. Client dành cho Server Component / Server Action (Dùng Anon Key - Tuân thủ RLS)
export async function createSupabaseServerClient() {
    const cookieStore = await cookies()

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch {
                        // Server Component không thể set cookie, bỏ qua lỗi này
                        // (Chỉ Server Action hoặc Middleware mới set được)
                    }
                },
            },
        }
    )
}

// 2. Client dành cho Admin (Dùng Service Role Key - Bỏ qua RLS)
// ⚠️ CẢNH BÁO: Chỉ dùng trong Server Action hoặc API Route. KHÔNG dùng ở Client Component.
export async function createAdminClient() {
    const cookieStore = await cookies()

    // Nếu chưa có biến môi trường SERVICE_ROLE_KEY, fallback về client thường để không crash app
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll()
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        )
                    } catch { }
                },
            },
        }
    )
}

// --- ALIASES (Để tương thích với code cũ) ---

// Alias ngắn gọn
export const createClient = createSupabaseServerClient;
export const createServerSupabaseClient = createSupabaseServerClient;

// ✅ Alias Admin: Hiện tại trỏ vào hàm createAdminClient ở trên.
// Nếu bạn chưa set SUPABASE_SERVICE_ROLE_KEY trong .env, nó sẽ chạy như client thường (an toàn).
export const createSupabaseAdminClient = createAdminClient;