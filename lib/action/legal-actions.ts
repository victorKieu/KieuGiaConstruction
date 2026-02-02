"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// --- HÀM MỚI: CẬP NHẬT VĂN BẢN PHÁP LÝ ---
// --- HÀM MỚI: CẬP NHẬT VĂN BẢN PHÁP LÝ ---
export async function updateLegalDoc(docId: string, data: any) {
    //const session = await getCurrentSession();
    //if (!session.isAuthenticated) return { success: false, error: "Vui lòng đăng nhập." };

    const supabase = await createClient();

    const { error } = await supabase
        .from('project_legal_docs')
        .update({
            doc_code: data.doc_code,
            issue_date: data.issue_date,
            issuing_authority: data.issuing_authority,
            notes: data.notes,
            updated_at: new Date().toISOString()
        })
        .eq('id', docId);

    if (error) return { success: false, error: error.message };

    revalidatePath('/projects');
    return { success: true, message: "Cập nhật văn bản thành công." };
}

// --- PHẦN 1: QUẢN LÝ THÔNG TIN DỰ ÁN (Pháp lý & Quy mô) ---

// Cập nhật thông tin pháp lý chính (Số tờ, Thửa, GPXD, Diện tích...)
export async function updateProjectLegalInfo(projectId: string, legalData: any) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('projects')
        .update({
            land_lot_number: legalData.land_lot_number,
            land_parcel_number: legalData.land_parcel_number,
            construction_permit_code: legalData.construction_permit_code,
            permit_issue_date: legalData.permit_issue_date || null,
            total_floor_area: legalData.total_floor_area,
            num_floors: legalData.num_floors,
            construction_phase: legalData.construction_phase, // Cập nhật giai đoạn (setup -> legal...)
            is_permit_required: legalData.is_permit_required,
            updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

    if (error) {
        console.error("Lỗi update pháp lý:", error);
        return { success: false, error: error.message };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// --- PHẦN 2: QUẢN LÝ HỒ SƠ PHÁP LÝ (Giấy tờ scan) ---

// Lấy danh sách hồ sơ
export async function getProjectLegalDocs(projectId: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('project_legal_docs')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false }); // Sắp xếp mới nhất lên đầu

    if (error) {
        console.error("Error fetching docs:", error);
        return [];
    }

    return data;
}

// Thêm mới hồ sơ (VD: Upload xong thì lưu metadata vào DB)
export async function createLegalDoc(data: any) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('project_legal_docs')
        .insert({
            project_id: data.project_id,
            doc_type: data.doc_type, // GPXD, BAN_VE_XP...
            doc_code: data.doc_code,
            issue_date: data.issue_date || null,
            issuing_authority: data.issuing_authority,
            file_url: data.file_url, // Link file từ Storage (Sẽ làm chức năng upload sau)
            status: 'approved', // Mặc định là Approved nếu PM up lên
            notes: data.notes
        });

    if (error) return { success: false, error: error.message };

    revalidatePath(`/projects/${data.project_id}`);
    return { success: true };
}

// Xóa hồ sơ
export async function deleteLegalDoc(docId: string, projectId: string) {
    const supabase = await createClient();
    const { error } = await supabase.from('project_legal_docs').delete().eq('id', docId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// --- PHẦN 3: NHẬT KÝ THI CÔNG (Dự phòng cho bước sau) ---

export async function getConstructionLogs(projectId: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('construction_logs')
        .select('*, created_by_user:created_by(email)') // Giả sử join để lấy tên người tạo
        .eq('project_id', projectId)
        .order('log_date', { ascending: false });
    return data || [];
}