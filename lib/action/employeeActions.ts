"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createClient } from "@supabase/supabase-js";
import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { isValidUUID } from "@/lib/utils/uuid";
import {
    GetEmployeesParams,
    GetEmployeesResult,
    Employee,
    ActionResponse
} from "@/types/employee";

// --- 1. HÀM TIỆN ÍCH (UTILS) ---

const cleanUUID = (value: any) => {
    if (!value || value === "" || value === "null" || value === "undefined") return null;
    return value;
};

/**
 * Xóa ảnh cũ khỏi Storage bằng quyền ADMIN (Bypass RLS)
 */
async function deleteOldAvatar(url: string | null) {
    if (!url) return;

    try {
        const pathPart = url.split("/avatars/").pop();
        if (!pathPart) return;

        // Làm sạch URL (bỏ query params, hash) và decode
        const cleanPath = pathPart.split("?")[0].split("#")[0];
        const fileName = decodeURIComponent(cleanPath);

        console.log("🗑️ Đang xóa file rác:", fileName);

        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error } = await supabaseAdmin.storage
            .from("avatars")
            .remove([fileName]);

        if (error) {
            console.error("⚠️ Lỗi xóa file Storage:", error.message);
        }
    } catch (e) {
        console.error("❌ Exception xóa ảnh cũ:", e);
    }
}

// --- 2. TRUY VẤN DỮ LIỆU (QUERIES) ---

/**
 * Hàm lấy danh sách nhân viên (Đã chuẩn hóa để khớp với UI Client Page)
 * Hỗ trợ: Tìm kiếm, Lọc, Phân trang, Check tài khoản Active
 */
export async function getEmployees(params?: GetEmployeesParams): Promise<GetEmployeesResult> {
    const supabase = await createSupabaseServerClient();

    // ✅ FIX QUAN TRỌNG: Nếu params là undefined hoặc null thì gán bằng object rỗng {}
    const safeParams = params || {};
    const { search, status, department, page = 1, limit = 10 } = safeParams;

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    // --- LOGIC JOIN (Giữ nguyên như trước) ---
    const deptRelation = (department && department !== "Tất cả")
        ? "sys_dictionaries!department_id!inner"
        : "sys_dictionaries!department_id";

    const statusRelation = (status && status !== "Tất cả")
        ? "sys_dictionaries!status_id!inner"
        : "sys_dictionaries!status_id";

    let query = supabase
        .from("employees")
        .select(`
            *,
            department:${deptRelation}(name),
            status:${statusRelation}(name),
            position:sys_dictionaries!position_id(name),
            user_profiles!left ( auth_id, avatar_url ) 
        `, { count: 'exact' });

    // --- Áp dụng bộ lọc ---
    if (search) {
        query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (department && department !== "Tất cả") {
        query = query.eq('department.name', department);
    }

    if (status && status !== "Tất cả") {
        query = query.eq('status.name', status);
    }

    // --- Thực thi ---
    const { data, error, count } = await query
        .range(from, to)
        .order('created_at', { ascending: false });

    if (error) {
        console.error("Error fetching employees:", error);
        return { employees: [], totalCount: 0 };
    }

    // --- Map dữ liệu ---
    const formattedEmployees: Employee[] = data.map((emp: any) => ({
        id: emp.id,
        code: emp.code,
        name: emp.name,
        email: emp.email,
        phone: emp.phone,

        department: emp.department?.name || null,
        position: emp.position?.name || null,
        status: emp.status?.name || null,

        hire_date: emp.hire_date,
        avatar_url: emp.user_profiles?.[0]?.avatar_url || emp.user_profiles?.avatar_url || null,

        has_account: !!(Array.isArray(emp.user_profiles)
            ? emp.user_profiles[0]?.auth_id
            : emp.user_profiles?.auth_id),
    }));

    return {
        employees: formattedEmployees,
        totalCount: count || 0
    };
}

export async function getEmployeeById(id: string) {
    const supabase = await createSupabaseServerClient();
    if (!isValidUUID(id)) return null;

    try {
        const { data: emp, error: empError } = await supabase
            .from("employees")
            .select("*, user_profiles (*)")
            .eq("id", id)
            .single();

        if (empError || !emp) return null;

        const profile = Array.isArray(emp.user_profiles) ? emp.user_profiles[0] : emp.user_profiles;
        return {
            ...emp,
            avatar_url: profile?.avatar_url || emp.avatar_url || null,
            user_profiles: profile || null
        };
    } catch (error: any) {
        console.error("Exception getEmployeeById:", error.message);
        return null;
    }
}

/**
 * Lấy danh sách quản lý dự án (Merge từ hrmActions cũ sang)
 */
export async function getProjectManagers() {
    const supabase = await createSupabaseServerClient();
    const MANAGER_RANKS = ["Trưởng phòng", "Phó phòng", "Giám đốc", "Phó giám đốc", "Quản lý", "Project Manager", "Team Lead"];

    // Lưu ý: Cần điều chỉnh query này khớp với dữ liệu thực tế (VD: check theo position_id hoặc bảng lương)
    // Đây là logic tạm thời dựa trên text
    const { data } = await supabase
        .from("employees")
        .select("id, name, code, position:sys_dictionaries!position_id(name)")
        .limit(100);

    // Filter phía code nếu query phức tạp
    if (!data) return [];

    return data.filter((emp: any) => MANAGER_RANKS.includes(emp.position?.name))
        .map((emp: any) => ({
            id: emp.id,
            name: emp.name,
            code: emp.code,
            position: emp.position?.name
        }));
}

// --- 3. ACTIONS (CREATE / UPDATE / DELETE / AUTH) ---

export async function createEmployee(prevState: any, formData: FormData) {
    // ✅ Dùng Admin Client để bypass RLS, tránh việc bị chặn ngầm khi Insert
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });
    const rawData = Object.fromEntries(formData.entries());

    try {
        const sharedId = uuidv4();
        // Lấy Type ID
        const { data: typeData } = await supabaseAdmin
            .from("sys_dictionaries")
            .select("id").eq("code", "EMPLOYEE").eq("category", "USER_TYPE").single();

        if (!typeData) throw new Error("Chưa cấu hình loại nhân viên (USER_TYPE) trong từ điển.");

        // ✅ ĐÃ FIX: Truyền thêm sharedId vào để tính toán phân cấp
        const autoManagerId = await findDepartmentManagerId(supabaseAdmin, cleanUUID(rawData.department_id), sharedId);

        // B1: TẠO USER_PROFILE
        const { error: pError } = await supabaseAdmin.from("user_profiles").insert({
            id: sharedId,
            type_id: typeData.id,
            name: String(rawData.name),
            email: String(rawData.email),
            avatar_url: String(rawData.avatar_url || ""),
            role_id: cleanUUID(rawData.role_id)
        });
        if (pError) throw pError;

        // B2: TẠO EMPLOYEE (Lưu Full các trường theo Schema)
        const { error: eError } = await supabaseAdmin.from("employees").insert({
            id: sharedId,
            name: String(rawData.name),
            email: String(rawData.email), // ✅ Đã bổ sung Email
            phone: String(rawData.phone || ""),
            address: String(rawData.address || ""),
            current_address: String(rawData.current_address || ""),
            place_of_birth: String(rawData.place_of_birth || ""),

            identity_card: String(rawData.identity_card || ""),
            identity_date: rawData.identity_date ? String(rawData.identity_date) : null,
            identity_place: String(rawData.identity_place || ""),

            tax_code: String(rawData.tax_code || ""),
            bank_name: String(rawData.bank_name || ""),
            bank_account: String(rawData.bank_account || ""),

            basic_salary: Number(rawData.basic_salary) || 0,
            gender_id: cleanUUID(rawData.gender_id),
            department_id: cleanUUID(rawData.department_id),
            position_id: cleanUUID(rawData.position_id),
            status_id: cleanUUID(rawData.status_id),
            contract_type_id: cleanUUID(rawData.contract_type_id),
            marital_status_id: cleanUUID(rawData.marital_status_id),
            hire_date: rawData.hire_date ? String(rawData.hire_date) : null,
            birth_date: rawData.birth_date ? String(rawData.birth_date) : null,

            manager_id: autoManagerId
        });

        if (eError) {
            await supabaseAdmin.from("user_profiles").delete().eq("id", sharedId);
            throw eError;
        }

        //revalidatePath("/hrm/employees", "layout"); // ✅ Phá vỡ toàn bộ Cache
        return { success: true, message: "Thêm nhân viên thành công!", fields: {} };
    } catch (error: any) {
        console.error("❌ Lỗi Create Employee:", error);
        return { success: false, error: error.message, fields: rawData };
    }
}

export async function updateEmployee(id: string, prevState: any, formData: FormData) {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const rawData = Object.fromEntries(formData.entries());

    try {
        const { data: oldData } = await supabaseAdmin.from("user_profiles").select("avatar_url").eq("id", id).single();
        const newAvatarUrl = String(rawData.avatar_url || "");

        if (oldData?.avatar_url && newAvatarUrl !== oldData.avatar_url) {
            await deleteOldAvatar(oldData.avatar_url);
        }

        // ✅ ĐÃ FIX: Truyền thêm id của nhân viên đang update vào để check xem có phải sếp không
        const autoManagerId = await findDepartmentManagerId(supabaseAdmin, cleanUUID(rawData.department_id), id);

        // ✅ B2: ÉP SUPABASE PHẢI TRẢ VỀ DỮ LIỆU BẰNG .select() ĐỂ TRÁNH SILENT FAIL
        const { data: updatedEmp, error: eError } = await supabaseAdmin.from("employees").update({
            name: String(rawData.name),
            email: String(rawData.email), // ✅ B1: Cập nhật Email bị thiếu
            phone: String(rawData.phone || ""),
            address: String(rawData.address || ""),
            current_address: String(rawData.current_address || ""),
            place_of_birth: String(rawData.place_of_birth || ""),

            identity_card: String(rawData.identity_card || ""),
            identity_date: rawData.identity_date ? String(rawData.identity_date) : null,
            identity_place: String(rawData.identity_place || ""),

            tax_code: String(rawData.tax_code || ""),
            bank_name: String(rawData.bank_name || ""),
            bank_account: String(rawData.bank_account || ""),

            basic_salary: Number(rawData.basic_salary) || 0,
            gender_id: cleanUUID(rawData.gender_id),
            department_id: cleanUUID(rawData.department_id),
            position_id: cleanUUID(rawData.position_id),
            status_id: cleanUUID(rawData.status_id),
            contract_type_id: cleanUUID(rawData.contract_type_id),
            marital_status_id: cleanUUID(rawData.marital_status_id),
            hire_date: rawData.hire_date ? String(rawData.hire_date) : null,
            birth_date: rawData.birth_date ? String(rawData.birth_date) : null,

            manager_id: autoManagerId,
            updated_at: new Date().toISOString()
        }).eq("id", id).select(); // <--- CHỐT CHẶN Ở ĐÂY

        if (eError) throw eError;

        // Nếu không có lỗi nhưng update được 0 dòng (ID sai)
        if (!updatedEmp || updatedEmp.length === 0) {
            throw new Error(`Không tìm thấy hồ sơ nhân viên để cập nhật (ID không khớp)!`);
        }

        // Cập nhật bảng user_profiles
        const { error: pError } = await supabaseAdmin.from("user_profiles").update({
            name: String(rawData.name),
            email: String(rawData.email),
            avatar_url: newAvatarUrl || null,
            updated_at: new Date().toISOString()
        }).eq("id", id);

        if (pError) throw pError;

        // ✅ B3: Phá vỡ toàn bộ Cache nhánh nhân sự
        //revalidatePath(`/hrm/employees/${id}`, 'page');
        //revalidatePath("/hrm/employees", 'layout');

        return { success: true, message: "Cập nhật thành công!", fields: rawData };
    } catch (error: any) {
        console.error("❌ Lỗi Update Employee:", error);
        return { success: false, error: error.message, fields: rawData };
    }
}

export async function grantSystemAccess(entityId: string, email: string, typeCode: 'EMPLOYEE' | 'CUSTOMER' | 'SUPPLIER'): Promise<ActionResponse> {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseAdmin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey!, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    console.log(`🚀 Bắt đầu cấp quyền cho ID: ${entityId}, Email: ${email}`);

    try {
        const { data: profile, error: pError } = await supabaseAdmin
            .from("user_profiles")
            .select("id, name, auth_id")
            .eq("id", entityId)
            .single();

        if (pError || !profile) return { success: false, error: "Không tìm thấy hồ sơ nhân viên này." };
        if (profile.auth_id) return { success: false, error: "Nhân viên này đã có tài khoản rồi." };

        const { data: authData, error: aError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: "KieuGia@123456",
            email_confirm: true,
            user_metadata: {
                full_name: profile.name,
                user_type: typeCode,
                entity_id: entityId
            }
        });

        if (aError) {
            if (aError.message.includes("already registered") || aError.status === 422) {
                return { success: false, error: "Email này đã được đăng ký tài khoản." };
            }
            throw aError;
        }

        if (!authData.user) throw new Error("Không tạo được user.");

        const { error: uError } = await supabaseAdmin
            .from("user_profiles")
            .update({
                auth_id: authData.user.id,
                email: email
            })
            .eq("id", profile.id);

        if (uError) {
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            throw uError;
        }

        const { error: eUpdateError } = await supabaseAdmin
            .from("employees")
            .update({
                auth_id: authData.user.id // Giả định sếp đã thêm cột auth_id vào bảng employees
            })
            .eq("id", profile.id);

        if (eUpdateError) {
            console.error("⚠️ Lỗi cập nhật auth_id cho employees nhưng profile đã xong:", eUpdateError.message);
            // Tùy sếp muốn rollback hay không, thường thì nên để nó chạy tiếp hoặc log lại
        }

        revalidatePath("/hrm/employees");
        return { success: true, message: "Cấp tài khoản thành công! Mật khẩu: KieuGia@123456" };
    } catch (error: any) {
        console.error("❌ Lỗi grantSystemAccess:", error);
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
            await supabaseAdmin.from("employees").update({ auth_id: null }).eq("id", employeeId);
        } else {
            return { success: false, error: "Nhân viên chưa có tài khoản." };
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
        const { data: profile } = await supabaseAdmin.from("user_profiles").select("auth_id, avatar_url").eq("id", id).single();

        if (profile?.auth_id) {
            await supabaseAdmin.auth.admin.deleteUser(profile.auth_id);
            await supabaseAdmin.from("user_profiles").update({ auth_id: null }).eq("id", id);
        }

        if (profile?.avatar_url) {
            await deleteOldAvatar(profile.avatar_url);
        }

        // Thay vì xóa cứng, ta set status thành "Đã nghỉ việc" (RESIGNED)
        const { data: statusDict } = await supabaseAdmin.from("sys_dictionaries").select("id").eq("code", "RESIGNED").single();
        await supabaseAdmin.from("employees").update({ status_id: statusDict?.id }).eq("id", id);

        revalidatePath("/hrm/employees");
        return { success: true, message: "Đã xóa hồ sơ nhân viên thành công." };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// --- HÀM TÌM MANAGER TỰ ĐỘNG (Thêm hàm này vào trên createEmployee) ---
async function findDepartmentManagerId(supabase: any, departmentId: string | null, employeeId?: string | null) {
    if (!departmentId) return null;

    try {
        // 1. Tìm Trưởng phòng của phòng ban HIỆN TẠI
        const { data: currentDept } = await supabase
            .from("sys_dictionaries")
            .select(`id, meta_data`)
            .eq("id", departmentId)
            .single();

        if (!currentDept) return null;

        const { data: currentMgrData } = await supabase
            .from("department_managers")
            .select("manager_id")
            .eq("department_id", departmentId)
            .single();

        const currentManagerId = currentMgrData?.manager_id || null;
        const parentDeptId = currentDept.meta_data?.parent_id || null;

        // 2. LOGIC PHÂN CẤP:
        // Nếu nhân viên đang xử lý CHÍNH LÀ Trưởng phòng hiện tại -> Phải tìm sếp của họ ở phòng ban CHA
        if (employeeId && currentManagerId === employeeId) {
            if (!parentDeptId) return null; // Là trùm cuối rồi, không có ai ở trên

            // Dò ngược lên phòng ban CHA để tìm ID Trưởng phòng cha
            const { data: parentMgrData } = await supabase
                .from("department_managers")
                .select("manager_id")
                .eq("department_id", parentDeptId)
                .single();

            return parentMgrData?.manager_id || null;
        }

        // 3. Nếu là nhân viên bình thường -> Quản lý là Trưởng phòng hiện tại
        return currentManagerId;

    } catch (e) {
        console.error("❌ Lỗi logic tìm manager_id:", e);
        return null;
    }
}