"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Hàm tính toán biểu thức an toàn (Safe Eval)
const evaluateFormula = (formula: string, inputs: Record<string, number>) => {
    try {
        let expr = formula;
        // Thay thế các biến: dai, rong, cao, so_luong
        Object.keys(inputs).forEach(key => {
            const regex = new RegExp(`\\b${key}\\b`, 'g'); // Match chính xác từ
            expr = expr.replace(regex, inputs[key].toString());
        });

        // Loại bỏ ký tự lạ để bảo mật
        if (/[^0-9+\-*/().\s]/.test(expr)) return 0;

        return new Function(`return ${expr}`)();
    } catch (e) {
        console.error("Lỗi công thức:", formula, e);
        return 0;
    }
};

export async function calculateRealEstimate(
    projectId: string,
    templateId: string,
    inputs: { dai: number, rong: number, cao: number, so_luong: number }
) {
    const supabase = await createClient();

    try {
        // 1. Lấy chi tiết các đầu việc trong Hạng mục mẫu
        const { data: templateDetails, error: tplError } = await supabase
            .from('template_details')
            .select(`
                work_item_code,
                formula,
                norm:norm_definitions!inner ( name, unit )
            `)
            .eq('template_id', templateId);

        if (tplError || !templateDetails) throw new Error("Không tìm thấy cấu hình hạng mục.");

        const workItemsToInsert = [];
        let totalResources: any[] = [];

        // 2. Duyệt qua từng đầu việc trong gói (VD: Đào đất, Ván khuôn, Bê tông...)
        for (const task of templateDetails) {
            // A. Tính Khối lượng công việc (Work Volume)
            const workVolume = evaluateFormula(task.formula, inputs) * inputs.so_luong;

            if (workVolume <= 0) continue;

            // Chuẩn bị dữ liệu để Insert vào bảng Dự toán
            workItemsToInsert.push({
                project_id: projectId,
                material_code: task.work_item_code,
                material_name: (task.norm as any).name,
                unit: (task.norm as any).unit,
                quantity: parseFloat(workVolume.toFixed(3)),
                unit_price: 0 // Giá sẽ cập nhật sau
            });

            // B. Phân tích Vật tư (Resource Breakdown) - Bước quan trọng bạn yêu cầu
            // Lấy định mức của đầu việc này
            // Lưu ý: Cần join bảng norm_definitions -> norm_analysis -> materials
            // Để tối ưu, ta query riêng bảng norm_analysis
            const { data: analysis } = await supabase
                .from('norm_analysis')
                .select(`
                    resource_code, 
                    quantity,
                    material:materials!inner ( name, unit, unit_price, type )
                `)
                .eq('norm_id', (await supabase.from('norm_definitions').select('id').eq('code', task.work_item_code).single()).data?.id);

            if (analysis) {
                analysis.forEach(res => {
                    const totalQty = workVolume * res.quantity;
                    totalResources.push({
                        code: res.resource_code,
                        name: (res.material as any).name,
                        unit: (res.material as any).unit,
                        type: (res.material as any).type,
                        qty: totalQty,
                        cost: totalQty * ((res.material as any).unit_price || 0)
                    });
                });
            }
        }

        // 3. Lưu Khối lượng công việc vào Database
        if (workItemsToInsert.length > 0) {
            const { error } = await supabase.from('estimation_items').insert(workItemsToInsert);
            if (error) throw error;
        }

        revalidatePath(`/projects/${projectId}`);

        return {
            success: true,
            message: `Đã bóc tách thành công ${workItemsToInsert.length} đầu việc!`,
            resources: totalResources // Trả về danh sách vật tư để hiển thị Frontend
        };

    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}