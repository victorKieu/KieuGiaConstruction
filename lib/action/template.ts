"use server";

import { createClient } from "@/lib/supabase/server";

export async function getContractTemplates() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("contract_templates")
        .select("*")
        .order("name");

    if (error) {
        console.error("Lỗi lấy template:", error);
        return [];
    }
    return data;
}