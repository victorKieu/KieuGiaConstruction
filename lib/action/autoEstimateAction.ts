"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { analyzeQTOAndGenerateEstimation } from "./estimationActions"; // ✅ IMPORT ĐỘNG CƠ TẠO HAO PHÍ

interface EstimateParams {
    projectId: string;
    length: number;
    width: number;
    floors: number;
    foundation: string;
    roof: string;
    wcCount: number;
}

// Hàm tính toán công thức động siêu việt (Dynamic Evaluator)
const evaluateFormula = (formula: string, L: number, W: number, Floors: number, WcCount: number): number => {
    try {
        if (!formula || formula.trim() === "") return 0;
        // Biến chuỗi text "L * W * 0.45" thành lệnh tính toán thực tế trong Runtime
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

    console.log(`🚀 [Dynamic Auto-Estimate] Đang nội suy dự án: ${projectId}`);

    try {
        // 1. TÌM TEMPLATE PHÙ HỢP TRONG DATABASE (Bộ định tuyến gốc)
        const { data: template, error: tplError } = await supabase
            .from("auto_estimate_templates")
            .select("id")
            .eq("foundation_type", foundation)
            .eq("is_active", true)
            .limit(1)
            .single();

        if (tplError || !template) throw new Error(`Chưa có Template bóc tách tự động cho loại móng [${foundation}] trong Database!`);

        // 2. LẤY DANH SÁCH CÔNG TÁC CỦA TEMPLATE ĐÓ
        const { data: tasks, error: tasksError } = await supabase
            .from("auto_estimate_tasks")
            .select("*")
            .eq("template_id", template.id)
            .order("sort_order", { ascending: true });

        if (tasksError || !tasks?.length) throw new Error("Template này chưa có cấu hình danh mục công tác nào!");

        // 3. TÍNH TOÁN ĐỘNG MA TRẬN KHỐI LƯỢNG
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

        // 4. QUÉT SẠCH DỮ LIỆU CŨ ĐỂ LÀM BÀN ĐẠP CHO DỮ LIỆU MỚI TỪ WIZARD
        console.log("🧹 Đang dọn dẹp hệ thống QTO cũ...");

        // Chỉ cần xóa ở qto_items, do chúng ta đã set `onDelete: Cascade` trong schema, 
        // thì toàn bộ chi tiết và định mức hao phí ở bảng estimation_items cũng sẽ bốc hơi theo.
        await supabase.from("qto_items").delete().eq("project_id", projectId);

        // -- 4.1 Tạo Thư mục Hạng mục (Sections)
        const uniqueSections = Array.from(new Set(itemsToInsert.map(i => i.section)));
        const sectionMap = new Map();

        for (const sec of uniqueSections) {
            const { data: secData } = await supabase.from("qto_items").insert({
                project_id: projectId,
                item_name: sec,
                unit: "",
                item_type: "section" // Phân loại là Hạng Mục
            }).select("id").single();

            if (secData) sectionMap.set(sec, secData.id);
        }

        // -- 4.2 Cắm Đầu việc (Tasks) & Giải trình Hình học vào Database
        for (const item of itemsToInsert) {
            const parentId = sectionMap.get(item.section);

            // Bỏ qua nếu công thức trả về 0 (Nghĩa là công trình không có cấu kiện này)
            if (item.quantity === 0) continue;

            // Thêm Công Tác
            const { data: taskData } = await supabase.from("qto_items").insert({
                project_id: projectId,
                parent_id: parentId,
                item_name: item.item_name,
                norm_code: item.norm_code,
                unit: item.unit,
                quantity: item.quantity,
                item_type: "task" // Phân loại là Công việc
            }).select("id").single();

            if (taskData) {
                // ✅ ĐÃ SỬA LỖI SCHEMA: Đổi item_id thành qto_item_id
                await supabase.from("qto_item_details").insert({
                    qto_item_id: taskData.id,
                    explanation: `KL tự động tính theo công thức: [${item.formula_text}]`,
                    quantity_factor: item.quantity,
                    length: 0,
                    width: 0,
                    height: 0
                });
            }
        }

        console.log("✅ Hoàn tất ma trận Khối lượng Tiên lượng!");

        // 5. KÍCH NỔ DÂY CHUYỀN VẬT TƯ (Phân tích Hao phí & Giá vốn)
        // Hệ thống sẽ tự động móc nối các mã định mức (VD: AF.11111) sinh ra ở bước 4 
        // để kéo Vật Liệu, Nhân Công, Máy Thi Công vào Tab 2 (Nhập giá).
        console.log("⚙️ Kích hoạt động cơ phân tích Định mức vật tư...");
        await analyzeQTOAndGenerateEstimation(projectId);

        revalidatePath('/', 'layout');
        return { success: true, message: `Bóc tách thành công! Đã tự động nội suy ${itemsToInsert.length} công tác và phân tích vật tư.` };

    } catch (e: any) {
        console.error("🔥 Dynamic Auto-Estimate Error:", e.message);
        return { success: false, error: e.message };
    }
}