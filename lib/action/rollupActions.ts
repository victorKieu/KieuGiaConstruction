"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function sync5DToGanttTasks(
    projectId: string,
    config?: { startDate: string, allowWeekendWork: boolean },
    frontendTasks?: any[] // Đã chứa start_date và end_date từ CPM
) {
    try {
        const supabase = await createClient();

        const { data: qtoItems } = await supabase.from('qto_items').select('*').eq('project_id', projectId);
        const { data: estItems } = await supabase.from('estimation_items').select('*').eq('project_id', projectId);
        const { data: existingTasks } = await supabase.from('project_tasks').select('*').eq('project_id', projectId);

        if (!qtoItems || qtoItems.length === 0) throw new Error("Chưa có dữ liệu bóc tách.");

        const sections = qtoItems.filter(i => i.item_type === 'section' || !i.parent_id);
        const qtoTasks = qtoItems.filter(i => i.parent_id && i.item_type !== 'section');

        let wbsCounter = 1;
        let fallbackStartDate = config?.startDate ? new Date(config.startDate) : new Date();

        for (const sec of sections) {
            const secWbsCode = `${wbsCounter}`;
            let parentTaskId = existingTasks?.find(t => t.name === sec.item_name && !t.parent_id)?.id;
            let sectionTotalBudget = 0;
            let minStart: Date | null = null;
            let maxEnd: Date | null = null;

            if (!parentTaskId) {
                const { data: newParent } = await supabase.from('project_tasks').insert({
                    project_id: projectId, name: sec.item_name, wbs_code: secWbsCode, planned_cost: 0
                }).select().single();
                parentTaskId = newParent?.id;
            } else {
                await supabase.from('project_tasks').update({ wbs_code: secWbsCode }).eq('id', parentTaskId);
            }

            const childQtoTasks = qtoTasks.filter(t => t.parent_id === sec.id);
            let childCounter = 1;

            for (const qTask of childQtoTasks) {
                const childWbsCode = `${secWbsCode}.${childCounter}`;

                const mappedEstItems = estItems?.filter(e => e.qto_item_id === qTask.id) || [];
                const taskBudget = mappedEstItems.reduce((sum, e) => sum + (Number(e.total_cost) || 0), 0);
                sectionTotalBudget += taskBudget;

                // Lấy thông số từ Frontend gửi sang
                const fTask = frontendTasks?.find(t => t.id === qTask.id);

                let startDate = fTask?.start_date ? new Date(fTask.start_date) : new Date(fallbackStartDate);
                let endDate = fTask?.end_date ? new Date(fTask.end_date) : new Date(startDate);

                // Nếu lỡ không có end_date thì tự cộng
                if (!fTask?.end_date && fTask?.duration) {
                    endDate.setDate(endDate.getDate() + fTask.duration - 1);
                }

                fallbackStartDate = new Date(endDate);
                fallbackStartDate.setDate(fallbackStartDate.getDate() + 1);

                if (!minStart || startDate < minStart) minStart = new Date(startDate);
                if (!maxEnd || endDate > maxEnd) maxEnd = new Date(endDate);

                let childExistTask = existingTasks?.find(ex => ex.name === qTask.item_name && ex.parent_id === parentTaskId);

                const taskPayload = {
                    project_id: projectId,
                    parent_id: parentTaskId,
                    name: qTask.item_name,
                    wbs_code: childWbsCode,
                    planned_quantity: Number(qTask.quantity) || 0,
                    planned_cost: taskBudget,
                    unit: qTask.unit,
                    progress: childExistTask?.progress || 0,
                    start_date: startDate.toISOString(),
                    due_date: endDate.toISOString(),
                    duration: fTask?.duration || 1 
                };

                if (!childExistTask) {
                    await supabase.from('project_tasks').insert(taskPayload);
                } else {
                    await supabase.from('project_tasks').update(taskPayload).eq('id', childExistTask.id);
                }

                childCounter++;
            }

            // Ghi ngày nhỏ nhất và lớn nhất cho Hạng Mục (Cha)
            if (parentTaskId) {
                await supabase.from('project_tasks').update({
                    planned_cost: sectionTotalBudget,
                    start_date: minStart ? minStart.toISOString() : null,
                    due_date: maxEnd ? maxEnd.toISOString() : null // ✅ SỬA TẠI ĐÂY (thay end_date thành due_date)
                }).eq('id', parentTaskId);
            }

            wbsCounter++;
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đồng bộ Tiến độ 5D sang Gantt thành công!" };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}