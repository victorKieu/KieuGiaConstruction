"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { EmployeeData, EmployeeFormData } from "@/types/employee";
import { getCurrentSession } from "@/lib/supabase/session";
import { v4 as uuidv4 } from "uuid";

// --- 1. LẤY DANH SÁCH NHÂN VIÊN ---
export async function getEmployees(queryStr: string = "") {
    const supabase = await createSupabaseServerClient();

    let query = supabase
        .from("employees")
        .select(`
            *,
            gender:sys_dictionaries!gender_id (id, code, name),
            position:sys_dictionaries!position_id (id, code, name),
            department:sys_dictionaries!department_id (id, code, name),
            status:sys_dictionaries!status_id (id, code, name, color),
            contract_type:sys_dictionaries!contract_type_id (id, code, name),
            marital_status:sys_dictionaries!marital_status_id (id, code, name),
            user_profiles:user_profiles!auth_id (
                avatar_url
            )
        `)
        .order("created_at", { ascending: false });

    if (queryStr) {
        query = query.or(`name.ilike.%${queryStr}%,code.ilike.%${queryStr}%,email.ilike.%${queryStr}%`);
    }

    const { data, error } = await query;

    if (error) {
        console.error("Lỗi lấy danh sách NV: " + error.message);
        return { data: [], error: error.message };
    }

    return { data: data as any[], error: null };
}

// --- 2. TẠO HỒ SƠ NHÂN VIÊN MỚI ---
export async function createEmployee(formData: EmployeeFormData) {
    const session = await getCurrentSession();
    if (session.role !== 'admin' && session.role !== 'manager') {
        return { success: false, error: "Bạn không có quyền này." };
    }

    const supabase = await createSupabaseServerClient();

    try {
        const tempProfileId = uuidv4();

        const { data: typeData } = await supabase
            .from("sys_dictionaries")
            .select("id")
            .eq("code", "EMPLOYEE")
            .single();

        // Tạo profile chờ để lưu avatar
        const { error: profileError } = await supabase.from("user_profiles").insert({
            id: tempProfileId,
            name: formData.name,
            email: formData.email,
            avatar_url: formData.avatar_url || null,
            type_id: typeData?.id
        });

        if (profileError) throw profileError;

        // Tạo nhân viên liên kết với profile ảo
        const { error: empError } = await supabase.from("employees").insert({
            code: formData.code,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            identity_card: formData.identity_card,
            gender_id: formData.gender_id || null,
            department_id: formData.department_id || null,
            position_id: formData.position_id || null,
            status_id: formData.status_id || null,
            contract_type_id: formData.contract_type_id || null,
            marital_status_id: formData.marital_status_id || null,
            basic_salary: formData.basic_salary || 0,
            hire_date: formData.hire_date || new Date().toISOString(),
            auth_id: tempProfileId
        });

        if (empError) throw empError;

        revalidatePath("/hrm/employees");
        return { success: true, message: "Đã tạo hồ sơ nhân viên thành công." };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- 3. LẤY CHI TIẾT NHÂN VIÊN ---
export async function getEmployeeById(id: string) {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
        .from("employees")
        .select(`
            *,
            user_profiles:user_profiles!auth_id ( avatar_url )
        `)
        .eq("id", id)
        .single();

    if (error) return null;

    return {
        ...data,
        avatar_url: (data.user_profiles as any)?.avatar_url || null
    };
}

// --- 4. CẬP NHẬT HỒ SƠ ---
export async function updateEmployee(id: string, formData: EmployeeFormData) {
    const session = await getCurrentSession();
    const supabase = await createSupabaseServerClient();

    const { data: currentEmp } = await supabase.from("employees").select("auth_id").eq("id", id).single();
    if (!currentEmp) return { success: false, error: "Hồ sơ không tồn tại." };

    const isAdmin = session.role === 'admin' || session.role === 'manager';
    const isOwner = currentEmp.auth_id === session.id;

    if (!isAdmin && !isOwner) return { success: false, error: "Unauthorized" };

    try {
        const employeePayload: any = {
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            identity_card: formData.identity_card,
            gender_id: formData.gender_id,
            marital_status_id: formData.marital_status_id,
            birth_date: formData.birth_date,
            updated_at: new Date().toISOString(),
        };

        if (isAdmin) {
            Object.assign(employeePayload, {
                code: formData.code,
                name: formData.name,
                position_id: formData.position_id,
                department_id: formData.department_id,
                status_id: formData.status_id,
            });
        }

        const { error: empError } = await supabase.from("employees").update(employeePayload).eq("id", id);
        if (empError) throw empError;

        if (currentEmp.auth_id) {
            await supabase.from("user_profiles").update({
                avatar_url: formData.avatar_url || null,
                updated_at: new Date().toISOString()
            }).eq("id", currentEmp.auth_id);
        }

        revalidatePath('/', 'layout');
        revalidatePath('/hrm/employees');
        return { success: true, message: "Cập nhật thành công!" };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- 5. CẤP TÀI KHOẢN ---
export async function grantSystemAccess(employeeId: string, email: string) {
    const session = await getCurrentSession();
    if (session.role !== 'admin') return { success: false, error: "Unauthorized" };

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const { data: emp } = await supabaseAdmin.from("employees").select("auth_id, name").eq("id", employeeId).single();

    const { data: existingAuth } = await supabaseAdmin.auth.admin.listUsers();
    if (existingAuth.users.find(u => u.email === email)) return { success: false, error: "Email đã có tài khoản." };

    const defaultPassword = "KieuGia@123456";
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
    });

    if (createError) return { success: false, error: createError.message };
    const newAuthId = user.user.id;

    const oldTempId = emp?.auth_id;
    if (oldTempId) {
        const { data: oldProfile } = await supabaseAdmin.from("user_profiles").select("*").eq("id", oldTempId).single();
        if (oldProfile) {
            // Chuyển dữ liệu sang ID thật và xóa ID ảo
            await supabaseAdmin.from("user_profiles").upsert({ ...oldProfile, id: newAuthId });
            await supabaseAdmin.from("user_profiles").delete().eq("id", oldTempId);
        }
    }

    await supabaseAdmin.from("employees").update({ auth_id: newAuthId }).eq("id", employeeId);

    revalidatePath("/hrm/employees");
    return { success: true, message: `Cấp thành công! Pass: ${defaultPassword}` };
}

// --- 6. XÓA & THU HỒI ---
export async function deleteEmployee(id: string) {
    const session = await getCurrentSession();
    if (session.role !== 'admin') return { success: false, error: "Unauthorized" };

    const supabase = await createSupabaseServerClient();
    const { data: statusData } = await supabase.from("sys_dictionaries").select("id").eq("code", "RESIGNED").single();

    await supabase.from("employees").update({
        status_id: statusData?.id,
        auth_id: null,
        updated_at: new Date().toISOString()
    }).eq("id", id);

    revalidatePath("/hrm/employees");
    return { success: true, message: "Hồ sơ đã được đóng." };
}

export async function revokeSystemAccess(employeeId: string) {
    const session = await getCurrentSession();
    if (session.role !== 'admin') return { success: false, error: "Unauthorized" };

    const supabase = await createSupabaseServerClient();
    await supabase.from("employees").update({ auth_id: null }).eq("id", employeeId);

    revalidatePath("/hrm/employees");
    return { success: true, message: "Đã thu hồi quyền." };
}