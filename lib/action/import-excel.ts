"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import * as XLSX from 'xlsx';

export async function importBOQFromExcel(projectId: string, formData: FormData) {
    const supabase = await createClient();
    
    try {
        const file = formData.get('file') as File;
        if (!file) throw new Error("Không tìm thấy file");

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // 1. Đọc file Excel
        const workbook = XLSX.read(buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0]; // Lấy sheet đầu tiên hoặc loop qua các sheet
        const sheet = workbook.Sheets[sheetName];
        
        // Chuyển sang JSON (Bỏ qua header nếu cần)
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Mảng 2 chiều

        // 2. Parse dữ liệu (Tùy chỉnh theo cột của File Excel FastCons)
        // Giả sử: Cột A=STT, B=Mã, C=Tên, D=ĐVT, E=Khối lượng
        const itemsToInsert = [];
        let currentSection = "Hạng mục chung";

        for (let i = 1; i < rawData.length; i++) { // Bỏ qua dòng header
            const row: any = rawData[i];
            if (!row || row.length === 0) continue;

            // Logic nhận diện Hạng mục (Dòng chỉ có tên, không có đơn vị/khối lượng)
            if (row[2] && !row[3] && !row[4]) { 
                currentSection = row[2].toString(); // Cột C là tên
                continue;
            }

            // Logic nhận diện Công tác
            if (row[2]) { // Phải có tên công tác
                itemsToInsert.push({
                    project_id: projectId,
                    section_name: currentSection,
                    original_name: row[2].toString(), // Lưu tên gốc để đối chiếu
                    unit: row[3] ? row[3].toString() : '',
                    quantity: row[8] ? parseFloat(row[8]) : 0, // Cột Tổng khối lượng (Giả sử cột I)
                    is_mapped: false, // Mặc định chưa khớp mã
                    unit_price: 0 // Chưa có giá
                });
            }
        }

        // 3. Lưu vào Database
        if (itemsToInsert.length > 0) {
            // Xóa cũ (nếu muốn làm mới) hoặc append
            // await supabase.from('estimation_items').delete().eq('project_id', projectId);
            
            const { error } = await supabase.from('estimation_items').insert(itemsToInsert);
            if (error) throw error;
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, count: itemsToInsert.length };

    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}