"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { contractSchema, ContractFormValues } from "@/lib/schemas/contract";

export async function getAllContracts() {
    const supabase = await createClient();

    // Join bảng customers để hiển thị tên khách hàng
    const { data, error } = await supabase
        .from("contracts")
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
        console.error("[Contracts Fetch Error]", error);
        return [];
    }

    return data;
}

export async function createContractAction(data: ContractFormValues) {
    const supabase = await createClient();

    // 1. Validate
    const validated = contractSchema.safeParse(data);
    if (!validated.success) {
        return { success: false, error: "Dữ liệu không hợp lệ", fields: validated.error.flatten().fieldErrors };
    }

    const {
        contract_number, title, customer_id, value,
        signed_date, start_date, end_date, status, content // <--- Lấy thêm content
    } = validated.data;

    // 2. Insert Database
    const { error } = await supabase.from("contracts").insert({
        contract_number,
        title,
        customer_id,
        value,
        signed_date: signed_date.toISOString(), // Chuyển Date sang ISO String
        start_date: start_date?.toISOString() || null, // Handle null an toàn
        end_date: end_date?.toISOString() || null,     // Handle null an toàn
        status,
        content,
    });

    if (error) {
        console.error("DEBUG ERROR:", error); // Xem lỗi chi tiết trong Terminal VS Code

        // --- SỬA ĐOẠN NÀY ĐỂ TRẢ VỀ LỖI THẬT ---
        return { success: false, error: `Lỗi DB: ${error.message}` };
    }

    revalidatePath("/crm/contracts");
    return { success: true, message: "Tạo hợp đồng thành công" };
}

// --- Hàm lấy chi tiết hợp đồng ---
export async function getContractById(id: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("contracts")
        .select(`
      *,
      customers (
        id, name, email, phone, address, avatar_url
      )
    `)
        .eq("id", id)
        .single();

    if (error) {
        console.error("[Get Contract Detail Error]", error);
        return null;
    }

    return data;
}
