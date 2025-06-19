import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export function createSupabaseServerClient(access_token: string | null): SupabaseClient {
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
        global: {
            headers: {
                Authorization: access_token ? `Bearer ${access_token}` : "",
            },
        },
    });
    return supabase;
}
