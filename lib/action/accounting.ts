"use server";

import { createClient } from "@/lib/supabase/server";

export async function getGeneralLedgerData() {
    const supabase = await createClient();

    // 1. Lấy chi tiết dòng bút toán và JOIN với Chứng từ, Dự án, Tài khoản
    const { data: journalLines, error } = await supabase
        .from('journal_entry_lines')
        .select(`
            id,
            debit,
            credit,
            description,
            partner_type,
            project_id,
            account_id,
            journal_entries!inner(entry_number, entry_date, status),
            accounting_accounts(id, code, name, account_type),
            projects(id, code, name)
        `)
        .eq('journal_entries.status', 'posted') // Chỉ lấy các bút toán đã ghi sổ
        .order('journal_entries(entry_date)', { ascending: false });

    if (error) {
        console.error("Lỗi truy xuất Sổ cái:", error);
        return { success: false, data: [] };
    }

    // 2. Lấy danh mục dự án (sắp xếp theo mã)
    const { data: projects } = await supabase
        .from('projects')
        .select('id, code, name')
        .order('code', { ascending: true });

    // 3. Lấy danh mục tài khoản (Chỉ lấy tài khoản đang Active và sắp xếp theo mã)
    const { data: accounts } = await supabase
        .from('accounting_accounts')
        .select('id, code, name, account_type')
        .eq('is_active', true)
        .order('code', { ascending: true });

    return {
        success: true,
        journalLines: journalLines || [],
        projects: projects || [],
        accounts: accounts || []
    };
}