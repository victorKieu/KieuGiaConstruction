"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- CÁC HÀM GET CŨ CỦA BẠN (GIỮ NGUYÊN) ---
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

export async function getAllOpportunities() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from("opportunities")
        .select(`
      *,
      customers ( id, name, avatar_url )
    `)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("[Opportunities Fetch Error]", error);
        return [];
    }
    return data;
}

// =========================================================
// --- BỔ SUNG: ACTION TẠO MỚI & XÓA ---
// =========================================================

// Interface định nghĩa dữ liệu đầu vào
interface CreateOpportunityInput {
    title: string;
    customer_id: string;
    value?: string | number | null; // Form có thể gửi string hoặc number
    stage: string;
    expected_close_date?: string | null;
    description?: string | null;
}

export async function createOpportunityAction(input: CreateOpportunityInput) {
    const supabase = await createClient();

    console.log("--> Action: Creating Opportunity...", input);

    // 1. Xử lý dữ liệu (Sanitize)
    // Rất quan trọng: Chuyển đổi chuỗi rỗng "" thành null để không lỗi DB
    const finalValue = input.value === "" || input.value === null || input.value === undefined
        ? null
        : Number(input.value);

    const finalDate = input.expected_close_date === "" ? null : input.expected_close_date;

    try {
        const { data, error } = await supabase
            .from("opportunities")
            .insert([{
                title: input.title,
                customer_id: input.customer_id,
                value: finalValue,
                stage: input.stage || "new",
                expected_close_date: finalDate,
                description: input.description,
                created_at: new Date().toISOString()
            }])
            .select("id")
            .single();

        if (error) {
            console.error("❌ Database Insert Error:", error);
            // Trả về lỗi chi tiết để Client hiển thị
            return { success: false, error: error.message };
        }

        console.log("✅ Created Opportunity ID:", data.id);

        // Làm mới dữ liệu trang
        revalidatePath(`/crm/customers/${input.customer_id}`);
        revalidatePath("/crm/opportunities");

        return { success: true, id: data.id };

    } catch (e: any) {
        console.error("❌ System Error:", e);
        return { success: false, error: e.message || "Lỗi không xác định" };
    }
}

// Action xóa cơ hội (Hoàn thiện logic placeholder cũ)
export async function deleteOpportunityAction(id: string) {
    const supabase = await createClient();

    try {
        const { error } = await supabase
            .from("opportunities")
            .delete()
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/crm/opportunities");
        return { success: true };
    } catch (error: any) {
        console.error("Delete Opportunity Error:", error);
        return { success: false, error: error.message };
    }
}

// Update Opportunity
export async function updateOpportunityAction(id: string, formData: any) {
    const supabase = await createClient();

    // Xử lý dữ liệu (tương tự hàm Create)
    const payload = {
        title: formData.title,
        customer_id: formData.customer_id,
        value: formData.value ? Number(formData.value) : null,
        stage: formData.stage,
        expected_close_date: formData.expected_close_date || null,
        description: formData.description || null,
        updated_at: new Date().toISOString(),
    };

    try {
        const { error } = await supabase
            .from("opportunities")
            .update(payload)
            .eq("id", id);

        if (error) throw error;

        revalidatePath("/crm/opportunities");
        revalidatePath(`/crm/customers/${formData.customer_id}`);
        return { success: true };

    } catch (e: any) {
        console.error("Update Opportunity Error:", e);
        return { success: false, error: e.message };
    }
}