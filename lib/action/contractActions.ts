"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách hợp đồng
export async function getContracts(projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('contracts')
        .select('*, customers(name)') // Join thêm tên khách nếu cần
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// 2. Tự động tạo Hợp đồng từ Báo giá (Fix mapping dữ liệu)
export async function createContractFromQuotation(quotationId: string, projectId: string) {
    const supabase = await createSupabaseServerClient();

    // A. Lấy thông tin báo giá nguồn
    const { data: quote, error: quoteError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

    if (quoteError || !quote) return { success: false, error: "Không tìm thấy báo giá gốc" };

    // B. Chuẩn bị dữ liệu hợp đồng
    const contractData = {
        project_id: projectId,
        quotation_id: quotationId,

        // ✅ FIX 1: Map đúng cột customer_id (thay vì client_id)
        customer_id: quote.customer_id || quote.client_id,

        // Sinh số HĐ: Thay BG thành HD
        contract_number: quote.quotation_number ? quote.quotation_number.replace('BG', 'HD') : `HD-${Date.now()}`,

        title: `Hợp đồng thi công (Theo BG ${quote.quotation_number})`,

        // ✅ FIX 2: Lấy đúng cột total_amount (thay vì quoted_amount) -> Fix lỗi giá trị = 0
        value: quote.total_amount || 0,

        status: 'draft',
        contract_type: 'service',
        contract_category: 'standard',
        content: quote.notes || "Các điều khoản theo quy định...",
        signing_date: new Date().toISOString().split('T')[0],
    };

    // C. Insert vào DB
    const { error } = await supabase.from('contracts').insert(contractData);

    if (error) {
        console.error("Create Contract Error:", error);
        if (error.code === '23505') { // Unique violation
            return { success: false, error: "Hợp đồng từ báo giá này đã tồn tại!" };
        }
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

// 4. Định nghĩa kiểu dữ liệu Input
export type ContractInput = {
    id: string;
    contract_number: string;
    title: string;
    content?: string;
    start_date?: string;
    end_date?: string;
    signing_date?: string;
    status: string;
    value: number;
    payment_terms?: string;
};

// 5. Hàm cập nhật hợp đồng
export async function updateContract(data: ContractInput, projectId: string) {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
        .from('contracts')
        .update({
            contract_number: data.contract_number,
            title: data.title,
            content: data.content,
            start_date: data.start_date || null,
            end_date: data.end_date || null,
            signing_date: data.signing_date || null,
            status: data.status,
            value: data.value,
            payment_terms: data.payment_terms,
            updated_at: new Date().toISOString()
        })
        .eq('id', data.id);

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Cập nhật hợp đồng thành công!" };
}