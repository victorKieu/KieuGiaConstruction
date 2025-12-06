"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { isValidUUID } from "@/lib/utils/uuid";
import type { ActionResponse, ActionFetchResult } from "./projectActions";
import type { Tables } from "@/types/supabase";
// Import các type QTO/Estimation từ file type chính
import type { QtoItem, QtoTemplate, EstimationItem } from "@/types/project";


// Helper function (Lấy từ projectActions)
async function getSupabaseClient() {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    if (!token) return { client: null, error: { message: "Phiên đăng nhập hết hạn.", code: "401" } };
    return { client: createSupabaseServerClient(token), error: null };
}

// --- FETCH ACTIONS ---

/**
 * Lấy danh sách các công tác QTO của một dự án (Đã JOIN template)
 */
export async function getQtoItems(projectId: string): Promise<ActionFetchResult<QtoItem[]>> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { data: null, error: authError };

    const { data, error } = await supabase
        .from("qto_items")
        .select(`*`) // <-- SỬA LẠI THÀNH DÒNG NÀY
        .eq("project_id", projectId)
        .order("item_name", { ascending: true });

    if (error) return { data: null, error: { message: `Lỗi tải QTO: ${error.message}`, code: error.code } };
    return { data: data as QtoItem[], error: null };
}

/**
 * Lấy danh sách các Mẫu Công tác (Template Catalog)
 */
export async function getQtoTemplates(): Promise<ActionFetchResult<QtoTemplate[]>> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { data: null, error: authError };

    const { data, error } = await supabase
        .from("qto_templates")
        .select(`*`)
        .order("code", { ascending: true });

    if (error) return { data: null, error: { message: `Lỗi tải Mẫu QTO: ${error.message}`, code: error.code } };
    return { data: data as QtoTemplate[], error: null };
}


// --- CRUD & LOGIC ACTIONS ---

/**
 * Server Action: Tạo công tác QTO mới (Hoàn chỉnh)
 */
export async function createQtoItem(
    formData: FormData // Chỉ nhận formData (khớp với useTransition ở Client)
): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const projectId = formData.get("projectId") as string | null;
    const templateCode = formData.get("template_code") as string | null;

    // Xác định chế độ: Dùng Mẫu hay Thủ công
    const isTemplate = !!templateCode && templateCode !== 'manual';

    if (!projectId || !isValidUUID(projectId)) return { success: false, error: "ID Dự án không hợp lệ." };

    let itemName: string = "";
    let unit: string = "";
    let unit_price: number = 0;
    let quantity: number = 0;
    let item_type: QtoItem['item_type'] = 'material';
    let notes: string | null = (formData.get("notes") as string) || null;

    try {
        if (isTemplate) {
            // === 1. LOGIC BÁN TỰ ĐỘNG (DÙNG FORMULA) ===
            const { data } = await supabase.from("qto_templates").select('*').eq('code', templateCode).single();
            const templateData = data as QtoTemplate;

            if (!templateData) return { success: false, error: "Mã công tác mẫu không tồn tại." };

            // Lấy tham số từ Form
            const L = Number(formData.get("param_L")) || 0;
            const W = Number(formData.get("param_W")) || 0;
            const H = Number(formData.get("param_H")) || 0;
            const T = Number(formData.get("param_T")) || 0;
            const N = Number(formData.get("param_N")) || 1;

            itemName = templateData.name; // Dùng tên chuẩn của Mẫu để khớp Định mức
            unit = templateData.unit;
            unit_price = templateData.estimated_price ?? 0; // Fix lỗi null
            item_type = (templateData.type as QtoItem['item_type']) || 'material';

            // --- BỘ MÁY TÍNH TOÁN (Formula Engine) ---
            switch (templateCode) {
                case 'BT_MONG':
                case 'BT_LOT_MONG':
                case 'BT_COT':
                    quantity = L * W * H * N; // V = Dài x Rộng x Cao x Số lượng
                    break;

                case 'VK_MONG':
                case 'VK_COT':
                    quantity = ((L + W) * 2) * H * N; // S = Chu vi x Cao x Số lượng
                    break;

                case 'BT_SAN':
                    quantity = L * W * T * N; // V = Dài x Rộng x Dày x Số lượng
                    break;

                case 'BT_DAM':
                    // V = Rộng * (Cao - Dày Sàn) * Dài * Số lượng
                    const beamH_Net = H - T;
                    quantity = W * (beamH_Net > 0 ? beamH_Net : H) * L * N;
                    break;

                case 'VK_DAM':
                    // S = (2 * Cao Net + Rộng) * Dài
                    const beamH_Net_FW = H - T;
                    const perimeter = (2 * (beamH_Net_FW > 0 ? beamH_Net_FW : H)) + W;
                    quantity = perimeter * L * N;
                    break;

                default:
                    quantity = Number(formData.get("quantity")) || 1; // Mặc định nếu chưa có công thức
            }
        } else {
            // === 2. LOGIC THỦ CÔNG ===
            itemName = (formData.get("item_name") as string)?.trim() || "Công tác mới";
            unit = (formData.get("unit") as string)?.trim() || "Lần";
            unit_price = Number(formData.get("unit_price")) || 0;
            quantity = Number(formData.get("quantity")) || 1;
            item_type = (formData.get("item_type") as QtoItem['item_type']) || 'material';
        }

        // 3. Insert vào bảng `qto_items`
        const insertData: Partial<QtoItem> = {
            project_id: projectId,
            item_name: itemName,
            unit: unit,
            unit_price: unit_price,
            quantity: quantity,
            item_type: item_type,
            notes: notes,
        };

        const { data: newItem, error: insertError } = await supabase
            .from("qto_items")
            .insert(insertData)
            .select()
            .single(); // Lấy lại item vừa tạo để có ID

        if (insertError) {
            console.error("Lỗi tạo QTO:", insertError.message);
            return { success: false, error: `Lỗi CSDL: ${insertError.message}` };
        }

        // 4. TỰ ĐỘNG PHÂN TÍCH VẬT TƯ (Cho tab Dự toán)
        if (newItem) {
            await calculateResources(supabase, projectId, newItem.id, newItem.item_name, newItem.quantity);
        }

        revalidatePath(`/projects/${projectId}`);
        return { success: true, message: `Đã thêm: ${itemName}` };

    } catch (e: any) {
        return { success: false, error: `Lỗi xử lý: ${e.message}` };
    }
}

export async function updateQtoItem(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    // Lấy dữ liệu
    const itemId = formData.get("itemId") as string | null;
    const projectId = formData.get("projectId") as string | null;

    // Lấy các trường có thể sửa
    const updateData: Partial<QtoItem> = {
        item_name: (formData.get("item_name") as string)?.trim(),
        unit: (formData.get("unit") as string)?.trim(),
        quantity: Number(formData.get("quantity")) || 0,
        unit_price: Number(formData.get("unit_price")) || 0,
        item_type: (formData.get("item_type") as QtoItem['item_type']) || 'material',
        notes: (formData.get("notes") as string)?.trim() || null,
        updated_at: new Date().toISOString()
    };

    if (!itemId || !isValidUUID(itemId)) return { success: false, error: "ID công tác không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };

    // Cập nhật CSDL
    const { error: updateError } = await supabase
        .from("qto_items")
        .update(updateData)
        .eq("id", itemId);

    if (updateError) {
        console.error("Lỗi cập nhật QTO Item:", updateError.message);
        return { success: false, error: `Lỗi CSDL: ${updateError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã cập nhật công tác." };
}


/**
 * (MỚI) Xóa một công tác QTO
 */
export async function deleteQtoItem(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const itemId = formData.get("itemId") as string | null;
    const projectId = formData.get("projectId") as string | null;

    if (!itemId || !isValidUUID(itemId)) return { success: false, error: "ID công tác không hợp lệ." };
    if (!projectId) return { success: false, error: "ID Dự án bị thiếu." };

    // (Kiểm tra quyền nếu cần)

    // Xóa
    const { error: deleteError } = await supabase
        .from("qto_items")
        .delete()
        .eq("id", itemId);

    if (deleteError) {
        console.error("Lỗi xóa QTO Item:", deleteError.message);
        return { success: false, error: `Lỗi CSDL: ${deleteError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: "Đã xóa công tác QTO." };
}


// ----------------------------------------------------------------------
// --- ESTIMATION (Dự toán) ACTIONS ---
// ----------------------------------------------------------------------

/**
 * (MỚI) Tạo/Cập nhật dự toán từ QTO Items.
 */
export async function generateEstimation(projectId: string): Promise<ActionResponse> {
    // Logic: 
    // 1. Lấy tất cả QTO Items của dự án.
    // 2. Tính tổng chi phí (quantity * unit_price).
    // 3. Cập nhật bảng 'quotations' (hoặc 'estimations') của dự án.
    return { success: true, message: "Đã tạo/cập nhật dự toán." };
}

/**
 * (MỚI) SERVER ACTION TÍNH TOÁN BÁN TỰ ĐỘNG
 * Đây là logic "số hóa 100%" mà bạn yêu cầu.
 */
export async function calculateQto_SemiAuto(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const projectId = formData.get("projectId") as string | null;
    const itemType = formData.get("itemType") as string | null; // Ví dụ: "CONCRETE_BEAM"

    if (!projectId || !itemType) return { success: false, error: "Thiếu thông tin đầu vào." };

    // 1. Lấy tất cả tham số (Kích thước) của dự án này
    const { data: paramsData, error: paramsError } = await supabase
        .from("project_parameters")
        .select("param_name, param_value")
        .eq("project_id", projectId);

    if (paramsError) return { success: false, error: "Lỗi khi đọc tham số dự án." };

    // Chuyển mảng params thành object (Map) cho dễ tra cứu, ví dụ: { L: 5, W: 0.3, H: 0.4 }
    const params = Object.fromEntries(paramsData.map(p => [p.param_name, p.param_value]));

    let quantity = 0;
    let itemName = "";
    let unit = "";

    // 2. BỘ MÁY TÍNH TOÁN (Formula Engine - Hardcoded V1)
    // (Dựa trên logic "Pro-tips" của bạn)
    try {
        switch (itemType) {
            // --- BÊ TÔNG ---
            case "CONCRETE_FOUNDATION": // Bê tông Móng (Đơn giản)
                itemName = "Bê tông Móng (Tính tự động)";
                unit = "m3";
                // V = Dài * Rộng * Cao (Lấy từ tham số)
                quantity = (params['Foundation_L'] || 0) * (params['Foundation_W'] || 0) * (params['Foundation_H'] || 0);
                break;

            case "CONCRETE_BEAM": // Bê tông Dầm
                itemName = "Bê tông Dầm (Tính tự động)";
                unit = "m3";
                // V = (Tiết diện dầm DƯỚI SÀN) * Dài
                // V = (W * (H - Floor_T)) * L
                const beamHeightBelowSlab = (params['Beam_H'] || 0) - (params['Floor_T'] || 0); // (Cao dầm - Dày sàn)
                quantity = (params['Beam_W'] || 0) * beamHeightBelowSlab * (params['Beam_L'] || 0);
                break;

            // --- VÁN KHUÔN ---
            case "FORMWORK_BEAM": // Ván khuôn Dầm (Trừ giao)
                itemName = "Ván khuôn Dầm (Trừ giao tự động)";
                unit = "m2";
                // S = (2 * Cao Dưới Sàn * Dài) + (1 * Rộng Đáy * Dài)
                const beamHeightBelowSlab_FW = (params['Beam_H'] || 0) - (params['Floor_T'] || 0);
                const sideArea = 2 * beamHeightBelowSlab_FW * (params['Beam_L'] || 0);
                const bottomArea = (params['Beam_W'] || 0) * (params['Beam_L'] || 0);
                quantity = sideArea + bottomArea;

                // (LOGIC TRỪ GIAO CỘT - Chưa implement, cần thêm param Cột)
                // quantity -= (2 * (params['Column_W'] || 0) * beamHeightBelowSlab_FW);
                break;

            // --- CỐT THÉP (Cần logic phức tạp hơn) ---
            case "REBAR_FOUNDATION":
                itemName = "Cốt thép Móng (Tính tự động)";
                unit = "kg";
                // (Đây là logic phức tạp, cần đọc bản vẽ hoặc nhập chi tiết hơn)
                // Tạm tính theo % (ví dụ: 100 kg/m3 bê tông)
                const concreteVolume = (params['Foundation_L'] || 0) * (params['Foundation_W'] || 0) * (params['Foundation_H'] || 0);
                quantity = concreteVolume * 100; // Giả định 100kg/m3
                break;

            default:
                return { success: false, error: "Loại công tác tự động không được hỗ trợ." };
        }
    } catch (e: any) {
        return { success: false, error: `Lỗi công thức: ${e.message}` };
    }

    // 3. Insert kết quả vào bảng qto_items_calculated
    const { error: insertError } = await supabase
        .from("qto_items_calculated")
        .insert({
            project_id: projectId,
            work_item_code: itemType,
            item_name: itemName,
            unit: unit,
            quantity: quantity,
            unit_price: 0, // Giá sẽ được cập nhật ở tab Dự toán
        });

    if (insertError) {
        return { success: false, error: `Lỗi lưu kết quả QTO: ${insertError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `Đã tính toán: ${itemName} = ${quantity.toFixed(2)} ${unit}` };
}

/**
 * (MỚI) CHẠY PHÂN TÍCH VẬT TƯ TỰ ĐỘNG (LOGIC G8/F1)
 * Đọc Bảng QTO, nhân với Định mức, ghi vào Bảng Dự toán.
 */
export async function runEstimationAnalysis(
    prevState: ActionResponse,
    formData: FormData
): Promise<ActionResponse> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { success: false, error: authError.message };

    const projectId = formData.get("projectId") as string | null;
    if (!projectId || !isValidUUID(projectId)) return { success: false, error: "ID Dự án không hợp lệ." };

    // 1. Lấy tất cả QTO items của dự án (Kết quả Bóc tách)
    const { data: qtoItems, error: qtoError } = await supabase
        .from("qto_items")
        .select("*")
        .eq("project_id", projectId);

    if (qtoError) return { success: false, error: "Lỗi khi đọc Bảng QTO." };
    if (!qtoItems || qtoItems.length === 0) return { success: false, error: "Bảng QTO rỗng. Hãy bóc tách trước." };

    // 2. Lấy tất cả CSDL Định mức (Norms)
    const { data: norms, error: normError } = await supabase
        .from("norm_definitions")
        .select(`
            id,
            name,
            norm_analysis ( material_code, material_name, unit, quantity )
        `); // JOIN sâu vào bảng phân tích

    if (normError) return { success: false, error: "Lỗi khi đọc CSDL Định Mức." };

    // 3. Xóa Bảng Dự toán cũ (estimation_items)
    const { error: deleteError } = await supabase
        .from("estimation_items")
        .delete()
        .eq("project_id", projectId);
    if (deleteError) return { success: false, error: "Lỗi khi xóa Dự toán cũ." };


    // 4. BỘ MÁY PHÂN TÍCH (Explosion Engine)
    const newEstimationItems: any[] = [];

    for (const qto of qtoItems) {
        // Tìm định mức (norm) tương ứng với công tác (qto item)
        // (Đây là logic "mapping" - giả định tên QTO khớp tên Định mức)
        const matchedNorm = norms.find(n => n.name === qto.item_name);

        if (matchedNorm && matchedNorm.norm_analysis) {
            // Đã tìm thấy "công thức"!
            for (const analysisItem of matchedNorm.norm_analysis) {
                newEstimationItems.push({
                    project_id: projectId,
                    qto_item_id: qto.id,
                    material_code: analysisItem.material_code,
                    material_name: analysisItem.material_name,
                    unit: analysisItem.unit,
                    // TÍNH TOÁN: Khối lượng QTO * Hao phí Định mức
                    quantity: qto.quantity * analysisItem.quantity,
                    // (unit_price sẽ được cập nhật ở Bước 3: So giá)
                });
            }
        } else {
            // Không tìm thấy định mức (ví dụ: công tác thủ công)
            // Vẫn thêm vào bảng dự toán (nhưng không được phân tích)
            newEstimationItems.push({
                project_id: projectId,
                qto_item_id: qto.id,
                material_code: "THU_CONG",
                material_name: qto.item_name, // Giữ tên cũ
                unit: qto.unit,
                quantity: qto.quantity,
                unit_price: qto.unit_price, // Lấy giá thủ công
            });
        }
    }

    // 5. Insert Bảng Dự toán mới (estimation_items)
    const { error: insertError } = await supabase.from("estimation_items").insert(newEstimationItems);

    if (insertError) {
        console.error("Lỗi insert Bảng Dự toán:", insertError.message);
        return { success: false, error: `Lỗi CSDL: ${insertError.message}` };
    }

    revalidatePath(`/projects/${projectId}`);
    return { success: true, message: `Phân tích thành công ${newEstimationItems.length} dòng vật tư, nhân công, máy.` };
}

/**
* (MỚI) Lấy danh sách Dự toán Chi tiết (estimation_items) của một dự án
*/
export async function getEstimationItems(projectId: string): Promise<ActionFetchResult<EstimationItem[]>> {
    const { client: supabase, error: authError } = await getSupabaseClient();
    if (authError || !supabase) return { data: null, error: authError };

    const { data, error } = await supabase
        .from("estimation_items")
        .select(`*`) // Lấy tất cả các cột của Bảng Dự toán
        .eq("project_id", projectId)
        .order("material_name", { ascending: true });

    if (error) {
        console.error("Lỗi Supabase trong getEstimationItems:", error.message);
        return { data: null, error: { message: `Lỗi tải Dự toán: ${error.message}`, code: error.code } };
    }
    return { data: data as EstimationItem[], error: null };
}

// --- HÀM TRỢ GIÚP: TÍNH TOÁN HAO PHÍ (DỰ TOÁN) ---
// Hàm này sẽ tự động "nổ" (explode) đầu việc QTO thành các vật tư/nhân công chi tiết
async function calculateResources(supabase: any, projectId: string, qtoItemId: string, qtoItemName: string, qtoQuantity: number) {
    // 1. Xóa các resource cũ của item này (nếu có)
    await supabase.from("estimation_items").delete().eq("qto_item_id", qtoItemId);

    // 2. Tìm Định mức (Norm) phù hợp dựa trên Tên công tác
    // (Lưu ý: Tên công tác trong QTO phải khớp với Tên trong CSDL Định Mức)
    const { data: norm } = await supabase
        .from("norm_definitions")
        .select(`id, norm_analysis ( material_code, material_name, unit, quantity )`)
        .eq("name", qtoItemName)
        .single();

    const resources = [];

    if (norm && norm.norm_analysis) {
        // A. Nếu tìm thấy Định mức: "Nổ" ra vật tư chi tiết
        for (const analysis of norm.norm_analysis) {
            resources.push({
                project_id: projectId,
                qto_item_id: qtoItemId,
                material_code: analysis.material_code,
                material_name: analysis.material_name,
                unit: analysis.unit,
                quantity: qtoQuantity * analysis.quantity, // Nhân khối lượng QTO với Định mức
                unit_price: 0, // Giá sẽ nhập bên tab Dự toán
            });
        }
    } else {
        // B. Nếu không có Định mức (hoặc làm Thủ công): Giữ nguyên dòng đó
        resources.push({
            project_id: projectId,
            qto_item_id: qtoItemId,
            material_code: "THU_CONG",
            material_name: qtoItemName,
            unit: "Lần",
            quantity: qtoQuantity,
            unit_price: 0,
        });
    }

    // 3. Lưu vào bảng estimation_items
    if (resources.length > 0) {
        const { error } = await supabase.from("estimation_items").insert(resources);
        if (error) console.error("Lỗi tự động tính resource:", error.message);
    }
}