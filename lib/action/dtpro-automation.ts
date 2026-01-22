"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Interface khớp với các ô nhập liệu của dtPro
interface GlobalParams {
    // Kích thước
    width: number;
    length: number;
    num_floors: number;
    floor_height: number;

    // Tùy chọn kỹ thuật
    soil_type: 'tot' | 'yeu'; // Đất tốt/yếu
    pile_length: number; // Chiều sâu ép cọc
    wall_type: '10' | '20';
    roof_type: 'tole' | 'btct';
}

// Hàm an toàn để tính công thức
const safeEval = (formula: string, vars: Record<string, number>) => {
    try {
        let expr = formula;
        Object.keys(vars).forEach(key => {
            expr = expr.replace(new RegExp(`\\b${key}\\b`, 'g'), vars[key].toString());
        });
        return new Function(`return ${expr}`)();
    } catch { return 0; }
};

export async function runDtProAutomation(projectId: string, params: GlobalParams) {
    const supabase = await createClient();

    try {
        // 1. TÍNH TOÁN CÁC BIẾN TOÀN CỤC (DERIVED VARIABLES)
        const S_san_tret = params.width * params.length;
        const P_nha = (params.width + params.length) * 2;
        const S_tong_san = S_san_tret * params.num_floors;
        const H_nha = params.floor_height * params.num_floors;

        // Tập hợp biến để nạp vào công thức SQL
        const contextVariables = {
            S_san_tret,
            S_tong_san,
            P_nha,
            H_nha,
            chieu_sau_coc: params.pile_length || 0,
            width: params.width,
            length: params.length
        };

        // 2. XÁC ĐỊNH DANH SÁCH GÓI THẦU CẦN THỰC HIỆN (LOGIC ENGINE)
        // Đây là bước "Thông minh" nhất: Tự chọn Template
        let templateCodes = ['TPL.PHAN_THAN', 'TPL.HOAN_THIEN']; // Mặc định phải có

        // Logic chọn móng
        if (params.soil_type === 'yeu') {
            templateCodes.push('TPL.MONG_COC');
        } else {
            templateCodes.push('TPL.MONG_BANG');
        }

        // 3. THỰC THI (QUÉT DATABASE ĐỂ LẤY CÔNG TÁC & ĐỊNH MỨC)
        const estimationItems = [];

        // Lấy chi tiết của TẤT CẢ các template được chọn
        const { data: details } = await supabase
            .from('template_details')
            .select(`
                formula,
                work_item_code,
                template:construction_templates!inner(code),
                norm:norm_definitions!inner(name, unit)
            `)
            .in('template.code', templateCodes);

        if (!details) throw new Error("Không tìm thấy dữ liệu mẫu.");

        // 4. CHẠY CÔNG THỨC & TÍNH TOÁN
        for (const task of details) {
            // Tính khối lượng từ công thức trong DB + Biến toàn cục vừa tính
            const quantity = safeEval(task.formula, contextVariables);

            if (quantity > 0) {
                // Tính đơn giá vốn từ định mức (Vật tư + Nhân công + Máy)
                // (Logic này tái sử dụng lại phần tra bảng norm_analysis)
                const { data: analysis } = await supabase
                    .from('norm_analysis')
                    .select('quantity, resource:materials(unit_price)')
                    .eq('norm_id', (await supabase.from('norm_definitions').select('id').eq('code', task.work_item_code).single()).data?.id);

                let unitPrice = 0;
                if (analysis) {
                    unitPrice = analysis.reduce((sum, item) => sum + (item.quantity * ((item.resource as any)?.unit_price || 0)), 0);
                }

                estimationItems.push({
                    project_id: projectId,
                    section_name: (task.template as any).code === 'TPL.MONG_COC' ? 'Phần Móng' : 'Phần Thân & Hoàn thiện', // Tự chia nhóm
                    material_code: task.work_item_code,
                    material_name: (task.norm as any).name,
                    unit: (task.norm as any).unit,
                    quantity: parseFloat(quantity.toFixed(3)),
                    unit_price: unitPrice,
                    dimensions: contextVariables // Lưu lại các biến đã dùng để tham khảo
                });
            }
        }

        // 5. LƯU KẾT QUẢ
        // Xóa dự toán cũ
        await supabase.from('estimation_items').delete().eq('project_id', projectId);
        // Insert mới
        if (estimationItems.length > 0) {
            await supabase.from('estimation_items').insert(estimationItems);
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: `Đã tự động lập dự toán cho ${S_tong_san}m2 sàn!` };

    } catch (e: any) {
        console.error(e);
        return { success: false, error: e.message };
    }
}