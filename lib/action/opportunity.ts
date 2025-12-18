"use server";

import { createClient } from "@/lib/supabase/server";

export async function getOpportunitiesByCustomerId(customerId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching opportunities:", error);
        return [];
    }

    return data;
}

// Action xóa cơ hội (Dùng cho nút Delete)
export async function deleteOpportunityAction(id: string) {
    // ... logic xóa tương tự activity ...
}

export async function getAllOpportunities() {
    const supabase = await createClient();

    // Join bảng customers để lấy tên khách hàng hiển thị lên thẻ
    const { data, error } = await supabase
        .from("opportunities")
        .select(`
      *,
      customers (
        id,
        name,
        avatar_url
      )
    `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[Opportunities Fetch Error]", error);
        return [];
    }

    return data;
}