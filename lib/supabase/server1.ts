import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Hàm chuẩn tạo Client Server
export async function createSupabaseServerClient(token?: string | null) {
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
                    }
                },
            },
            // Nếu có token truyền vào (ví dụ từ API Route), set header Authorization
            global: {
                headers: token ? { Authorization: `Bearer ${token}` } : {},
            },
        }
    )
}

// Alias để fix lỗi import: Nhiều file đang gọi là createClient hoặc createServerSupabaseClient
export const createClient = createSupabaseServerClient;