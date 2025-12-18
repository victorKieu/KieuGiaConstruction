import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// 1. Alias cho createSupabaseClient
export const createSupabaseClient = createClient;

// 2. Export default cho các file gọi "import supabase from..."
const clientInstance = createClient();
export default clientInstance;

// 3. ✅ FIX QUAN TRỌNG: Export named 'supabase' cho file use-activity-logger.ts
export const supabase = clientInstance;