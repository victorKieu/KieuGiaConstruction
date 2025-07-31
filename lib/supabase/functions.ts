// lib/supabase/functions.ts
"use server"; // Đây là Server Function

import { createSupabaseServerClient } from './server';
import { cookies } from "next/headers";

/**
 * Calls the Supabase SQL function 'get_user_role' to determine the current user's role
 * based on their auth.users.raw_app_meta_data.
 * This function uses a Supabase client that respects Row Level Security (RLS).
 *
 * @returns The role name (string) if found, otherwise null.
 */
export async function get_user_role(): Promise<string | null> {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    // Gọi hàm RPC (Remote Procedure Call) để thực thi SQL function
    // Đảm bảo SQL function 'get_user_role' trong Supabase của bạn đọc từ raw_app_meta_data
    const { data, error } = await supabase.rpc('get_user_role');

    if (error) {
        console.error('Error calling get_user_role RPC:', error);
        return null;
    }

    // Hàm SQL function `get_user_role()` trả về text, nên `data` sẽ là string
    return data;
}