import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
}

// Hỗ trợ các file import { createSupabaseClient }
export const createSupabaseClient = createClient;

// Hỗ trợ các file import supabase from '@/lib/supabase/client'
const supabase = createClient();
export default supabase;