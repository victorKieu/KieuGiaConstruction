"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách Nhật ký (Mới nhất lên đầu)
export async function getConstructionLogs(projectId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('construction_logs')
        .select('*')
        .eq('project_id', projectId)
        // CHỈ SẮP XẾP THEO LOG_DATE NHƯ BẠN YÊU CẦU
        .order('log_date', { ascending: false });

    if (error) {
        console.error("Lỗi lấy nhật ký:", JSON.stringify(error, null, 2));
        return [];
    }
    return data || [];
}

// 2. Tạo Nhật ký mới
export async function createConstructionLog(data: any) {
    const supabase = await createClient();

    // Kiểm tra user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này." };
    }

    try {
        const { error } = await supabase
            .from('construction_logs')
            .insert({
                project_id: data.project_id,
                log_date: data.log_date,
                weather: data.weather,
                // Ép kiểu an toàn: Nếu rỗng hoặc lỗi thì về 0
                manpower_count: Number(data.manpower_count) || 0,
                work_description: data.work_description,
                issues: data.issues || null,
                images: data.images || [],
                created_by: user.id
            });

        if (error) {
            console.error("Supabase Error:", error); // Log lỗi ra terminal server để debug
            throw new Error(error.message);
        }

        revalidatePath(`/projects/${data.project_id}`);
        return { success: true };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 3. Cập nhật Nhật ký (MỚI)
export async function updateConstructionLog(logId: string, projectId: string, data: any) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    try {
        const { error } = await supabase
            .from('construction_logs')
            .update({
                log_date: data.log_date,
                weather: data.weather,
                manpower_count: Number(data.manpower_count) || 0,
                work_description: data.work_description,
                issues: data.issues || null,
                images: data.images || [], // Cập nhật mảng ảnh mới
                // created_by không đổi
            })
            .eq('id', logId)
            .eq('created_by', user?.id); // Chỉ người tạo mới được sửa (bảo mật thêm)

        if (error) throw new Error(error.message);

        revalidatePath(`/projects/${projectId}`);
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// 4. Xóa Nhật ký (Giữ nguyên)
export async function deleteConstructionLog(logId: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('construction_logs').delete().eq('id', logId);
    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}