"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { refreshProjectStatusBasedOnContracts } from "@/lib/action/workflowActions";

// --- TYPE DEFINITIONS ---
export type ContractInput = {
    id?: string;
    contract_number: string;
    title: string;
    content?: string;
    start_date?: string;
    end_date?: string;
    signing_date?: string;
    status: string;
    value: number;
    payment_terms?: string;
    contract_type?: string;
    is_addendum?: boolean;
    parent_id?: string | null;
    customer_name?: string;
    project_id?: string; // Bổ sung để type chặt chẽ hơn
    customer_id?: string;
};

// --- 1. LẤY DANH SÁCH HỢP ĐỒNG (THEO DỰ ÁN) ---
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

// --- 2. LẤY TẤT CẢ HỢP ĐỒNG (CHO CRM) ---
export async function getAllContracts() {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('contracts')
        .select(`
            *, 
            customers(name),            
            projects!project_id(name) 
        `)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("❌ Lỗi lấy danh sách HĐ (CRM):", error.message);
        return { success: false, error: error.message };
    }

    return { success: true, data };
}

// --- 3. TẠO HỢP ĐỒNG (FORM THỦ CÔNG) ---
export async function createContract(data: any) {
    const supabase = await createSupabaseServerClient();

    try {
        const { error } = await supabase.from('contracts').insert({
            contract_number: data.contract_number,
            title: data.title,
            customer_id: data.customer_id,
            project_id: data.project_id, // Bắt buộc
            contract_type: data.contract_type?.toLowerCase() || 'construction',
            value: data.value,
            status: data.status || 'draft',
            content: data.content,
            signing_date: data.signing_date,
            start_date: data.start_date,
            end_date: data.end_date,
            is_addendum: data.is_addendum || false,
            parent_id: data.parent_id || null,
        });

        if (error) throw error;

        // ✅ Trigger Update Status
        if (data.project_id) {
            await refreshProjectStatusBasedOnContracts(data.project_id);
            revalidatePath(`/projects/${data.project_id}`);
        }

        revalidatePath('/crm/contracts');
        return { success: true, message: "Tạo hợp đồng thành công!" };
    } catch (error: any) {
        console.error("Lỗi tạo hợp đồng:", error);
        return { success: false, error: error.message };
    }
}

// --- 4. TẠO HỢP ĐỒNG TỪ BÁO GIÁ (TỰ ĐỘNG) ---
export async function createContractFromQuotation(quotationId: string, projectId: string) {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy thông tin báo giá
    const { data: quote, error: quoteError } = await supabase
        .from('quotations')
        .select('*')
        .eq('id', quotationId)
        .single();

    if (quoteError || !quote) return { success: false, error: "Không tìm thấy báo giá gốc" };

    // 2. Chuẩn bị dữ liệu hợp đồng
    const contractData = {
        project_id: projectId,
        quotation_id: quotationId,
        customer_id: quote.customer_id || quote.client_id,
        contract_number: quote.quotation_number ? quote.quotation_number.replace('BG', 'HD') : `HD-${Date.now()}`,
        title: `Hợp đồng thi công (Theo BG ${quote.quotation_number})`,
        value: quote.total_amount || 0,
        status: 'draft',
        contract_type: 'construction', // Mặc định là thi công
        contract_category: 'standard',
        content: quote.notes || "Các điều khoản theo quy định...",
        signing_date: new Date().toISOString().split('T')[0],
    };

    // 3. Insert vào DB
    const { error } = await supabase.from('contracts').insert(contractData);

    if (error) {
        console.error("Create Contract Error:", error);
        return { success: false, error: error.message };
    }

    // ✅ Trigger Update Status (Tuy là draft nhưng cứ chạy check cho chắc)
    await refreshProjectStatusBasedOnContracts(projectId);

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã tạo hợp đồng thành công!" };
}

// --- 5. CẬP NHẬT HỢP ĐỒNG (CÓ FIX PROJECT ID) ---
export async function updateContract(data: ContractInput, projectIdFromArgs?: string) {
    const supabase = await createSupabaseServerClient();

    try {
        // 1. Tự tìm projectId nếu thiếu
        let projectId = projectIdFromArgs || data.project_id;

        if (!projectId) {
            const { data: current } = await supabase
                .from('contracts')
                .select('project_id')
                .eq('id', data.id)
                .single();
            projectId = current?.project_id;
        }

        // 2. Chuẩn hóa dữ liệu
        let dbContractType = data.contract_type?.toLowerCase();
        if (!dbContractType || dbContractType === 'service') dbContractType = 'construction';

        // 3. Update DB
        const { error } = await supabase
            .from('contracts')
            .update({
                contract_number: data.contract_number,
                title: data.title,
                value: data.value,
                status: data.status,
                contract_type: dbContractType,
                content: data.content,
                signing_date: data.signing_date,
                start_date: data.start_date,
                end_date: data.end_date,
                is_addendum: data.is_addendum,
                parent_id: data.parent_id,
                updated_at: new Date().toISOString(),
            })
            .eq('id', data.id);

        if (error) throw error;

        // ✅ Trigger Update Status
        if (projectId) {
            console.log(`🔄 HĐ ${data.id} đã sửa. Tính lại status Project ${projectId}...`);
            await refreshProjectStatusBasedOnContracts(projectId);
            revalidatePath(`/projects/${projectId}`);
        }

        revalidatePath('/crm/contracts');
        return { success: true, message: "Cập nhật thành công!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- 6. XÓA HỢP ĐỒNG (CÓ FIX PROJECT ID) ---
export async function deleteContract(contractId: string, projectIdFromArgs?: string) {
    const supabase = await createSupabaseServerClient();

    try {
        // 1. Tự tìm projectId trước khi xóa
        let projectId = projectIdFromArgs;
        if (!projectId) {
            const { data: contract } = await supabase
                .from('contracts')
                .select('project_id')
                .eq('id', contractId)
                .single();
            projectId = contract?.project_id;
        }

        // 2. Xóa
        const { error } = await supabase.from('contracts').delete().eq('id', contractId);
        if (error) throw error;

        // ✅ Trigger Update Status
        if (projectId) {
            console.log(`🗑️ Đã xóa HĐ ${contractId}. Tính lại status Project ${projectId}...`);
            await refreshProjectStatusBasedOnContracts(projectId);
            revalidatePath(`/projects/${projectId}`);
        }

        revalidatePath('/crm/contracts');
        return { success: true, message: "Đã xóa hợp đồng!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}