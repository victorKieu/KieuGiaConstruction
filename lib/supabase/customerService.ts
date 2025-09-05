// lib/supabase/customerService.ts
import supabase from '@/lib/supabase/client';

export async function getCustomerById(id: string) {
    return await supabase.from("customers").select("*").eq("id", id).maybeSingle();
}