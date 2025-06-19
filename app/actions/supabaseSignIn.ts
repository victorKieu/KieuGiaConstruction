"use server";
import { supabase } from "@/lib/supabase/client";

export async function supabaseSignIn(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: error.message };
    return { user: data.user };
}