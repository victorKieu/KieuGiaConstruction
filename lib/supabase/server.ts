import { createClient, SupabaseClient } from "@supabase/supabase-js";
//import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
export function createSupabaseAdminClient(): SupabaseClient {
    if (!supabaseServiceRoleKey) {
        console.error("SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables. Admin operations will fail.");
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing for admin operations.");
    }
    // Sử dụng createClient trực tiếp với Service Role Key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
            persistSession: false, // Quan trọng cho server-side operations
        },
    });
    return supabaseAdmin;
}
