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

        // 1. Chỉ lấy các Task do Dự Toán (ESTIMATION) sinh ra để xử lý, không đụng vào Task Khảo Sát/Thiết Kế
        const { data: existingEstimationTasks } = await supabase
            .from('project_tasks')
            .select('*')
            .eq('project_id', projectId)
            .eq('source_module', 'ESTIMATION'); // <-- Cột này rất quan trọng

        if (!qtoItems || qtoItems.length === 0) throw new Error("Chưa có dữ liệu bóc tách.");

        const sections = qtoItems.filter(i => i.item_type === 'section' || !i.parent_id);
        const qtoTasks = qtoItems.filter(i => i.parent_id && i.item_type !== 'section');

        let wbsCounter = 1;
        let fallbackStartDate = config?.startDate ? new Date(config.startDate) : new Date();

        // Lưu danh sách ID các QTO đang có trên bảng để Lọc Task Mồ Côi ở bước cuối
        const activeQtoItemIds = new Set(qtoItems.map(q => q.id));

        for (const sec of sections) {
            const secWbsCode = `${wbsCounter}`;

            // ✅ SỬ DỤNG qto_item_id LÀM "DÂY RỐN" THAY VÌ name
            let parentExistTask = existingEstimationTasks?.find(t => t.qto_item_id === sec.id);
            let parentTaskId = parentExistTask?.id;

            let sectionTotalBudget = 0;
            let minStart: Date | null = null;
            let maxEnd: Date | null = null;

            if (!parentTaskId) {
                // NẾU HẠNG MỤC CHƯA CÓ TRONG GANTT -> THÊM MỚI
                const { data: newParent } = await supabase.from('project_tasks').insert({
                    project_id: projectId,
                    name: sec.item_name,
                    wbs_code: secWbsCode,
                    planned_cost: 0,
                    source_module: 'ESTIMATION', // Gắn nhãn
                    source_id: sec.id // Dây rốn
                }).select().single();
                parentTaskId = newParent?.id;
            } else {
                // NẾU HẠNG MỤC ĐÃ CÓ TRONG GANTT -> CHỈ CẬP NHẬT
                await supabase.from('project_tasks').update({
                    name: sec.item_name, // Cập nhật tên nếu Dự toán có đổi
                    wbs_code: secWbsCode
                }).eq('id', parentTaskId);
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

                if (!fTask?.end_date && fTask?.duration) {
                    endDate.setDate(endDate.getDate() + fTask.duration - 1);
                }

                fallbackStartDate = new Date(endDate);
                fallbackStartDate.setDate(fallbackStartDate.getDate() + 1);

                if (!minStart || startDate < minStart) minStart = new Date(startDate);
                if (!maxEnd || endDate > maxEnd) maxEnd = new Date(endDate);

                // ✅ SỬ DỤNG qto_item_id LÀM "DÂY RỐN" (Thay vì name)
                let childExistTask = existingEstimationTasks?.find(ex => ex.qto_item_id === qTask.id);

                // KHÓA BẢO VỆ: NẾU ĐANG THI CÔNG HOẶC ĐÃ XONG -> KHÔNG ĐƯỢC PHÉP CHẠM VÀO!
                if (childExistTask && ['IN_PROGRESS', 'COMPLETED'].includes(childExistTask.status)) {
                    childCounter++;
                    continue; // Bỏ qua task này, giữ nguyên tiền và lịch sử ngoài công trường
                }

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
                    duration: fTask?.duration || 1,
                    source_module: 'ESTIMATION', // Gắn nhãn
                    source_id: qTask.id // Dây rốn
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
                // Kiểm tra xem Hạng mục cha có đang thi công không? (Có thể bỏ qua nếu cha luôn tự động theo con)
                await supabase.from('project_tasks').update({
                    planned_cost: sectionTotalBudget,
                    start_date: minStart ? minStart.toISOString() : null,
                    due_date: maxEnd ? maxEnd.toISOString() : null
                }).eq('id', parentTaskId);
            }

            wbsCounter++;
        }

        // 2. DỌN DẸP RÁC (Xóa những Task mồ côi khỏi Gantt)
        // Điều kiện: Task đó thuộc ESTIMATION, CHƯA thi công, và không còn tồn tại trong bảng qto_items
        const orphanedTasks = existingEstimationTasks?.filter(t =>
            !activeQtoItemIds.has(t.qto_item_id) &&
            !['IN_PROGRESS', 'COMPLETED'].includes(t.status)
        ) || [];

        if (orphanedTasks.length > 0) {
            const orphanedIds = orphanedTasks.map(t => t.id);
            await supabase.from('project_tasks').delete().in('id', orphanedIds);
            console.log(`Đã xóa ${orphanedTasks.length} task mồ côi do xóa ở dự toán.`);
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: "Đồng bộ Tiến độ 5D sang Gantt thành công!" };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}