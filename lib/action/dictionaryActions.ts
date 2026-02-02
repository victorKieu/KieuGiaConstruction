"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface DictionaryFormData {
    id?: string;
    category: string;
    code: string;
    name: string;
    color?: string;
    sort_order?: number;
    meta_data?: string; // JSON string
}

export async function getDictionaryOptions(category: string) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("sys_dictionaries")
        .select("id, code, name, color")
        .eq("category", category)
        .order("sort_order", { ascending: true });

    if (error) {
        console.error(`Lỗi lấy dictionary [${category}]:`, error);
        return [];
    }

    return data || [];
}


export async function upsertDictionary(formData: DictionaryFormData) {
    const supabase = await createSupabaseServerClient();

    // 1. Validate dữ liệu cơ bản
    if (!formData.category || !formData.code || !formData.name) {
        return { success: false, error: "Vui lòng điền đầy đủ thông tin bắt buộc." };
    }

    // 2. Kiểm tra trùng lặp Mã (Code) trong cùng 1 Category
    let query = supabase
        .from("sys_dictionaries")
        .select("id")
        .eq("category", formData.category)
        .eq("code", formData.code);

    // Nếu đang là chế độ Sửa (có ID), thì phải loại trừ chính dòng đang sửa ra khỏi việc check trùng
    if (formData.id) {
        query = query.neq("id", formData.id);
    }

    const { data: existing, error: checkError } = await query;

    if (checkError) {
        return { success: false, error: "Lỗi kiểm tra dữ liệu: " + checkError.message };
    }

    if (existing && existing.length > 0) {
        return { success: false, error: `Mã "${formData.code}" đã tồn tại trong phân hệ này.` };
    }

    // 3. Xử lý an toàn cho Meta Data (JSON Parsing)
    let parsedMetaData = {};
    try {
        if (formData.meta_data && formData.meta_data.trim() !== "") {
            parsedMetaData = JSON.parse(formData.meta_data);
        }
    } catch (e) {
        return { success: false, error: "Meta Data không hợp lệ. Vui lòng nhập đúng định dạng JSON (ví dụ: {})." };
    }

    // 4. Chuẩn bị dữ liệu để lưu
    const payload = {
        category: formData.category,
        code: formData.code,
        name: formData.name,
        color: formData.color,
        sort_order: formData.sort_order || 0,
        meta_data: parsedMetaData,
        updated_at: new Date().toISOString(),
    };

    let error;

    if (formData.id) {
        // Update
        const { error: updateError } = await supabase
            .from("sys_dictionaries")
            .update(payload)
            .eq("id", formData.id);
        error = updateError;
    } else {
        // Insert
        const { error: insertError } = await supabase
            .from("sys_dictionaries")
            .insert([payload]);
        error = insertError;
    }

    if (error) {
        console.error("Lỗi lưu từ điển:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/dictionaries");
    return { success: true };
}

export async function deleteDictionary(id: string) {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase
        .from("sys_dictionaries")
        .delete()
        .eq("id", id);

    if (error) {
        console.error("Error deleting dictionary:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/admin/dictionaries");
    return { success: true };
}

export interface DictionaryItem {
    id: string;
    category: string;
    code: string;
    name: string;
    color?: string;
    sort_order?: number;
    is_active: boolean;
}

/**
 * Lấy danh sách từ điển theo Category (Ví dụ: Lấy list trạng thái dự án để đổ vào Dropdown)
 * @param category Mã nhóm (VD: 'PROJECT_STATUS', 'CONTRACT_TYPE')
 * @param activeOnly Chỉ lấy các mục đang kích hoạt (Mặc định: true)
 */
export async function getDictionaryItems(category: string, activeOnly = true) {
    const supabase = await createSupabaseServerClient();

    let query = supabase
        .from('sys_dictionaries')
        .select('*')
        .eq('category', category)
        .order('sort_order', { ascending: true });

    if (activeOnly) {
        query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
        console.error(`❌ [Dictionary] Lỗi lấy category '${category}':`, error.message);
        return [];
    }

    return data as DictionaryItem[];
}

/**
 * Lấy chi tiết một mục từ điển cụ thể theo Code (Ví dụ: Lấy ID của trạng thái 'PLANNING')
 * @param category Mã nhóm
 * @param code Mã code (VD: 'PLANNING', 'DESIGN')
 */
export async function getDictionaryByCode(category: string, code: string) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from('sys_dictionaries')
        .select('*')
        .eq('category', category)
        .eq('code', code) // Đảm bảo query chính xác code
        .single();

    if (error) {
        // Không log error đỏ nếu lỗi là "PGRST116" (Không tìm thấy - chuyện bình thường)
        if (error.code !== 'PGRST116') {
            console.error(`❌ [Dictionary] Lỗi tìm code '${code}' trong '${category}':`, error.message);
        }
        return null;
    }

    return data as DictionaryItem;
}

/**
 * (Tùy chọn) Hàm lấy Label hiển thị từ Code (Dùng cho Client Component nếu cần map nhanh)
 * Lưu ý: Hàm này gọi DB nên hạn chế dùng trong vòng lặp lớn, nên dùng Map ở Client thì tốt hơn.
 */
export async function getLabelFromDictionary(category: string, code: string) {
    const item = await getDictionaryByCode(category, code);
    return item?.name || code;
}