"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { EmployeeFormData } from "@/types/employee";
import { getCurrentSession } from "@/lib/supabase/session";
import { v4 as uuidv4 } from "uuid";

// Hàm tiện ích: Làm sạch UUID
const cleanUUID = (value: any) => {
    if (!value || value === "" || value === "null" || value === "undefined") return null;
    return value;
};

// Hàm tiện ích: Xóa ảnh cũ
async function deleteOldAvatar(url: string | null) {
    if (!url || !url.includes("avatars/")) return;
    try {
        const supabase = await createSupabaseServerClient();
        const fileName = url.split('/').pop();
        if (fileName) await supabase.storage.from("avatars").remove([fileName]);
    } catch (e) { console.error("Lỗi xóa ảnh cũ:", e); }
}

// --- 1. LẤY DANH SÁCH NHÂN VIÊN ---
export async function getEmployees(queryStr: string = "") {
    const supabase = await createSupabaseServerClient();

    try {
        // BƯỚC 1: Query bảng Employees (Bảng dữ liệu chính)
        let query = supabase
            .from("employees")
            .select(`
                *,
                gender:sys_dictionaries!gender_id (id, code, name),
                position:sys_dictionaries!position_id (id, code, name),
                department:sys_dictionaries!department_id (id, code, name),
                status:sys_dictionaries!status_id (id, code, name, color),
                contract_type:sys_dictionaries!contract_type_id (id, code, name),
                marital_status:sys_dictionaries!marital_status_id (id, code, name)
            `)
            .order("created_at", { ascending: false });

        if (queryStr) {
            query = query.or(`name.ilike.%${queryStr}%,code.ilike.%${queryStr}%,email.ilike.%${queryStr}%`);
        }

        const { data: employees, error: empError } = await query;

        if (empError) {
            console.error("Lỗi query employees:", empError);
            throw empError;
        }

        // BƯỚC 2: Query bảng User Profiles (Để lấy Avatar & Trạng thái TK)
        // Kỹ thuật: Lấy tất cả Profile có ID nằm trong danh sách nhân viên vừa tải
        const empIds = employees.map((e: any) => e.id);

        let profiles: any[] = [];
        if (empIds.length > 0) {
            const { data: profileData, error: proError } = await supabase
                .from("user_profiles")
                .select("id, avatar_url, auth_id, email")
                .in("id", empIds); // Tìm profile theo ID nhân viên (Shared ID)

            if (proError) {
                console.error("Lỗi query profiles:", proError);
            }
            profiles = profileData || [];
        }

        // BƯỚC 3: Gộp dữ liệu (Merge Data)
        // Tạo Map để tra cứu nhanh: ID -> Profile
        const profileMap = new Map(profiles.map(p => [p.id, p]));

        const formattedData = employees.map((emp: any) => {
            const profile = profileMap.get(emp.id);
            return {
                ...emp,
                // Ưu tiên lấy avatar từ Profile (nơi lưu chính thức), fallback về Employee nếu có
                avatar_url: profile?.avatar_url || emp.avatar_url || null,

                // Kiểm tra xem nhân viên này đã được cấp tài khoản chưa?
                // (Nếu profile có auth_id khác null -> Đã Active)
                has_account: !!profile?.auth_id,

                // Gắn kèm object profile để UI dùng thêm nếu cần
                user_profiles: profile || null
            };
        });

        return { data: formattedData, error: null };

    } catch (error: any) {
        console.error("Exception getEmployees:", error);
        return { data: [], error: error.message || "Lỗi tải dữ liệu" };
    }
}

// --- 2. TẠO HỒ SƠ NHÂN VIÊN MỚI ---
export async function createEmployee(formData: EmployeeFormData) {
    const session = await getCurrentSession();
    const supabase = await createSupabaseServerClient();

    try {
        const sharedId = uuidv4(); // Shared ID

        // ✅ BƯỚC 0: LẤY TYPE_ID CHO "EMPLOYEE"
        // Bạn cần đảm bảo trong bảng sys_dictionaries đã có dòng có code='EMPLOYEE'
        const { data: typeData, error: typeError } = await supabase
            .from("sys_dictionaries")
            .select("id")
            .eq("code", "EMPLOYEE") // ⚠️ Đảm bảo code trong DB là 'EMPLOYEE' (hoặc 'STAFF' tùy bạn đặt)
            // .eq("category", "USER_TYPE") // Nên thêm điều kiện category nếu cần chính xác hơn
            .single();

        if (!typeData) {
            throw new Error("Lỗi hệ thống: Chưa cấu hình loại tài khoản 'EMPLOYEE' trong từ điển.");
        }

        // BƯỚC 1: Insert Employee (Cha)
        const { error: empError } = await supabase.from("employees").insert({
            id: sharedId,
            name: formData.name,
            email: formData.email,
            phone: formData.phone,
            address: formData.address,
            identity_card: formData.identity_card,
            basic_salary: Number(formData.basic_salary) || 0,
            gender_id: cleanUUID(formData.gender_id),
            department_id: cleanUUID(formData.department_id),
            position_id: cleanUUID(formData.position_id),
            status_id: cleanUUID(formData.status_id),
            contract_type_id: cleanUUID(formData.contract_type_id),
            marital_status_id: cleanUUID(formData.marital_status_id),
            hire_date: formData.hire_date || null,
            birth_date: formData.birth_date || null
        });

        if (empError) throw empError;

        // BƯỚC 2: Insert Profile (Con)
        const { error: profileError } = await supabase.from("user_profiles").insert({
            id: sharedId,
            auth_id: null,

            // ✅ ĐÃ SỬA: Gán ID lấy được từ Bước 0 vào đây
            type_id: typeData.id,

            // user_type: 'EMPLOYEE', <-- Bỏ dòng này nếu bạn đã chuyển sang dùng type_id
            name: formData.name,
            email: formData.email,
            avatar_url: formData.avatar_url || null,
        });

        if (profileError) {
            await supabase.from("employees").delete().eq("id", sharedId);
            throw new Error("Lỗi tạo Profile: " + profileError.message);
        }

        revalidatePath("/hrm/employees");
        return { success: true, message: "Tạo thành công!" };

    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- 3. LẤY CHI TIẾT ---
export async function getEmployeeById(id: string) {
    const supabase = await createSupabaseServerClient();

    try {
        // BƯỚC 1: Lấy thông tin Employee
        const { data: emp, error: empError } = await supabase
            .from("employees")
            .select("*")
            .eq("id", id)
            .single();

        if (empError || !emp) {
            return null; // Trả về null để trang Page show 404
        }

        // BƯỚC 2: Lấy thông tin Profile (Dùng chung ID)
        const { data: profile } = await supabase
            .from("user_profiles")
            .select("*") // Lấy hết để form có dữ liệu (avatar, email, auth_id...)
            .eq("id", id)
            .single();

        // BƯỚC 3: Merge dữ liệu
        return {
            ...emp,
            // Ưu tiên avatar từ profile
            avatar_url: profile?.avatar_url || emp.avatar_url || null,
            // Gắn profile vào để Form sử dụng (hiển thị ảnh, check tk active...)
            user_profiles: profile || null
        };

    } catch (error) {
        console.error("Lỗi getEmployeeById:", error);
        return null;
    }
}

// --- 4. CẬP NHẬT HỒ SƠ (FIXED) ---
export async function updateEmployee(id: string, formData: EmployeeFormData) {
    const session = await getCurrentSession();
    // Check quyền Admin...
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        // Update bảng Employees
        await supabaseAdmin.from("employees").update({
            updated_at: new Date().toISOString(),
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            address: formData.address,
            identity_card: formData.identity_card,
            basic_salary: Number(formData.basic_salary) || 0,
            hire_date: formData.hire_date || null,
            birth_date: formData.birth_date || null,

            gender_id: cleanUUID(formData.gender_id),
            marital_status_id: cleanUUID(formData.marital_status_id),
            position_id: cleanUUID(formData.position_id),
            department_id: cleanUUID(formData.department_id),
            status_id: cleanUUID(formData.status_id),
            contract_type_id: cleanUUID(formData.contract_type_id),
        }).eq("id", id);

        // Update bảng User Profiles (Dựa vào shared ID)
        const { data: oldProfile } = await supabaseAdmin
            .from("user_profiles")
            .select("avatar_url")
            .eq("id", id)
            .single();

        await supabaseAdmin.from("user_profiles").update({
            name: formData.name,
            avatar_url: formData.avatar_url || null,
            updated_at: new Date().toISOString()
        }).eq("id", id);

        // Xóa ảnh cũ
        if (oldProfile?.avatar_url && oldProfile.avatar_url !== formData.avatar_url) {
            await deleteOldAvatar(oldProfile.avatar_url);
        }

        revalidatePath(`/hrm/employees/${id}`);
        revalidatePath('/hrm/employees');
        return { success: true, message: "Cập nhật thành công!" };

    } catch (error: any) {
        return { success: false, error: "Lỗi cập nhật: " + error.message };
    }
}

// --- 5. CẤP TÀI KHOẢN (Chuyển đổi ID: EmployeeID -> AuthID) ---
export async function grantSystemAccess(employeeId: string, email: string) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Lấy thông tin từ Profile (đã có sẵn với ID = employeeId)
    const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("name, auth_id")
        .eq("id", employeeId)
        .single();

    if (profile?.auth_id) return { success: false, error: "Nhân viên này đã có tài khoản!" };

    // 2. Tạo User Auth mới
    const defaultPassword = "KieuGia@123456";
    const { data: user, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: defaultPassword,
        email_confirm: true,
        user_metadata: { full_name: profile?.name }
    });

    if (createError) return { success: false, error: createError.message };

    // 3. Cập nhật auth_id vào bảng user_profiles
    // Đây là bước "Link" tài khoản đăng nhập vào hồ sơ có sẵn
    await supabaseAdmin
        .from("user_profiles")
        .update({ auth_id: user.user.id })
        .eq("id", employeeId); // Tìm đúng profile có ID == EmployeeID

    revalidatePath("/hrm/employees");
    return { success: true, message: `Cấp thành công! Pass: ${defaultPassword}` };
}

// --- 6. XÓA NHÂN VIÊN (Cập nhật) ---
export async function deleteEmployee(id: string) {
    const session = await getCurrentSession();
    if (session.role !== 'admin') return { success: false, error: "Unauthorized" };

    const supabase = await createSupabaseServerClient();

    // 1. Khởi tạo Admin Client để thao tác với Auth User
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceRoleKey!,
        { auth: { autoRefreshToken: false, persistSession: false } }
    );

    try {
        // 2. Lấy thông tin Auth ID cũ trước khi xóa/update
        const { data: empData } = await supabaseAdmin
            .from("employees")
            .select("auth_id, user_profiles:auth_id(avatar_url)")
            .eq("id", id)
            .single();

        // 3. Xóa tài khoản Login bên Supabase Auth (QUAN TRỌNG NHẤT)
        // Nếu không làm bước này, họ vẫn đăng nhập được!
        if (empData?.auth_id) {
            await supabaseAdmin.auth.admin.deleteUser(empData.auth_id);
        }

        // 4. Xóa ảnh avatar (dọn dẹp)
        const avatarUrl = (empData?.user_profiles as any)?.avatar_url;
        if (avatarUrl) {
            await deleteOldAvatar(avatarUrl);
        }

        // 5. Cập nhật trạng thái nhân viên thành Đã nghỉ (RESIGNED)
        const { data: statusData } = await supabase
            .from("sys_dictionaries")
            .select("id")
            .eq("code", "RESIGNED") // Đảm bảo code này đúng trong DB
            .single();

        await supabase.from("employees").update({
            status_id: statusData?.id,
            auth_id: null, // Ngắt liên kết
            updated_at: new Date().toISOString()
        }).eq("id", id);

        // 6. Xóa profile ảo trong bảng user_profiles (nếu cần sạch sẽ)
        if (empData?.auth_id) {
            await supabaseAdmin.from("user_profiles").delete().eq("id", empData.auth_id);
        }

        revalidatePath("/hrm/employees");
        return { success: true, message: "Đã đóng hồ sơ và xóa tài khoản truy cập." };

    } catch (error: any) {
        console.error("Lỗi xóa NV:", error);
        return { success: false, error: error.message };
    }
}

// --- 7. THU HỒI QUYỀN TRUY CẬP (Cập nhật) ---
export async function revokeSystemAccess(employeeId: string) {
    // ... Khởi tạo Admin Client ...
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    // 1. Lấy auth_id từ profile
    const { data: profile } = await supabaseAdmin
        .from("user_profiles")
        .select("auth_id")
        .eq("id", employeeId)
        .single();

    if (profile?.auth_id) {
        // 2. Xóa user bên Auth
        await supabaseAdmin.auth.admin.deleteUser(profile.auth_id);

        // 3. Set auth_id về NULL trong profile
        await supabaseAdmin
            .from("user_profiles")
            .update({ auth_id: null })
            .eq("id", employeeId);
    }

    revalidatePath("/hrm/employees");
    return { success: true, message: "Đã thu hồi quyền truy cập." };
}