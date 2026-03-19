"use server";

import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/supabase/getUserProfile";

// --- 1. LẤY DANH SÁCH (✅ ĐÃ FIX: Lấy thêm id của resource để Edit không bị mất) ---
export async function getNorms(searchTerm: string = "", page: number = 1, pageSize: number = 50) {
    const supabase = await createClient();

    let query = supabase
        .from("norms")
        .select(`
            id, code, name, unit, type, conversion_factor, created_at,
            details:norm_details (
                id, quantity,
                resource:resources (id, code, name, unit) 
            )
        `, { count: "exact" });

    if (searchTerm) {
        query = query.or(`code.ilike.%${searchTerm}%,name.ilike.%${searchTerm}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, count, error } = await query.order("code", { ascending: true }).range(from, to);

    if (error) {
        console.error("Lỗi lấy danh sách định mức:", error.message);
        return { data: [], total: 0 };
    }

    return { data: data || [], total: count || 0 };
}

// --- 2. LẤY DANH SÁCH CÁC NHÓM ---
export async function getStandardResources() {
    const supabase = await createClient();
    const { data, error } = await supabase.from('resources').select('id, code, name, unit').order('code', { ascending: true });
    if (error) { console.error("Lỗi lấy danh sách Hao phí chuẩn:", error.message); return []; }
    return data;
}

// --- 3. LƯU ĐỊNH MỨC (✅ ĐÃ FIX LOGIC XÓA/LƯU CHI TIẾT VẬT TƯ) ---
export async function saveNorm(data: any) {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { success: false, error: "Bạn không có quyền Admin!" };

    const supabase = await createClient();
    if (!data.code || !data.name) return { success: false, error: "Mã và Tên định mức là bắt buộc" };

    try {
        const unit = data.unit?.trim() || "";

        let conversionFactor = 1;
        const unitMatch = unit.match(/^(\d+)/);
        if (unitMatch) {
            conversionFactor = parseInt(unitMatch[1], 10);
        }

        const normData = {
            code: data.code.trim(),
            name: data.name.trim(),
            unit: unit,
            type: data.type || "company",
            conversion_factor: conversionFactor
        };

        let normId = data.id;

        // Check trùng mã nếu tạo mới
        if (!normId) {
            const { data: exist } = await supabase.from("norms").select("id").eq("code", normData.code).maybeSingle();
            if (exist) return { success: false, error: `Mã định mức "${normData.code}" đã tồn tại!` };
        }

        // Lưu Header
        if (normId) {
            const { error } = await supabase.from("norms").update(normData).eq("id", normId);
            if (error) throw new Error("Lỗi cập nhật header: " + error.message);
        } else {
            const { data: newNorm, error } = await supabase.from("norms").insert(normData).select("id").single();
            if (error) throw new Error("Lỗi tạo mới: " + error.message);
            normId = newNorm.id;
        }

        // ✅ LƯU CHI TIẾT (Đã fix lỗi bị mất dữ liệu khi không sửa gì)
        // Chỉ chạm vào bảng norm_details nếu Frontend có gửi mảng `details` về
        if (normId && Array.isArray(data.details)) {

            // Xóa cũ đi để đắp cái mới lên (Cập nhật đồng bộ)
            await supabase.from("norm_details").delete().eq("norm_id", normId);

            if (data.details.length > 0) {
                const detailsData = [];

                for (const item of data.details) {
                    // Hỗ trợ cả 2 format: Lúc Add mới (resource_id) và lúc Edit fetch lên (resource.id)
                    const resId = item.resource_id || item.resource?.id;

                    if (resId) {
                        detailsData.push({
                            norm_id: normId,
                            resource_id: resId,
                            quantity: Number(item.quantity) || 0
                        });
                    }
                }

                if (detailsData.length > 0) {
                    const { error: dtError } = await supabase.from("norm_details").insert(detailsData);
                    if (dtError) throw new Error("Lỗi lưu chi tiết vật tư: " + dtError.message);
                }
            }
        }

        revalidatePath("/admin/dictionaries/norms");
        return { success: true, message: "Đã lưu định mức thành công!" };

    } catch (e: any) {
        console.error("Save Norm Error:", e);
        return { success: false, error: e.message };
    }
}

// --- 4. XÓA ĐỊNH MỨC ---
export async function deleteNorm(id: string) {
    const supabase = await createClient();
    const { error } = await supabase.from("norms").delete().eq("id", id);
    if (error) return { success: false, error: error.message };
    revalidatePath("/admin/dictionaries/norms");
    return { success: true, message: "Đã xóa định mức!" };
}

// --- 5. IMPORT ĐỊNH MỨC TỪ FILE CSV ---
export async function importNormsCSV(formData: FormData) {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) return { success: false, error: "Bạn không có quyền Admin!" };

    const file = formData.get("file") as File;
    if (!file) return { success: false, error: "Không tìm thấy file tải lên!" };

    try {
        let text = await file.text();
        const lines = text.split(/\r?\n/);
        const headerIndex = lines.findIndex(line => line.includes('Mã hiệu đơn giá'));
        if (headerIndex !== -1) { text = lines.slice(headerIndex).join('\n'); }

        const parseResult = Papa.parse(text, { header: true, skipEmptyLines: true });
        const rows = parseResult.data as any[];
        if (!rows || rows.length === 0) return { success: false, error: "File CSV trống!" };

        const supabase = await createClient();
        let currentNormCode = null;
        let currentGroupCode = null;
        const normsMap = new Map();
        const resourcesMap = new Map();
        const itemsList: any[] = [];

        for (const row of rows) {
            const normCode = row['Mã hiệu đơn giá']?.trim();
            const resCode = row['Mã hiệu VL, NC, M']?.trim();
            const rawName = row['Tên công tác']?.trim();
            const unit = row['Đơn vị']?.trim();

            let rawQty = row['Định mức'];
            let quantity = 0;
            if (rawQty) quantity = parseFloat(String(rawQty).replace(/\s/g, '').replace(',', '.'));

            if (normCode) {
                currentNormCode = normCode;
                let conversionFactor = 1;
                const unitMatch = unit?.match(/^(\d+)/);
                if (unitMatch) conversionFactor = parseInt(unitMatch[1], 10);

                normsMap.set(normCode, {
                    code: normCode,
                    name: rawName || 'Chưa có tên',
                    unit: unit || '',
                    type: 'company',
                    conversion_factor: conversionFactor
                });
                continue;
            }

            if (rawName === 'Vật liệu' || rawName === 'Nhân công' || rawName === 'Máy thi công') {
                if (rawName === 'Vật liệu') currentGroupCode = 'VL';
                if (rawName === 'Nhân công') currentGroupCode = 'NC';
                if (rawName === 'Máy thi công') currentGroupCode = 'M';
                continue;
            }

            if (resCode && currentNormCode) {
                if (!resourcesMap.has(resCode)) {
                    resourcesMap.set(resCode, {
                        code: resCode, name: rawName?.replace(/^-\s*/, '') || 'Chưa có tên', unit: unit || '',
                        group_code: currentGroupCode, unit_price: 0
                    });
                }
                if (quantity > 0) itemsList.push({ norm_code: currentNormCode, resource_code: resCode, quantity });
            }
        }

        const resCodeToId = new Map();
        const normCodeToId = new Map();

        const resourcesArray = Array.from(resourcesMap.values());
        for (let i = 0; i < resourcesArray.length; i += 200) {
            const chunk = resourcesArray.slice(i, i + 200);
            const { data, error } = await supabase.from('resources').upsert(chunk, { onConflict: 'code' }).select('id, code');
            if (error) throw new Error("Lỗi nạp Resources: " + error.message);
            if (data) data.forEach(r => resCodeToId.set(r.code, r.id));
        }

        const normsArray = Array.from(normsMap.values());
        for (let i = 0; i < normsArray.length; i += 200) {
            const chunk = normsArray.slice(i, i + 200);
            const { data, error } = await supabase.from('norms').upsert(chunk, { onConflict: 'code' }).select('id, code');
            if (error) throw new Error("Lỗi nạp Norms: " + error.message);
            if (data) data.forEach(n => normCodeToId.set(n.code, n.id));
        }

        const finalDetails = itemsList.map(item => ({
            norm_id: normCodeToId.get(item.norm_code),
            resource_id: resCodeToId.get(item.resource_code),
            quantity: item.quantity
        })).filter(d => d.norm_id && d.resource_id);

        if (finalDetails.length > 0) {
            const uniqueNormIds = Array.from(new Set(finalDetails.map(d => d.norm_id)));
            for (let i = 0; i < uniqueNormIds.length; i += 100) {
                await supabase.from('norm_details').delete().in('norm_id', uniqueNormIds.slice(i, i + 100));
            }
            for (let i = 0; i < finalDetails.length; i += 500) {
                const { error } = await supabase.from('norm_details').insert(finalDetails.slice(i, i + 500));
                if (error) console.error("Lỗi nạp norm_details:", error.message);
            }
        } else { return { success: false, error: "Không thể Map UUID. Có thể do RLS chặn quyền Select!" }; }

        revalidatePath("/admin/dictionaries/norms");
        return { success: true, message: `Thành công! Đã nạp ${normsMap.size} ĐM, ${resourcesMap.size} VT và ${finalDetails.length} chi tiết.` };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}