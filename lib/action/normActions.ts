"use server";

import Papa from "papaparse";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { checkIsAdmin } from "@/lib/supabase/getUserProfile";

// --- 1. LẤY DANH SÁCH (✅ ĐÃ FIX: Lấy thêm id của resource để Edit không bị mất) ---
export async function getNorms(searchTerm: string = "", page: number = 1, pageSize: number = 50) {
    const supabase = await createClient();

    // BƯỚC 1: Query bảng norms trước để lấy Data phân trang và Count (Không Join để chống lag)
    let query = supabase
        .from("norms")
        .select("id, code, name, unit, type, conversion_factor, created_at", { count: "exact" });

    // Khử nhiễu ký tự để chống lỗi cú pháp
    if (searchTerm) {
        const safeText = searchTerm.replace(/["']/g, '').trim();
        query = query.or(`code.ilike.%${safeText}%,name.ilike.%${safeText}%`);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    // Lấy 50 dòng của trang hiện tại
    const { data: normsData, count, error } = await query.order("code", { ascending: true }).range(from, to);

    if (error) {
        console.error("Lỗi lấy danh sách định mức:", error.message);
        return { data: [], total: 0 };
    }

    if (!normsData || normsData.length === 0) {
        return { data: [], total: count || 0 };
    }

    // BƯỚC 2: Lấy ID của 50 dòng hiện tại để kéo chi tiết hao phí (Rất nhẹ và siêu tốc)
    const normIds = normsData.map(n => n.id);

    const { data: detailsData, error: detailsErr } = await supabase
        .from("norm_details")
        .select(`
            id, norm_id, quantity,
            resource:resources (id, code, name, unit)
        `)
        .in("norm_id", normIds);

    if (detailsErr) {
        console.error("Lỗi lấy chi tiết hao phí:", detailsErr.message);
    }

    // BƯỚC 3: Ghép mảng hao phí vào mảng định mức để trả về UI như cũ
    const finalData = normsData.map(norm => ({
        ...norm,
        details: detailsData ? detailsData.filter(d => d.norm_id === norm.id) : []
    }));

    return { data: finalData, total: count || 0 };
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
    // Lấy loại định mức (Nhà nước / Nội bộ) từ Giao diện gửi xuống
    const importType = (formData.get("type") as string) || "company";

    if (!file) return { success: false, error: "Không tìm thấy file tải lên!" };

    try {
        let text = await file.text();
        const lines = text.split(/\r?\n/);
        // Tìm dòng tiêu đề thực sự của bảng để bỏ qua các dòng thừa ở trên
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

        // BƯỚC 1: QUÉT VÀ CHUẨN HÓA DỮ LIỆU TỪ CSV
        for (const row of rows) {
            const normCode = row['Mã hiệu đơn giá']?.trim();
            const resCode = row['Mã hiệu VL, NC, M']?.trim();
            const rawName = row['Tên công tác']?.trim();
            const unit = row['Đơn vị']?.trim();

            let rawQty = row['Định mức'];
            let quantity = 0;
            if (rawQty) quantity = parseFloat(String(rawQty).replace(/\s/g, '').replace(',', '.'));

            // Nếu dòng này là Dòng Định mức (Có mã hiệu đơn giá)
            if (normCode) {
                currentNormCode = normCode;

                // Tự động tính hệ số quy đổi từ Đơn vị tính (vd: 100m2 -> 100)
                let conversionFactor = 1;
                const unitMatch = unit?.match(/^(\d+)/);
                if (unitMatch) conversionFactor = parseInt(unitMatch[1], 10);

                normsMap.set(normCode, {
                    code: normCode,
                    name: rawName || 'Chưa có tên',
                    unit: unit || '',
                    type: importType, // Gán loại định mức (state hoặc company)
                    conversion_factor: conversionFactor // Gán hệ số quy đổi
                });
                continue;
            }

            // Phân loại nhóm vật tư (Vật liệu, Nhân công, Máy)
            if (rawName === 'Vật liệu' || rawName === 'Nhân công' || rawName === 'Máy thi công') {
                if (rawName === 'Vật liệu') currentGroupCode = 'VL';
                if (rawName === 'Nhân công') currentGroupCode = 'NC';
                if (rawName === 'Máy thi công') currentGroupCode = 'M';
                continue;
            }

            // Nếu dòng này là Dòng Vật tư hao phí con
            if (resCode && currentNormCode) {
                if (!resourcesMap.has(resCode)) {
                    resourcesMap.set(resCode, {
                        code: resCode,
                        name: rawName?.replace(/^-\s*/, '') || 'Chưa có tên',
                        unit: unit || '',
                        group_code: currentGroupCode,
                        unit_price: 0
                    });
                }
                if (quantity > 0) {
                    itemsList.push({ norm_code: currentNormCode, resource_code: resCode, quantity });
                }
            }
        }

        const resCodeToId = new Map();
        const normCodeToId = new Map();

        // BƯỚC 2: LƯU DANH SÁCH VẬT TƯ (RESOURCES) VÀO DATABASE (Cắt lô 200 dòng để chống quá tải)
        const resourcesArray = Array.from(resourcesMap.values());
        for (let i = 0; i < resourcesArray.length; i += 200) {
            const chunk = resourcesArray.slice(i, i + 200);
            const { data, error } = await supabase.from('resources').upsert(chunk, { onConflict: 'code' }).select('id, code');
            if (error) throw new Error("Lỗi nạp danh mục Vật tư: " + error.message);
            if (data) data.forEach(r => resCodeToId.set(r.code, r.id));
        }

        // BƯỚC 3: LƯU DANH SÁCH ĐỊNH MỨC (NORMS) VÀO DATABASE
        const normsArray = Array.from(normsMap.values());
        for (let i = 0; i < normsArray.length; i += 200) {
            const chunk = normsArray.slice(i, i + 200);
            const { data, error } = await supabase.from('norms').upsert(chunk, { onConflict: 'code' }).select('id, code');
            if (error) throw new Error("Lỗi nạp danh mục Định mức: " + error.message);
            if (data) data.forEach(n => normCodeToId.set(n.code, n.id));
        }

        // BƯỚC 4: LƯU CHI TIẾT HAO PHÍ (NORM_DETAILS)
        // Ánh xạ từ Mã Code sang UUID của Database
        const finalDetails = itemsList.map(item => ({
            norm_id: normCodeToId.get(item.norm_code),
            resource_id: resCodeToId.get(item.resource_code),
            quantity: item.quantity
        })).filter(d => d.norm_id && d.resource_id);

        if (finalDetails.length > 0) {
            const uniqueNormIds = Array.from(new Set(finalDetails.map(d => d.norm_id)));

            // Xóa hao phí cũ của các định mức này (Nếu đang Import đè để Update)
            for (let i = 0; i < uniqueNormIds.length; i += 100) {
                await supabase.from('norm_details').delete().in('norm_id', uniqueNormIds.slice(i, i + 100));
            }

            // Insert hao phí mới (Cắt lô 500 dòng)
            for (let i = 0; i < finalDetails.length; i += 500) {
                const { error } = await supabase.from('norm_details').insert(finalDetails.slice(i, i + 500));
                if (error) console.error("Lỗi nạp chi tiết hao phí:", error.message);
            }
        } else {
            return { success: false, error: "Không thể Map UUID. File CSV có thể bị lỗi cấu trúc hoặc thiếu dữ liệu!" };
        }

        revalidatePath("/admin/dictionaries/norms");
        return { success: true, message: `Thành công! Đã nạp ${normsMap.size} Định mức, ${resourcesMap.size} Vật tư và ${finalDetails.length} chi tiết hao phí.` };

    } catch (e: any) {
        return { success: false, error: e.message };
    }
}