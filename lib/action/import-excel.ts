"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as XLSX from 'xlsx';

export async function importBOQFromExcel(projectId: string, formData: FormData) {
    const supabase = await createSupabaseServerClient();

    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error("Không tìm thấy file");

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 1. Đọc file Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Chuyển sang JSON dạng mảng 2 chiều (Header = 1)
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // 2. Lấy danh sách các đầu mục ĐÃ CÓ trong DB để kiểm tra trùng (Tránh thêm lại cái đã có)
        const { data: existingItems } = await supabase
            .from("estimation_items")
            .select("original_name")
            .eq("project_id", projectId);

        // Tạo Set chứa tên các mục đã có (chuẩn hóa lowercase để so sánh chính xác)
        const existingNames = new Set(existingItems?.map(i => i.original_name?.trim().toLowerCase()) || []);

        const itemsToInsert: any[] = [];
        let currentSection = "Hạng mục chung"; // Giá trị mặc định

        // Bắt đầu duyệt từ dòng 2 (index 1) để bỏ qua Header
        for (let i = 1; i < rawData.length; i++) {
            const row: any = rawData[i];
            if (!row || row.length === 0) continue;

            // Cấu trúc cột Excel: 
            // A[0]:STT | B[1]:Mã | C[2]:Tên | D[3]:ĐVT | ... | I[8]:Khối lượng | J[9]:Đơn giá

            const colMa = row[1] ? row[1].toString().trim() : null; // Mã có thể null
            const colTen = row[2] ? row[2].toString().trim() : "";
            const colDVT = row[3] ? row[3].toString().trim() : "";

            // --- LOGIC NHẬN DIỆN HẠNG MỤC (Giữ nguyên từ code cũ của bạn) ---
            // Nếu có Tên, nhưng KHÔNG có Mã và KHÔNG có ĐVT -> Coi là Tiêu đề Hạng mục (VD: I. SƠN NƯỚC)
            if (colTen && !colMa && !colDVT) {
                currentSection = colTen;
                continue; // Bỏ qua dòng này, không insert vào DB
            }

            // --- LOGIC XỬ LÝ CÔNG TÁC ---
            if (colTen) {
                // 1. KIỂM TRA TRÙNG: Nếu tên công việc đã có trong dự án rồi thì bỏ qua
                if (existingNames.has(colTen.toLowerCase())) {
                    continue;
                }

                const quantity = row[8] ? parseFloat(row[8]) : 0;
                const unitPrice = row[9] ? parseFloat(row[9]) : 0;

                itemsToInsert.push({
                    project_id: projectId,
                    section_name: currentSection, // Gán hạng mục hiện tại cho công tác

                    // Lưu dữ liệu vào DB
                    material_code: colMa,       // Lưu mã từ Excel (nếu có), nếu không để null (DB phải cho phép null)
                    material_name: colTen,      // Lưu tên vào cột material_name
                    original_name: colTen,      // Lưu tên gốc để đối chiếu lần sau

                    unit: colDVT || '',         // Lưu ĐVT
                    quantity: quantity,
                    unit_price: unitPrice,

                    is_mapped: false,
                    // total_cost: Không gửi lên, DB tự tính (Generated Column)
                });
            }
        }

        // 3. Thực hiện Insert (Chỉ thêm những dòng mới)
        if (itemsToInsert.length > 0) {
            const { error } = await supabase.from('estimation_items').insert(itemsToInsert);
            if (error) {
                console.error("Supabase Insert Error:", error);
                throw new Error("Lỗi lưu dữ liệu: " + error.message);
            }
        }

        revalidatePath(`/projects/${projectId}`);

        return {
            success: true,
            count: itemsToInsert.length,
            message: itemsToInsert.length > 0
                ? `Đã bổ sung thành công ${itemsToInsert.length} đầu mục mới!`
                : "Dữ liệu đã đầy đủ, không có mục mới nào cần bổ sung."
        };

    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}

// ==============================================================================
// PHẦN 3: TẠO MỚI (CREATE) - BỔ SUNG
// ==============================================================================

export async function createMaterialRequest(projectId: string, data: any) {
    const supabase = await createSupabaseServerClient();

    // 1. Lấy thông tin người đang đăng nhập (Requester)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Vui lòng đăng nhập." };

    // Lấy ID nhân viên tương ứng với User ID (giả sử bảng employees có cột user_id hoặc email)
    // Hoặc lấy từ session entityId nếu bạn đã setup custom claims
    // Ở đây tôi giả định lấy theo user.id hoặc entityId được truyền vào data (nếu có)

    // Nếu bạn chưa có logic map User -> Employee, hãy tạm thời dùng user.id hoặc 1 id cố định để test
    // const requesterId = user.id; 

    // Kiểm tra xem data có gửi requester_id không, nếu không thì phải query lấy
    let requesterId = data.requester_id;
    if (!requesterId) {
        const { data: emp } = await supabase.from('employees').select('id').eq('email', user.email).single();
        requesterId = emp?.id;
    }

    if (!requesterId) return { success: false, error: "Không tìm thấy thông tin nhân viên của bạn." };

    try {
        // 2. Tạo Header (Phiếu yêu cầu)
        // Tạo mã phiếu tự động: PR-{YYYYMMDD}-{Random}
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
        const randomSuffix = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        const code = `PR-${dateStr}-${randomSuffix}`;

        const { data: request, error: reqError } = await supabase
            .from('material_requests')
            .insert({
                project_id: projectId,
                code: code,
                requester_id: requesterId,
                status: 'pending', // Mới tạo thì luôn là pending
                note: data.note || '',
                expected_date: data.expected_date || null
            })
            .select()
            .single();

        if (reqError) throw new Error(reqError.message);

        // 3. Tạo Items (Chi tiết)
        if (data.items && data.items.length > 0) {
            const itemsToInsert = data.items.map((item: any) => ({
                request_id: request.id,
                material_code: item.code || null, // ✅ Cho phép null
                material_name: item.name,
                unit: item.unit,
                quantity: parseFloat(item.quantity) || 0,
                // Không insert total_cost nếu là generated column
            }));

            const { error: itemError } = await supabase
                .from('material_request_items')
                .insert(itemsToInsert);

            if (itemError) throw new Error("Lỗi lưu chi tiết: " + itemError.message);
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Gửi yêu cầu thành công!", requestId: request.id };

    } catch (e: any) {
        console.error("Create Request Error:", e);
        return { success: false, error: e.message };
    }
}