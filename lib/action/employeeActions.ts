"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { EmployeeFormData } from "@/types/employee";
import { v4 as uuidv4 } from "uuid";

export interface ActionState {
    success: boolean;
    message?: string;
    error?: string;
    fields?: Record<string, any>; // Dùng Record để tránh lỗi "Property does not exist"
}

// --- 1. HÀM TIỆN ÍCH (UTILS) ---

const cleanUUID = (value: any) => {
    if (!value || value === "" || value === "null" || value === "undefined") return null;
    return value;
};

/**
 * Xóa ảnh cũ khỏi Storage khi cập nhật hoặc xóa nhân viên
 */
async function deleteOldAvatar(url: string | null) {
    if (!url || !url.includes("avatars/")) return;
    try {
        const supabase = await createSupabaseServerClient();
        const fileName = url.split('/').pop();
        if (fileName) {
            await supabase.storage.from("avatars").remove([fileName]);
        }
    } catch (e) {
        console.error("Lỗi xóa ảnh cũ trên Storage:", e);
    }
}

/**
 * Hàm upload avatar (Dùng trong trường hợp bạn gửi File trực tiếp lên Server Action)
 */
export async function uploadAvatar(file: File) {
    const supabase = await createSupabaseServerClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(fileName, file);

    if (uploadError) throw uploadError;

    const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(fileName);

    return publicUrl;
}

// --- 2. TRUY VẤN DỮ LIỆU (QUERIES) ---

export async function getEmployees(queryStr: string = "") {
    const supabase = await createSupabaseServerClient();
    try {
        let query = supabase
            .from("employees")
            .select(`
                *,
                user_profiles ( 
                    id, 
                    avatar_url, 
                    auth_id, 
                    email 
                ),
                gender:sys_dictionaries!gender_id (id, code, name),
                position:sys_dictionaries!position_id (id, code, name),
                department:sys_dictionaries!department_id (id, code, name),
                status:sys_dictionaries!status_id (id, code, name, color),
                contract_type:sys_dictionaries!contract_type_id (id, code, name),
                marital_status:sys_dictionaries!marital_status_id (id, code, name)
            `)
            .order("created_at", { ascending: false });

        if (queryStr) {
            query = query.or(`name.ilike.%${queryStr}%,code.ilike.%${queryStr}%`);
        }

        const { data: employees, error: empError } = await query;

        if (empError) {
            // Log chi tiết để xử lý triệt để
            console.error("Supabase Query Error:", empError.message, empError.details);
            throw empError;
        }

        const formattedData = employees.map((emp: any) => {
            // Tránh lỗi nếu user_profiles trả về array hoặc null
            const profile = Array.isArray(emp.user_profiles) ? emp.user_profiles[0] : emp.user_profiles;
            return {
                ...emp,
                avatar_url: profile?.avatar_url || null,
                has_account: !!profile?.auth_id,
                user_profiles: profile || null
            };
        });

        return { data: formattedData, error: null };
    } catch (error: any) {
        console.error("Lỗi getEmployees:", error);
        return { data: [], error: error.message || "Lỗi tải dữ liệu" };
    }
}

export async function getEmployeeById(id: string) {
    const supabase = await createSupabaseServerClient();
    try {
        const { data: emp, error: empError } = await supabase
            .from("employees")
            .select("*, user_profiles:id(*)")
            .eq("id", id)
            .single();

        if (empError || !emp) return null;

        const profile = Array.isArray(emp.user_profiles) ? emp.user_profiles[0] : emp.user_profiles;
        return {
            ...emp,
            avatar_url: profile?.avatar_url || emp.avatar_url || null,
            user_profiles: profile || null
        };
    } catch (error) {
        console.error("Lỗi getEmployeeById:", error);
        return null;
    }
}

// --- 3. THAO TÁC DỮ LIỆU (ACTIONS) ---

// --- 1. TẠO HỒ SƠ NHÂN VIÊN MỚI (Sửa để khớp useActionState) ---
export async function createEmployee(prevState: any, formData: FormData) {
    const supabase = await createSupabaseServerClient();
    const rawData = Object.fromEntries(formData.entries());

    try {
        const sharedId = uuidv4();

        // Lấy type_id cho 'EMPLOYEE' từ từ điển
        const { data: typeData } = await supabase
            .from("sys_dictionaries")
            .select("id")
            .eq("code", "EMPLOYEE")
            .eq("category", "USER_TYPE")
            .single();

        if (!typeData) throw new Error("Chưa cấu hình loại nhân viên trong hệ thống.");

        // B1: TẠO USER_PROFILE (ID chung)
        const { error: pError } = await supabase.from("user_profiles").insert({
            id: sharedId,
            type_id: typeData.id,
            name: String(rawData.name),
            email: String(rawData.email),
            avatar_url: String(rawData.avatar_url || ""),
            role_id: cleanUUID(rawData.role_id) // Sử dụng cột role_id mới
        });
        if (pError) throw pError;

        // B2: TẠO EMPLOYEE (Không truyền 'code' để Trigger tự sinh mã)
        const { error: eError } = await supabase.from("employees").insert({
            id: sharedId,
            name: String(rawData.name),
            email: String(rawData.email),
            phone: String(rawData.phone),
            address: String(rawData.address),
            identity_card: String(rawData.identity_card),
            basic_salary: Number(rawData.basic_salary) || 0,
            gender_id: cleanUUID(rawData.gender_id),
            department_id: cleanUUID(rawData.department_id),
            position_id: cleanUUID(rawData.position_id),
            status_id: cleanUUID(rawData.status_id),
            contract_type_id: cleanUUID(rawData.contract_type_id),
            marital_status_id: cleanUUID(rawData.marital_status_id),
            hire_date: rawData.hire_date ? String(rawData.hire_date) : null,
            birth_date: rawData.birth_date ? String(rawData.birth_date) : null
        });

        if (eError) {
            // Rollback nếu lỗi
            await supabase.from("user_profiles").delete().eq("id", sharedId);
            throw eError;
        }

        revalidatePath("/hrm/employees");
        return { success: true, message: "Thêm nhân viên thành công!", fields: {} };

    } catch (error: any) {
        return { success: false, error: error.message, fields: rawData }; // Giữ lại dữ liệu đã nhập
    }
}

export async function updateEmployee(id: string, prevState: any, formData: FormData) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const rawData = Object.fromEntries(formData.entries());

    try {
        // Cập nhật bảng Employees
        const { error: eError } = await supabaseAdmin.from("employees").update({
            name: String(rawData.name),
            phone: String(rawData.phone),
            address: String(rawData.address),
            identity_card: String(rawData.identity_card),
            basic_salary: Number(rawData.basic_salary) || 0,
            gender_id: cleanUUID(rawData.gender_id),
            department_id: cleanUUID(rawData.department_id),
            position_id: cleanUUID(rawData.position_id),
            status_id: cleanUUID(rawData.status_id),
            contract_type_id: cleanUUID(rawData.contract_type_id),
            marital_status_id: cleanUUID(rawData.marital_status_id),
            hire_date: rawData.hire_date ? String(rawData.hire_date) : null,
            birth_date: rawData.birth_date ? String(rawData.birth_date) : null,
            updated_at: new Date().toISOString()
        }).eq("id", id);

        if (eError) throw eError;

        // Cập nhật bảng Profiles
        await supabaseAdmin.from("user_profiles").update({
            name: String(rawData.name),
            email: String(rawData.email),
            avatar_url: String(rawData.avatar_url || ""),
            updated_at: new Date().toISOString()
        }).eq("id", id);

        revalidatePath(`/hrm/employees/${id}`);
        revalidatePath("/hrm/employees");
        return { success: true, message: "Cập nhật thành công!", fields: rawData };
    } catch (error: any) {
        return { success: false, error: error.message, fields: rawData };
    }
}

// --- 4. QUẢN LÝ TÀI KHOẢN HỆ THỐNG (AUTH) ---

export async function grantSystemAccess(entityId: string, email: string, typeCode: 'EMPLOYEE' | 'CUSTOMER' | 'SUPPLIER') {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        // ✅ Tìm trực tiếp trong user_profiles bằng entityId (vì dùng Shared ID)
        const { data: profile, error: pError } = await supabaseAdmin
            .from("user_profiles")
            .select("id, name")
            .eq("id", entityId)
            .single();

        if (pError || !profile) {
            console.error("Lỗi tìm profile:", pError);
            throw new Error("Không tìm thấy hồ sơ gốc trong hệ thống.");
        }

        // Tạo tài khoản Auth
        const { data: authData, error: aError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: "KieuGia@123456",
            email_confirm: true,
            user_metadata: { full_name: profile.name, user_type: typeCode }
        });

        if (aError) throw aError;

        // Cập nhật auth_id vào Profile
        const { error: uError } = await supabaseAdmin
            .from("user_profiles")
            .update({ auth_id: authData.user.id })
            .eq("id", profile.id);

        if (uError) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw uError;
        }

        revalidatePath("/hrm/employees");
        return { success: true, message: "Cấp tài khoản thành công!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}
export async function revokeSystemAccess(employeeId: string) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { data: profile } = await supabaseAdmin.from("user_profiles").select("auth_id").eq("id", employeeId).single();
        if (profile?.auth_id) {
            await supabaseAdmin.auth.admin.deleteUser(profile.auth_id);
            await supabaseAdmin.from("user_profiles").update({ auth_id: null }).eq("id", employeeId);
        }
        revalidatePath("/hrm/employees");
        return { success: true, message: "Đã thu hồi quyền truy cập." };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

export async function deleteEmployee(id: string) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    try {
        const { data: profile } = await supabaseAdmin.from("user_profiles").select("auth_id").eq("id", id).single();

        if (profile?.auth_id) {
            await supabaseAdmin.auth.admin.deleteUser(profile.auth_id);
            await supabaseAdmin.from("user_profiles").update({ auth_id: null }).eq("id", id);
        }

        const { data: statusDict } = await supabaseAdmin.from("sys_dictionaries").select("id").eq("code", "RESIGNED").single();
        await supabaseAdmin.from("employees").update({ status_id: statusDict?.id }).eq("id", id);

        revalidatePath("/hrm/employees");
        return { success: true, message: "Hồ sơ nhân viên đã được đóng." };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}