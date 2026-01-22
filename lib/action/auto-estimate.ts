"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Hàm tính toán biểu thức chuỗi an toàn (VD: "5 * 20 * 0.5" -> 50)
const evaluateFormula = (formula: string, params: Record<string, number>) => {
    try {
        let expression = formula;
        // Thay thế tên biến bằng giá trị (VD: 'width' -> 5)
        Object.keys(params).forEach(key => {
            // Dùng Regex để thay thế chính xác từ khóa (tránh thay nhầm substring)
            const regex = new RegExp(`\\b${key}\\b`, 'g');
            expression = expression.replace(regex, params[key].toString());
        });

        // Chỉ cho phép các ký tự toán học an toàn
        if (/[^0-9+\-*/().\s]/.test(expression)) {
            console.warn(`Công thức chứa ký tự lạ: ${expression}`);
            return 0;
        }

        // Sử dụng Function constructor thay vì eval để an toàn hơn chút
        return new Function(`return ${expression}`)();
    } catch (e) {
        console.error("Lỗi tính công thức:", formula, e);
        return 0;
    }
};

export async function generateDynamicEstimate(projectId: string, inputParams: Record<string, number>, categories: string[]) {
    const supabase = await createClient();

    try {
        // 1. Lưu thông số đầu vào vào bảng project_parameters để tái sử dụng
        // Xóa cũ
        await supabase.from('project_parameters').delete().eq('project_id', projectId);

        // Insert mới (Chuyển object params thành mảng rows)
        const paramRows = Object.entries(inputParams).map(([key, value]) => ({
            project_id: projectId,
            param_name: key,
            param_value: value,
            param_group: 'input'
        }));

        if (paramRows.length > 0) {
            await supabase.from('project_parameters').insert(paramRows);
        }

        // 2. Lấy danh sách công thức từ Database dựa trên Category được chọn
        // VD: Nếu chọn "Xây mới" -> lấy category IN ('mong_bang', 'than', 'hoan_thien')
        // VD: Nếu chọn "Sửa WC" -> lấy category = 'sua_chua_wc'
        const { data: formulas, error: formulaError } = await supabase
            .from('qto_formulas')
            .select('*')
            .in('category', categories);

        if (formulaError || !formulas) throw new Error("Không tìm thấy bộ công thức phù hợp.");

        // 3. Chạy vòng lặp tính toán (Engine)
        const estimateItems = formulas.map(f => {
            const qty = evaluateFormula(f.formula_string, inputParams);
            return {
                project_id: projectId,
                material_code: f.work_item_code,
                material_name: f.name,
                unit: f.unit,
                quantity: parseFloat((qty || 0).toFixed(2)),
                unit_price: 0, // Giá cập nhật sau
            };
        });

        // 4. Lưu kết quả
        // Xóa dự toán cũ
        await supabase.from('estimation_items').delete().eq('project_id', projectId);
        // Insert mới
        if (estimateItems.length > 0) {
            const { error: insertError } = await supabase.from('estimation_items').insert(estimateItems);
            if (insertError) throw insertError;
        }

        revalidatePath(`/projects/${projectId}`);
        return {
            success: true,
            message: `Đã tính toán ${estimateItems.length} công tác dựa trên ${formulas.length} công thức!`
        };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}