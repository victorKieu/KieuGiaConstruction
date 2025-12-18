// lib/supabase/functions.ts
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cache } from "react";

export const get_user_role = cache(async () => {
    console.log(`[🔎 GET_USER_ROLE] Đang khởi tạo Supabase Client...`);

    // Nhớ có await như đã fix
    const supabase = await createSupabaseServerClient();

    try {
        console.log(`[🔎 GET_USER_ROLE] Đang gọi RPC 'get_user_role'...`);

        const { data, error } = await supabase.rpc('get_user_role');

        if (error) {
            console.error('[🔎 GET_USER_ROLE] ❌ Lỗi RPC:', error.message);
            return null;
        }

        console.log(`[🔎 GET_USER_ROLE] ✅ Kết quả RPC trả về: "${data}"`);
        return data as string;

    } catch (err: any) {
        console.error('[🔎 GET_USER_ROLE] 💥 Lỗi ngoại lệ (Exception):', err.message || err);
        return null;
    }
});