"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";

// 1. Lấy thông tin công ty hiện tại
export async function getCompanySettings() {
    const supabase = await createSupabaseServerClient();
    try {
        const { data, error } = await supabase
            .from('company_settings')
            .select('*')
            .eq('id', 'DEFAULT')
            .single();

        // Lỗi PGRST116 nghĩa là chưa có dòng nào, ta bỏ qua để UI hiển thị form trống
        if (error && error.code !== 'PGRST116') throw error;

        return data || null;
    } catch (error) {
        console.error("Lỗi lấy thông tin công ty:", error);
        return null;
    }
}

// 2. Lưu hoặc Cập nhật thông tin công ty (Upsert)
export async function saveCompanySettings(payload: any) {
    const supabase = await createSupabaseServerClient();
    try {
        // Luôn ép ID là 'DEFAULT' để đảm bảo chỉ có 1 dòng duy nhất trong DB
        const dataToSave = {
            ...payload,
            id: 'DEFAULT',
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('company_settings')
            .upsert(dataToSave, { onConflict: 'id' });

        if (error) throw error;

        return { success: true, message: "Cập nhật thông tin công ty thành công!" };
    } catch (error: any) {
        console.error("Lỗi lưu thông tin công ty:", error);
        return { success: false, error: "Không thể lưu cấu hình. Vui lòng thử lại." };
    }
}