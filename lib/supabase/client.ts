import { createBrowserClient } from '@supabase/ssr'

// 1. Định nghĩa Type cho biến global
declare global {
    var __supabaseInstance: ReturnType<typeof createBrowserClient> | undefined;
}

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// 2. Alias (để tương thích code cũ)
export const createSupabaseClient = createClient;

// 3. Logic Singleton (Chống tạo nhiều instance khi Dev Hot Reload)
let clientInstance: ReturnType<typeof createBrowserClient>;

if (process.env.NODE_ENV === "production") {
    // Production: Tạo mới bình thường
    clientInstance = createClient();
} else {
    // Development: Kiểm tra trong globalThis trước
    if (!globalThis.__supabaseInstance) {
        globalThis.__supabaseInstance = createClient();
    }
    clientInstance = globalThis.__supabaseInstance;
}

// 4. Export instance duy nhất
export const supabase = clientInstance;

// 5. Export default
export default clientInstance;