"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { analyzeSingleQTOItem } from "./estimationActions";

interface EstimateParams {
    projectId: string;
    length: number;
    width: number;
    floors: number;
    foundation: string;
    roof: string;
    wcCount: number;
}

const evaluateFormula = (formula: string, L: number, W: number, Floors: number, WcCount: number): number => {
    try {
        if (!formula || formula.trim() === "") return 0;
        const evaluator = new Function('L', 'W', 'Floors', 'WcCount', `return ${formula};`);
        const result = evaluator(L, W, Floors, WcCount);
        return parseFloat(result.toFixed(3));
    } catch (error) {
        console.error("🔥 Lỗi giải mã công thức:", formula, error);
        return 0;
    }
};

export async function generateAutoEstimate(params: EstimateParams) {
    const supabase = await createClient();
    const { projectId, length, width, floors, foundation, roof, wcCount } = params;

    console.log(`🚀 [Dynamic Auto-Estimate] Đang nội suy dự án: ${projectId}`);

    try {
        const { data: template, error: tplError } = await supabase
            .from("auto_estimate_templates")
            .select("id")
            .eq("foundation_type", foundation)
            .eq("is_active", true)
            .limit(1)
            .single();

        if (tplError || !template) throw new Error(`Chưa có Template bóc tách tự động cho loại móng [${foundation}] trong Database!`);

        const { data: tasks, error: tasksError } = await supabase
            .from("auto_estimate_tasks")
            .select("*")
            .eq("template_id", template.id)
            .order("sort_order", { ascending: true });

        if (tasksError || !tasks?.length) throw new Error("Template này chưa có cấu hình danh mục công tác nào!");

        const itemsToInsert = tasks.map(task => {
            const calculatedQty = evaluateFormula(task.formula, length, width, floors, wcCount);
            return {
                section: task.section_name,
                item_name: task.item_name,
                norm_code: task.norm_code,
                unit: task.unit,
                quantity: calculatedQty,
                formula_text: task.formula
            };
        });

        console.log("🧹 Đang dọn dẹp hệ thống QTO cũ...");
        await supabase.from("qto_items").delete().eq("project_id", projectId);

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

        // ✅ VÒNG LẶP NÀY VỪA TẠO CÔNG TÁC, VỪA GỌI PHÂN TÍCH VẬT TƯ
        let tasksCreatedCount = 0;

        for (const item of itemsToInsert) {
            const parentId = sectionMap.get(item.section);
            if (item.quantity <= 0) continue;

            // 1. Thêm Công Tác
            const { data: taskData } = await supabase.from("qto_items").insert({
                project_id: projectId,
                parent_id: parentId,
                item_name: item.item_name,
                norm_code: item.norm_code,
                unit: item.unit,
                quantity: item.quantity,
                item_type: "task"
            }).select("id").single();

            if (taskData) {
                // 2. Thêm diễn giải (hình học)
                await supabase.from("qto_item_details").insert({
                    qto_item_id: taskData.id,
                    explanation: `KL tự động tính theo công thức: [${item.formula_text}]`,
                    quantity_factor: item.quantity,
                    length: 0,
                    width: 0,
                    height: 0
                });

                // 3. 🔴 KÍCH HOẠT ĐỘNG CƠ PHÂN TÍCH CHO CHÍNH CÔNG TÁC NÀY
                // Sử dụng await để bóc tách mã định mức (VD: AF.111) của công tác này ngay lập tức
                if (item.norm_code) {
                    await analyzeSingleQTOItem(taskData.id, projectId, item.quantity);
                }

                tasksCreatedCount++;
            }
        }

        console.log("✅ Hoàn tất toàn bộ ma trận!");

        revalidatePath('/', 'layout');
        return { success: true, message: `Bóc tách thành công! Đã nội suy ${tasksCreatedCount} công tác và bung toàn bộ Hao phí vật tư.` };

    } catch (e: any) {
        console.error("🔥 Dynamic Auto-Estimate Error:", e.message);
        return { success: false, error: e.message };
    }
}