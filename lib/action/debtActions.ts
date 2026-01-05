"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function getProjectDebts(projectId?: string) {
    const supabase = await createSupabaseServerClient();

    let query = supabase.from('v_contract_debts').select('*');

    if (projectId) {
        query = query.eq('project_id', projectId);
    }

    const { data, error } = await query.order('remaining_debt', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}