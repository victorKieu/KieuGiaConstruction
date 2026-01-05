"use server"

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách hợp đồng
export async function getContracts(projectId: string) {
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, data };
}

// 2. Tự động tạo Hợp đồng từ Báo giá (Đã điều chỉnh theo Schema có sẵn)
export async function createContractFromQuotation(quotationId: string, projectId: string) {
    const supabase = await createSupabaseServerClient();

    // A. Lấy thông tin báo giá
    const { data: quote, error: quoteError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

    if (quoteError || !quote) return { success: false, error: "Không tìm thấy báo giá gốc" };

    // B. Chuẩn bị dữ liệu hợp đồng (Khớp với constraints của bạn)
    const contractData = {
        project_id: projectId,
        quotation_id: quotationId, // Cột vừa thêm
        customer_id: quote.client_id,

        // Sinh số HĐ: Thay BG thành HĐ
        contract_number: quote.quotation_number.replace('BG', 'HD'),

        title: `Hợp đồng thi công (Theo BG ${quote.quotation_number})`,
        value: quote.quoted_amount,
        status: 'draft', // Khớp với check constraint ['draft', 'signed'...]

        // Các trường bắt buộc khác theo Schema của bạn
        contract_type: 'service', // Giá trị hợp lệ: 'service', 'supply', 'maintenance', 'consulting'
        contract_category: 'standard', // Giá trị hợp lệ: 'standard', 'vip', 'internal', 'external'

        content: quote.notes || "Các điều khoản theo quy định...",
        signing_date: new Date().toISOString().split('T')[0],

        // created_by sẽ được Supabase tự xử lý nếu có trigger hoặc default, 
        // nhưng nếu cần thiết có thể lấy từ session user.
    };

    // C. Insert vào DB
    const { error } = await supabase.from('contracts').insert(contractData);

    if (error) {
        console.error("Create Contract Error:", error);
        // Xử lý lỗi trùng số hợp đồng (nếu bấm tạo 2 lần)
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
    payment_terms?: string; // Điều khoản thanh toán
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