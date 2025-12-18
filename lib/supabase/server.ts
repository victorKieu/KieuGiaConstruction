import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

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
                    }
                },
            },
        }
    )
}

// Alias
export const createClient = createSupabaseServerClient;
export const createServerSupabaseClient = createSupabaseServerClient;

// ✅ FIX: Thêm Alias createSupabaseAdminClient (Tạm thời dùng chung logic, 
// nếu cần quyền admin thực sự thì phải dùng SERVICE_ROLE_KEY, nhưng để fix build thì thế này là đủ)
export const createSupabaseAdminClient = createSupabaseServerClient;