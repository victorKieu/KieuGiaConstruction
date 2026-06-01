"use server";

import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { revalidatePath } from "next/cache";

export async function createQuickProject(name: string, code: string) {
    const supabase = await createClient();
    const profile = await getUserProfile();

    if (!profile || !profile.entityId) {
        throw new Error("Không thể xác thực danh tính người dùng!");
    }

    // 1. Tạo dự án mới
    const { data: project, error: projectError } = await supabase
        .from("projects")
        .insert({
            name: name,
            code: code,
            status: "DRAFT", // Mặc định là bản nháp
        })
        .select("id")
        .single();

    if (projectError || !project) {
        throw new Error(projectError?.message || "Lỗi khi tạo dự án mới");
    }

    // 2. Tự động cấp quyền ADMIN cho người vừa tạo để không bị khóa ở màn hình Dự toán
    const { error: memberError } = await supabase
        .from("project_members")
        .insert({
            project_id: project.id,
            user_id: profile.entityId, // Bắn ID nhân viên vào
            role_code: "ADMIN",
        });

    if (memberError) {
        console.error("Lỗi cấp quyền:", memberError);
    }

    return project.id;
}

/**
* Kích hoạt phân hệ dự toán cho một dự án đã có sẵn trong hệ thống
*/
export async function initializeProjectEstimation(projectId: string) {
    const supabase = await createClient();
    const profile = await getUserProfile();

    if (!profile || !profile.entityId) {
        throw new Error("Không thể xác thực danh tính người dùng!");
    }

    // Kiểm tra xem nhân viên đã là thành viên dự án chưa, nếu chưa thì thêm vào với quyền ADMIN/QS
    const { data: member } = await supabase
        .from("project_members")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", profile.entityId)
        .maybeSingle();

    if (!member) {
        await supabase
            .from("project_members")
            .insert({
                project_id: projectId,
                user_id: profile.entityId,
                role_code: "ADMIN", // Tự động gán quyền cao nhất cho người khởi tạo hồ sơ dự toán
            });
    }

    revalidatePath("/estimations");
    return projectId;
}

/**
* Xóa sạch toàn bộ dữ liệu bóc tách (QTO) và hao phí dự toán để làm lại từ đầu
*/
export async function resetProjectEstimation(projectId: string) {
    const supabase = await createClient();

    // 1. Quét sạch bảng qto_items (Tự động cascade xóa sạch qto_item_details)
    const { error: qtoError } = await supabase
        .from("qto_items")
        .delete()
        .eq("project_id", projectId);

    if (qtoError) throw new Error(`Lỗi xóa dữ liệu QTO: ${qtoError.message}`);

    // 2. Quét sạch bảng hao phí vật tư & giá vốn công trình
    const { error: estError } = await supabase
        .from("estimation_items")
        .delete()
        .eq("project_id", projectId);

    if (estError) throw new Error(`Lỗi dọn dẹp hao phí: ${estError.message}`);

    // 3. CHỈ XÓA các công việc bên Tiến độ (Tasks) được đẩy sang từ Tiên lượng
    // Lọc bằng cách: Chỉ xóa task có chứa qto_item_id (tức là task sinh ra từ dự toán)
    const { error: taskError } = await supabase
        .from("project_tasks")
        .delete()
        .eq("project_id", projectId)
        .not("qto_item_id", "is", null); // <--- ĐIỀU KIỆN QUAN TRỌNG Ở ĐÂY

    if (taskError) throw new Error(`Lỗi dọn dẹp tiến độ công việc: ${taskError.message}`);

    revalidatePath(`/estimations/${projectId}`);
    revalidatePath("/estimations");
    return { success: true };
}