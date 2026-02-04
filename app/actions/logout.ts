"use server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function logout() {
    const supabase = createSupabaseServerClient();
    await supabase.auth.signOut();
}