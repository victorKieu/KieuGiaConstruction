"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import crypto from 'crypto';

// 1. Kéo danh sách tài sản ĐANG ĐƯỢC CẤP PHÁT
export async function getAllAssignedAssets() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from('asset_assignments')
            .select(`
                id, assigned_date, condition_out, status,
                asset:assets (id, code, name, category, serial_number),
                employee:employees (id, code, name)
            `)
            .order('assigned_date', { ascending: false });

        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("[ERROR] getAllAssignedAssets:", error);
        return { success: false, data: [] };
    }
}

// 2. Kéo danh sách tài sản RẢNH TRONG KHO (Available)
export async function getAvailableAssets(category?: string) {
    try {
        const supabase = await createSupabaseServerClient();
        let query = supabase.from('assets').select('*').eq('status', 'Available');

        if (category && category !== 'all') {
            query = query.eq('category', category);
        }

        const { data, error } = await query.order('code', { ascending: true });
        if (error) throw error;
        return { success: true, data: data || [] };
    } catch (error: any) {
        console.error("[ERROR] getAvailableAssets:", error);
        return { success: false, data: [] };
    }
}

// 3. Xử lý Cấp phát tài sản cho nhân viên
export async function assignAssetToEmployee(formData: FormData) {
    try {
        const supabase = await createSupabaseServerClient();

        const asset_id = formData.get("asset_id") as string;
        const employee_id = formData.get("employee_id") as string; // Lấy từ Form
        const assigned_date = formData.get("assigned_date") as string;
        const condition_out = formData.get("condition") as string;
        const note = formData.get("note") as string;

        if (!asset_id || !employee_id) {
            return { success: false, error: "Vui lòng chọn nhân viên và tài sản." };
        }

        // Bước A: Thêm record vào bảng asset_assignments
        const { error: assignError } = await supabase.from('asset_assignments').insert({
            asset_id, employee_id, assigned_date, condition_out, note, status: 'Active'
        });

        if (assignError) throw assignError;

        // Bước B: Cập nhật trạng thái tài sản trong kho thành 'Assigned'
        const { error: updateError } = await supabase.from('assets').update({
            status: 'Assigned'
        }).eq('id', asset_id);

        if (updateError) throw updateError;

        revalidatePath('/hrm/assets'); // Đổi đường dẫn theo trang thực tế của bạn
        return { success: true, message: "Cấp phát tài sản thành công!" };
    } catch (error: any) {
        console.error("[ERROR] assignAssetToEmployee:", error);
        return { success: false, error: "Lỗi hệ thống khi cấp phát tài sản." };
    }
}

/**
 * HÀM TẠO MÃ TÀI SẢN TỰ ĐỘNG KHI NHẬP KHO
 * Format: AST-[LOẠI]-[NĂM]-[SỐ_THỨ_TỰ] (VD: AST-LAP-24-001)
 */
async function generateAssetCode(category: string, supabase: any): Promise<string> {
    // 1. Chuyển Category thành Prefix viết tắt
    let prefix = 'OTH'; // Other
    const catUpper = category.toUpperCase();
    if (catUpper.includes('LAPTOP')) prefix = 'LAP';
    else if (catUpper.includes('MONITOR')) prefix = 'MON';
    else if (catUpper.includes('PHONE') || catUpper.includes('SMARTPHONE')) prefix = 'PHO';
    else if (catUpper.includes('ACCESSORY')) prefix = 'ACC';
    else if (catUpper.includes('FURNITURE')) prefix = 'FUR';

    // 2. Lấy 2 số cuối của năm hiện tại
    const year = new Date().getFullYear().toString().slice(-2);
    const basePrefix = `AST-${prefix}-${year}`;

    // 3. Tìm số thứ tự lớn nhất hiện tại trong năm nay
    const { data: existingAssets } = await supabase
        .from('assets')
        .select('code')
        .ilike('code', `${basePrefix}-%`);

    let maxNumber = 0;
    for (const asset of (existingAssets || [])) {
        const parts = asset.code.split('-');
        if (parts.length === 4) {
            const num = parseInt(parts[3], 10);
            if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        }
    }

    // 4. Định dạng thành 3 chữ số: 001, 002...
    const nextNumber = (maxNumber + 1).toString().padStart(3, '0');
    return `${basePrefix}-${nextNumber}`;
}

/**
 * API: NHẬP KHO THIẾT BỊ MỚI (RECEIVE TO WAREHOUSE)
 */
export async function receiveAssetToWarehouse(formData: FormData) {
    try {
        const supabase = await createSupabaseServerClient();

        const name = formData.get("name") as string;
        const category = formData.get("category") as string;
        const serial_number = formData.get("serial_number") as string;
        const supplier_id = formData.get("supplier_id") as string;
        const purchase_date = formData.get("purchase_date") as string;
        const price = Number(formData.get("price")) || 0;

        if (!name || !category) {
            return { success: false, error: "Vui lòng nhập Tên và Loại thiết bị." };
        }

        // Kiểm tra xem Serial Number đã tồn tại trong kho chưa (Chống nhập đúp)
        if (serial_number) {
            const { data: checkSerial } = await supabase.from('assets').select('id').eq('serial_number', serial_number).single();
            if (checkSerial) {
                return { success: false, error: `Số Serial ${serial_number} đã tồn tại trong hệ thống!` };
            }
        }

        // 🚀 Tự động sinh Mã tài sản nội bộ
        const assetCode = await generateAssetCode(category, supabase);

        // Chuẩn bị dữ liệu nhập kho
        const newAssetData = {
            id: crypto.randomUUID(),
            code: assetCode,
            name,
            category,
            serial_number: serial_number || null,
            has_serial_number: !!serial_number,
            supplier_id: supplier_id || null,
            purchase_date: purchase_date || new Date().toISOString().split('T')[0],
            price,
            condition: 'Mới 100%',
            status: 'Available', // Sẵn sàng cấp phát
            asset_tag_printed: false // Cảnh báo Admin cần in tem dán
        };

        const { error } = await supabase.from('assets').insert(newAssetData);

        if (error) {
            console.error("[DB_INSERT_ASSET_ERROR]", error.message);
            return { success: false, error: "Lỗi lưu cơ sở dữ liệu." };
        }

        revalidatePath('/hrm/assets/inventory');
        return {
            success: true,
            message: `Đã nhập kho thành công! Mã tài sản cấp phát: ${assetCode}`,
            assetCode: assetCode
        };

    } catch (error: any) {
        console.error("[SERVER_ERROR] receiveAssetToWarehouse:", error);
        return { success: false, error: "Hệ thống đang bận." };
    }
}