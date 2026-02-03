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

        const itemsToInsert: any[] = [];
        let currentSection = "Hạng mục chung";

        // Bắt đầu duyệt từ dòng 2 (index 1) để bỏ qua Header
        for (let i = 1; i < rawData.length; i++) {
            const row: any = rawData[i];
            if (!row || row.length === 0) continue;

            // Cấu trúc cột Excel: 
            // A[0]:STT | B[1]:Mã | C[2]:Tên | D[3]:ĐVT | E[4]:Dài | F[5]:Rộng | G[6]:Cao | H[7]:Hệ số | I[8]:Khối lượng | J[9]:Đơn giá

            const colMa = row[1] ? row[1].toString().trim() : "";
            const colTen = row[2] ? row[2].toString().trim() : "";
            const colDVT = row[3] ? row[3].toString().trim() : "";
            // Logic nhận diện Hạng mục: Có Tên, KHÔNG có ĐVT, KHÔNG có Khối lượng (hoặc Dài/Rộng)
            // Sửa logic nhận diện: Nếu chỉ có Tên (C) mà không có Mã (B) và ĐVT (D) -> Là tiêu đề hạng mục
            if (colTen && !colMa && !colDVT) {
                currentSection = colTen;
                continue;
            }

            // Logic nhận diện Công tác: Phải có Tên + Mã (vì DB yêu cầu not null)
            // Nếu file Excel thiếu mã, ta có thể sinh mã tạm hoặc bỏ qua. Ở đây ta yêu cầu phải có Tên.
            if (colTen) {
                // Xử lý Mã hiệu: Nếu trống thì lấy tên viết tắt hoặc mã tạm (để tránh lỗi DB)
                const finalMaterialCode = colMa || `GEN-${i}`;

                itemsToInsert.push({
                    project_id: projectId,
                    section_name: currentSection,

                    // ✅ Map đúng vào các cột bắt buộc của DB
                    material_code: finalMaterialCode, // Cột B
                    material_name: colTen,            // Cột C
                    original_name: colTen,            // Lưu tên gốc

                    unit: colDVT || 'cái',            // Cột D (DB not null nên default 'cái')
                    quantity: row[8] ? parseFloat(row[8]) : 0, // Cột I (Index 8)
                    unit_price: row[9] ? parseFloat(row[9]) : 0, // Cột J (Index 9)

                    is_mapped: false,
                    // total_cost là cột GENERATED ALWAYS trong DB, không cần insert
                });
            }
        }

        // 3. Lưu vào Database (Sử dụng upsert hoặc insert)
        if (itemsToInsert.length > 0) {
            // Tùy chọn: Xóa dữ liệu cũ của dự án trước khi import
            // await supabase.from('estimation_items').delete().eq('project_id', projectId);

            const { error } = await supabase.from('estimation_items').insert(itemsToInsert);
            if (error) {
                console.error("Supabase Insert Error:", error);
                throw new Error("Lỗi lưu dữ liệu: " + error.message);
            }
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, count: itemsToInsert.length };

    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}