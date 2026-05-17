"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// Hàm hỗ trợ cộng ngày
function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result.toISOString();
}

// =========================================================================
// ĐỘNG CƠ ĐỒNG BỘ 5D: GHÉP QTO (KHỐI LƯỢNG, THỜI GIAN) + ESTIMATION (CHI PHÍ)
// =========================================================================
export async function sync5DToGanttTasks(projectId: string) {
    try {
        const supabase = await createClient();

        // 1. LẤY DỮ LIỆU TỪ 3 BẢNG (QTO, ESTIMATION, TASKS)
        const { data: qtoItems } = await supabase.from('qto_items').select('*').eq('project_id', projectId);
        const { data: estItems } = await supabase.from('estimation_items').select('*').eq('project_id', projectId);
        const { data: existingTasks } = await supabase.from('project_tasks').select('*').eq('project_id', projectId);

        if (!qtoItems || qtoItems.length === 0) {
            throw new Error("Chưa có dữ liệu bóc tách (QTO) để đồng bộ.");
        }

        const sections = qtoItems.filter(i => i.item_type === 'section' || !i.parent_id);
        const qtoTasks = qtoItems.filter(i => i.parent_id && i.item_type !== 'section');

        let wbsCounter = 1;

        // 2. MAP & MERGE DỮ LIỆU TỪNG GIAI ĐOẠN (SECTION)
        for (const sec of sections) {
            const secWbsCode = `${wbsCounter}`;
            let parentTaskId = existingTasks?.find(t => t.name === sec.item_name && !t.parent_id)?.id;
            let sectionTotalBudget = 0;
            let sectionTotalDuration = 0;

            // Xử lý Task Cha
            if (!parentTaskId) {
                const { data: newParent } = await supabase.from('project_tasks').insert({
                    project_id: projectId,
                    name: sec.item_name,
                    wbs_code: secWbsCode,
                    planned_cost: 0
                }).select().single();
                parentTaskId = newParent?.id;
            } else {
                await supabase.from('project_tasks').update({ wbs_code: secWbsCode }).eq('id', parentTaskId);
            }

            // Xử lý Task Con thuộc Section này
            const childQtoTasks = qtoTasks.filter(t => t.parent_id === sec.id);
            let childCounter = 1;

            for (const qTask of childQtoTasks) {
                const childWbsCode = `${secWbsCode}.${childCounter}`;

                // Lấy CÁC THÔNG SỐ CHUẨN:
                const quantity = Number(qTask.quantity) || 0;
                const duration = Number(qTask.duration) || 1; // Lấy Số ngày thực làm từ QTO

                // Map Chi phí từ bảng Dự toán (Tìm tất cả vật tư/nhân công thuộc QTO Task này)
                const mappedEstItems = estItems?.filter(e => e.qto_item_id === qTask.id) || [];
                const taskBudget = mappedEstItems.reduce((sum, e) => sum + (Number(e.total_cost) || 0), 0);

                // Cộng dồn lên Cha
                sectionTotalBudget += taskBudget;
                sectionTotalDuration += duration;

                // Xử lý Ngày tháng cho Gantt
                let childExistTask = existingTasks?.find(ex => ex.name === qTask.item_name && ex.parent_id === parentTaskId);

                const startDate = childExistTask?.start_date ? new Date(childExistTask.start_date) : new Date();
                // Tự động kéo dài End Date dựa trên Duration lấy từ QTO
                const endDate = addDays(startDate, duration - 1);

                const taskPayload = {
                    project_id: projectId,
                    parent_id: parentTaskId,
                    name: qTask.item_name,
                    wbs_code: childWbsCode,
                    planned_quantity: quantity,
                    planned_cost: taskBudget, // Gắn Chi phí (PV)
                    unit: qTask.unit,
                    progress: childExistTask?.progress || 0, // Giữ nguyên tiến độ nếu đã có
                    start_date: startDate.toISOString(),
                    end_date: endDate,
                };

                if (!childExistTask) {
                    await supabase.from('project_tasks').insert(taskPayload);
                } else {
                    await supabase.from('project_tasks').update(taskPayload).eq('id', childExistTask.id);
                }

                childCounter++;
            }

            // Cập nhật Tổng tiền (Rollup Cost) cho Task Cha
            if (parentTaskId) {
                await supabase.from('project_tasks').update({
                    planned_cost: sectionTotalBudget
                }).eq('id', parentTaskId);
            }

            wbsCounter++;
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đã map thành công: Khối lượng + Thời gian + Chi phí sang Gantt!" };

    } catch (error: any) {
        console.error("LỖI ĐỒNG BỘ 5D:", error.message);
        return { success: false, error: error.message };
    }
}