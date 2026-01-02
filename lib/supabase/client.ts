import { createBrowserClient } from '@supabase/ssr'

// 1. Khai báo Type cho globalThis
declare global {
    var __supabaseInstance: ReturnType<typeof createBrowserClient> | undefined;
}

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// 2. Alias
export const createSupabaseClient = createClient;

// 3. Logic Singleton (SỬA LỖI global -> globalThis)
let clientInstance: ReturnType<typeof createBrowserClient>;

if (process.env.NODE_ENV === "production") {
    clientInstance = createClient();
} else {
    // 👇 Thay 'global' bằng 'globalThis'
    if (!globalThis.__supabaseInstance) {
        globalThis.__supabaseInstance = createClient();
    }
    clientInstance = globalThis.__supabaseInstance;
}

export default clientInstance;

// 4. Export named
export const supabase = clientInstance;