import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// Alias cho các file import tên khác
export const createSupabaseClient = createClient;

// Một số file cũ có thể import biến 'supabase' trực tiếp (Singleton)
// Tuy nhiên trong Next.js mới, nên dùng hàm createClient(). 
// Dòng dưới đây để fix lỗi import, nhưng bạn nên sửa code gọi thành createClient()
export const supabase = createClient();