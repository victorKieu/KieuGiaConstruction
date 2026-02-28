"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

interface EstimateParams {
    projectId: string;
    length: number;
    width: number;
    floors: number;
    foundation: string;
    roof: string;
    wcCount: number;
}

// Hàm tính toán công thức động siêu việt
const evaluateFormula = (formula: string, L: number, W: number, Floors: number, WcCount: number): number => {
    try {
        // Biến chuỗi text "L * W * 0.45" thành lệnh tính toán thực tế
        const evaluator = new Function('L', 'W', 'Floors', 'WcCount', `return ${formula};`);
        const result = evaluator(L, W, Floors, WcCount);
        return parseFloat(result.toFixed(3)); // Làm tròn 3 chữ số
    } catch (error) {
        console.error("🔥 Lỗi giải mã công thức:", formula, error);
        return 0;
    }
};

export async function generateAutoEstimate(params: EstimateParams) {
    const supabase = await createClient();
    const { projectId, length, width, floors, foundation, roof, wcCount } = params;

    console.log(`🚀 [Dynamic Estimate] Đang nội suy dự án: ${projectId}`);

    try {
        // 1. TÌM TEMPLATE PHÙ HỢP TRONG DATABASE
        const { data: template, error: tplError } = await supabase
            .from("auto_estimate_templates")
            .select("id")
            .eq("foundation_type", foundation)
            .eq("is_active", true)
            .limit(1)
            .single();

        if (tplError || !template) throw new Error("Chưa có Dữ liệu Mẫu (Template) cho loại móng này trong Database!");

        // 2. LẤY DANH SÁCH CÔNG TÁC CỦA TEMPLATE ĐÓ
        const { data: tasks, error: tasksError } = await supabase
            .from("auto_estimate_tasks")
            .select("*")
            .eq("template_id", template.id)
            .order("sort_order", { ascending: true });

        if (tasksError || !tasks?.length) throw new Error("Template này chưa có cấu hình công tác nào!");

        // 3. TÍNH TOÁN ĐỘNG (Dùng hàm evaluateFormula)
        const itemsToInsert = tasks.map(task => {
            const calculatedQty = evaluateFormula(task.formula, length, width, floors, wcCount);
            return {
                section: task.section_name,
                item_name: task.item_name,
                norm_code: task.norm_code,
                unit: task.unit,
                quantity: calculatedQty,
                formula_text: task.formula // Lưu lại text công thức để ghi chú
            };
        });

        // 4. ĐỔ DỮ LIỆU VÀO BẢNG QTO CỦA DỰ ÁN
        console.log("🧹 Xóa data QTO cũ...");
        await supabase.from("qto_items").delete().eq("project_id", projectId);

        // -- 4.1 Tạo Thư mục (Sections)
        const uniqueSections = Array.from(new Set(itemsToInsert.map(i => i.section)));
        const sectionMap = new Map();

        for (const sec of uniqueSections) {
            const { data: secData } = await supabase.from("qto_items").insert({
                project_id: projectId,
                item_name: sec,
                unit: "",
                item_type: "section"
            }).select("id").single();
            if (secData) sectionMap.set(sec, secData.id);
        }

        // -- 4.2 Tạo Đầu việc (Tasks) & Diễn giải
        for (const item of itemsToInsert) {
            const parentId = sectionMap.get(item.section);

            const { data: taskData } = await supabase.from("qto_items").insert({
                project_id: projectId,
                parent_id: parentId,
                item_name: item.item_name,
                norm_code: item.norm_code,
                unit: item.unit,
                item_type: "task"
            }).select("id").single();

            if (taskData) {
                await supabase.from("qto_item_details").insert({
                    item_id: taskData.id,
                    project_id: projectId,
                    explanation: `Khối lượng tính theo công thức: ${item.formula_text}`,
                    quantity_factor: item.quantity,
                    length: 0, width: 0, height: 0
                });
            }
        }

        console.log("✅ Đã hoàn thành hệ thống động!");
        revalidatePath('/', 'layout');
        return { success: true, message: `Thành công! Đã nội suy ${itemsToInsert.length} công tác` };

    } catch (e: any) {
        console.error("🔥 Dynamic Estimate Error:", e.message);
        return { success: false, error: e.message };
    }
}