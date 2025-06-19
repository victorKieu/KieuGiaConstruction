import { createServerSupabaseClient } from "@/lib/supabase/server";

/**
 * Xóa một nhân viên khỏi bảng employees theo id.
 * @param id ID của nhân viên cần xóa
 * @returns Trả về đối tượng { data, error }
 */
export async function deleteEmployee(id: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from("employees")
        .delete()
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
}