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
        // Nếu có dữ liệu thì mới parse, không thì để rỗng
        if (formData.meta_data && formData.meta_data.trim() !== "") {
            parsedMetaData = JSON.parse(formData.meta_data);
        }
    } catch (e) {
        // Trả về lỗi thân thiện thay vì để Server Crash
        return { success: false, error: "Meta Data không hợp lệ. Vui lòng nhập đúng định dạng JSON (ví dụ: {})." };
    }

    // 4. Chuẩn bị dữ liệu để lưu
    const payload = {
        category: formData.category,
        code: formData.code,
        name: formData.name,
        color: formData.color,
        sort_order: formData.sort_order || 0,
        meta_data: parsedMetaData, // Sử dụng biến đã parse an toàn
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

    // 5. Revalidate lại trang
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