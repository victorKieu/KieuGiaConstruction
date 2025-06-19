import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function updateEmployee(id: string, updates: Record<string, any>) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from("employees")
        .update(updates)
        .eq("id", id)
        .single();
    if (error) throw error;
    return data;
}