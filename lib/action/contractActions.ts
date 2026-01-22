"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách hợp đồng
export async function getContracts(projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('contracts')
        .select('*, customers(name)')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// 2. Tự động tạo Hợp đồng từ Báo giá
export async function createContractFromQuotation(quotationId: string, projectId: string) {
    const supabase = await createSupabaseServerClient();

    const { data: quote, error: quoteError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

    if (quoteError || !quote) return { success: false, error: "Không tìm thấy báo giá gốc" };

    const contractData = {
        project_id: projectId,
        quotation_id: quotationId,
        customer_id: quote.customer_id || quote.client_id,
        contract_number: quote.quotation_number ? quote.quotation_number.replace('BG', 'HD') : `HD-${Date.now()}`,
        title: `Hợp đồng thi công (Theo BG ${quote.quotation_number})`,
        value: quote.total_amount || 0,
        status: 'draft',
        contract_type: 'service',
        contract_category: 'standard',
        content: quote.notes || "Các điều khoản theo quy định...",
        signing_date: new Date().toISOString().split('T')[0],
    };

    const { error } = await supabase.from('contracts').insert(contractData);

    if (error) {
        console.error("Create Contract Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã tạo hợp đồng thành công!" };
}

// 3. Xóa hợp đồng
export async function deleteContract(id: string, projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from('contracts').delete().eq('id', id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa hợp đồng" };
}

// 4. ĐỊNH NGHĨA LẠI KIỂU DỮ LIỆU INPUT (Bổ sung is_addendum, parent_id)
export type ContractInput = {
    id?: string; // Cho phép null khi tạo mới
    contract_number: string;
    title: string;
    content?: string;
    start_date?: string;
    end_date?: string;
    signing_date?: string;
    status: string;
    value: number;
    payment_terms?: string;

    // ✅ CÁC TRƯỜNG MỚI CHO PHỤ LỤC
    is_addendum?: boolean;
    parent_id?: string | null;
    customer_name?: string; // Trường ảo, không lưu DB
};

// 5. HÀM CẬP NHẬT / TẠO MỚI (Sử dụng Upsert để linh hoạt)
export async function updateContract(data: ContractInput, projectId: string) {
    const supabase = await createSupabaseServerClient();

    // Chuẩn bị payload
    const payload: any = {
        project_id: projectId, // Đảm bảo luôn có project_id
        contract_number: data.contract_number,
        title: data.title,
        content: data.content,
        start_date: data.start_date || null,
        end_date: data.end_date || null,
        signing_date: data.signing_date || null,
        status: data.status,
        value: data.value,
        payment_terms: data.payment_terms,
        updated_at: new Date().toISOString(),

        // ✅ QUAN TRỌNG: Lưu thông tin phụ lục
        is_addendum: data.is_addendum || false,
        parent_id: data.parent_id || null
    };

    // Nếu có ID -> Update, Nếu không -> Insert (Dùng Upsert cho gọn)
    if (data.id) {
        payload.id = data.id;
    }

    const { error } = await supabase
        .from('contracts')
        .upsert(payload) // Dùng upsert thay vì update để hỗ trợ cả tạo mới
        .select();

    if (error) {
        console.error("Save Contract Error:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã lưu hợp đồng thành công!" };
}