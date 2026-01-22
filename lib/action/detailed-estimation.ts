"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// 1. Lấy danh sách đầu việc từ Master Data để user chọn
export async function searchNorms(keyword: string) {
    const supabase = await createClient();
    const { data } = await supabase
        .from('norm_definitions')
        .select('*')
        .ilike('name', `%${keyword}%`)
        .limit(20);
    return data || [];
}

// 2. Thêm một công tác vào bảng dự toán
export async function addEstimateItem(
    projectId: string,
    sectionName: string,
    normCode: string,
    normName: string,
    unit: string
) {
    const supabase = await createClient();

    // Tính giá vốn (Unit Price) dựa trên định mức vật tư
    // Logic: Tìm xem 1 đơn vị công tác này tốn bao nhiêu tiền vật tư
    let unitPrice = 0;

    // A. Lấy phân tích vật tư
    const { data: analysis } = await supabase
        .from('norm_analysis')
        .select(`quantity, resource:materials(unit_price)`)
        .eq('norm_id', (await supabase.from('norm_definitions').select('id').eq('code', normCode).single()).data?.id);

    if (analysis) {
        // Tổng tiền = Sum (Lượng hao phí * Giá vật tư)
        unitPrice = analysis.reduce((sum, item) => {
            const price = (item.resource as any)?.unit_price || 0;
            return sum + (item.quantity * price);
        }, 0);
    }

    // B. Insert vào bảng
    const { error } = await supabase.from('estimation_items').insert({
        project_id: projectId,
        section_name: sectionName,
        material_code: normCode,
        material_name: normName,
        unit: unit,
        quantity: 0, // Chưa có khối lượng
        unit_price: unitPrice, // Giá vốn tự tính từ định mức
        dimensions: { length: 0, width: 0, height: 0, factor: 1 } // Mặc định
    });

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}

// 3. Cập nhật kích thước (Dài, Rộng, Cao) -> Tự tính lại Khối lượng
export async function updateItemDimensions(itemId: string, projectId: string, dims: any) {
    const supabase = await createClient();

    // Tính khối lượng: Dài * Rộng * Cao * Hệ số
    const quantity = (dims.length || 0) * (dims.width || 0) * (dims.height || 0) * (dims.factor || 1);

    const { error } = await supabase
        .from('estimation_items')
        .update({
            dimensions: dims,
            quantity: parseFloat(quantity.toFixed(3))
        })
        .eq('id', itemId);

    if (error) return { success: false, error: error.message };
    revalidatePath(`/projects/${projectId}`);
    return { success: true };
}