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
import crypto from 'crypto';

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
/**
 * HÀM THÊM MỚI NHÂN VIÊN (BẢN ĐẦY ĐỦ 100%)
 */
export async function createEmployee(formData: FormData) {
    try {
        const supabase = await createSupabaseServerClient();

        // 1. Trích xuất dữ liệu cơ bản
        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const avatar_url = formData.get("avatar_url") as string; // Lấy avatar từ form

        // ... (Các trường khác trích xuất như bình thường)
        const phone = formData.get("phone") as string;
        const hire_date = formData.get("hire_date") as string;
        const birth_date = formData.get("birth_date") as string;
        const address = formData.get("address") as string;
        const current_address = formData.get("current_address") as string;
        const identity_card = formData.get("identity_card") as string;
        const identity_date = formData.get("identity_date") as string;
        const identity_place = formData.get("identity_place") as string;
        const place_of_birth = formData.get("place_of_birth") as string;

        const tax_code = formData.get("tax_code") as string;
        const bank_name = formData.get("bank_name") as string;
        const bank_account = formData.get("bank_account") as string;

        const department_id = cleanUUID(formData.get("department_id"));
        const position_id = cleanUUID(formData.get("position_id"));
        const status_id = cleanUUID(formData.get("status_id"));
        const contract_type_id = cleanUUID(formData.get("contract_type_id"));
        const gender_id = cleanUUID(formData.get("gender_id"));
        const marital_status_id = cleanUUID(formData.get("marital_status_id"));

        const basic_salary = Number(formData.get("basic_salary")) || 0;
        const allowance_amount = Number(formData.get("allowance_amount")) || 0;
        const dependents_count = Number(formData.get("dependents_count")) || 0;
        const is_insurance_active = formData.get("is_insurance_active") === "on";

        if (!name || !email || !hire_date) {
            return { success: false, error: "Vui lòng điền đầy đủ Tên, Email và Ngày vào làm.", fields: {} };
        }

        // ✅ BƯỚC 2: SINH ID CHUNG VÀ TẠO USER_PROFILE TRƯỚC (Để thỏa mãn Khóa ngoại)
        const newEmployeeId = crypto.randomUUID();
        const code = await generateEmployeeCode(contract_type_id, supabase);

        const { error: profileError } = await supabase.from('user_profiles').insert({
            id: newEmployeeId,
            name: name,               // Đã sửa từ full_name -> name
            email: email,             // Lưu thêm email vào profile
            avatar_url: avatar_url || null,
            type_id: null             // Ép bằng null để tránh lỗi gen_random_uuid() đụng độ khóa ngoại
        });

        if (profileError) {
            console.error("[DB_PROFILE_ERROR]", profileError.message);
            return { success: false, error: `Lỗi tạo Profile: ${profileError.message}`, fields: {} };
        }

        // ✅ BƯỚC 3: TẠO DỮ LIỆU EMPLOYEES (Dùng chung ID với Profile)
        const employeeData = {
            id: newEmployeeId, // Ràng buộc khóa ngoại sẽ pass qua đoạn này!
            code,
            name, email, phone,
            hire_date: hire_date || null,
            birth_date: birth_date || null,
            address, current_address,
            identity_card, identity_date: identity_date || null,
            identity_place, place_of_birth,
            department_id, position_id, status_id, contract_type_id,
            gender_id, marital_status_id,
            tax_code, bank_name, bank_account,
            basic_salary, allowance_amount, dependents_count, is_insurance_active
        };

        const { error: empError } = await supabase.from('employees').insert(employeeData);

        if (empError) {
            console.error("[DB_EMP_ERROR]", empError.message);
            // Rollback: Nếu lưu employee thất bại, xóa luôn profile vừa tạo để tránh rác DB
            await supabase.from('user_profiles').delete().eq('id', newEmployeeId);

            if (empError.code === '23505') return { success: false, error: "Email đã tồn tại.", fields: employeeData };
            return { success: false, error: "Lỗi cơ sở dữ liệu khi tạo nhân sự.", fields: employeeData };
        }

        revalidatePath('/hrm/employees');
        return { success: true, message: `Thêm thành công nhân sự mã ${code}!`, fields: employeeData };
    } catch (e: any) {
        console.error("[SERVER_ERROR] createEmployee:", e);
        return { success: false, error: "Hệ thống đang bận.", fields: {} };
    }
}

/**
 * HÀM CẬP NHẬT NHÂN VIÊN (BẢN ĐẦY ĐỦ 100%)
 */
export async function updateEmployee(id: string, formData: FormData) {
    try {
        const supabase = await createSupabaseServerClient();

        const name = formData.get("name") as string;
        const email = formData.get("email") as string;
        const avatar_url = formData.get("avatar_url") as string;

        // ... (Trích xuất các trường y hệt hàm create)
        const phone = formData.get("phone") as string;
        const hire_date = formData.get("hire_date") as string;
        const birth_date = formData.get("birth_date") as string;
        const address = formData.get("address") as string;
        const current_address = formData.get("current_address") as string;
        const identity_card = formData.get("identity_card") as string;
        const identity_date = formData.get("identity_date") as string;
        const identity_place = formData.get("identity_place") as string;
        const place_of_birth = formData.get("place_of_birth") as string;

        const tax_code = formData.get("tax_code") as string;
        const bank_name = formData.get("bank_name") as string;
        const bank_account = formData.get("bank_account") as string;

        const department_id = cleanUUID(formData.get("department_id"));
        const position_id = cleanUUID(formData.get("position_id"));
        const status_id = cleanUUID(formData.get("status_id"));
        const contract_type_id = cleanUUID(formData.get("contract_type_id"));
        const gender_id = cleanUUID(formData.get("gender_id"));
        const marital_status_id = cleanUUID(formData.get("marital_status_id"));

        const basic_salary = Number(formData.get("basic_salary")) || 0;
        const allowance_amount = Number(formData.get("allowance_amount")) || 0;
        const dependents_count = Number(formData.get("dependents_count")) || 0;
        const is_insurance_active = formData.get("is_insurance_active") === "on";

        // ✅ 1. CẬP NHẬT USER_PROFILES TRƯỚC (Full name & Avatar)
        const { error: profileError } = await supabase.from('user_profiles')
            .update({
                name: name,
                email: email,
                avatar_url: avatar_url || null
            })
            .eq('id', id);

        if (profileError) {
            console.error("[DB_PROFILE_UPDATE_ERROR]", profileError.message);
        }

        // ✅ 2. XỬ LÝ ĐỔI MÃ NẾU ĐỔI LOẠI HỢP ĐỒNG
        let code = formData.get("code") as string;
        const { data: oldEmp } = await supabase.from('employees').select('contract_type_id').eq('id', id).single();
        if (oldEmp && oldEmp.contract_type_id !== contract_type_id) {
            code = await generateEmployeeCode(contract_type_id, supabase);
        } else if (!code) {
            code = await generateEmployeeCode(contract_type_id, supabase);
        }

        // ✅ 3. CẬP NHẬT EMPLOYEES
        const updateData = {
            code, name, email, phone,
            hire_date: hire_date || null,
            birth_date: birth_date || null,
            address, current_address,
            identity_card, identity_date: identity_date || null,
            identity_place, place_of_birth,
            department_id, position_id, status_id, contract_type_id,
            gender_id, marital_status_id,
            tax_code, bank_name, bank_account,
            basic_salary, allowance_amount, dependents_count, is_insurance_active,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase.from('employees').update(updateData).eq('id', id);

        if (error) {
            if (error.code === '23505') return { success: false, error: "Email bị trùng lặp.", fields: { ...updateData, id } };
            return { success: false, error: "Lỗi cơ sở dữ liệu khi cập nhật.", fields: { ...updateData, id } };
        }

        revalidatePath('/hrm/employees');
        revalidatePath(`/hrm/employees/${id}`);
        return { success: true, message: "Cập nhật hồ sơ thành công!", fields: { ...updateData, id } };
    } catch (e: any) {
        console.error("[SERVER_ERROR] updateEmployee:", e);
        return { success: false, error: "Hệ thống đang bận.", fields: {} };
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

/**
* HÀM TẠO MÃ NHÂN VIÊN TỰ ĐỘNG DỰA TRÊN LOẠI HỢP ĐỒNG
* - Chính thức: KG-XXX
* - Thử việc: TVC-XXX
* - Thời vụ: TVU-XXX
*/
async function generateEmployeeCode(contractTypeId: string | null, supabase: any): Promise<string> {
    let prefix = 'EMP'; // Mặc định nếu không có hợp đồng

    if (contractTypeId) {
        // Lấy tên loại hợp đồng từ bảng từ điển
        const { data: contractType } = await supabase
            .from('sys_dictionaries')
            .select('name')
            .eq('id', contractTypeId)
            .single();

        const typeName = (contractType?.name || '').toLowerCase();

        if (typeName.includes('chính thức')) prefix = 'KG';
        else if (typeName.includes('thử việc')) prefix = 'TVC';
        else if (typeName.includes('thời vụ')) prefix = 'TVU';
    }

    // Lấy toàn bộ mã hiện tại có cùng Prefix để tìm số lớn nhất
    // (Tránh lỗi sắp xếp chuỗi KG-999 > KG-1000 của SQL)
    const { data: existingEmps } = await supabase
        .from('employees')
        .select('code')
        .ilike('code', `${prefix}-%`);

    let maxNumber = 0;
    for (const emp of (existingEmps || [])) {
        const parts = emp.code.split('-');
        if (parts.length === 2) {
            const num = parseInt(parts[1], 10);
            if (!isNaN(num) && num > maxNumber) {
                maxNumber = num;
            }
        }
    }

    const nextNumber = maxNumber + 1;
    // Format thành 3 chữ số, VD: 001, 042, 150
    const paddedNumber = nextNumber.toString().padStart(3, '0');

    return `${prefix}-${paddedNumber}`;
}

/**
* Lấy danh sách nhân viên rút gọn dùng cho các Combobox/Select
*/
export async function getEmployeeOptions() {
    try {
        const supabase = await createSupabaseServerClient();
        const { data, error } = await supabase
            .from('employees')
            .select('id, code, name')
            .order('code', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("[ERROR] getEmployeeOptions:", error);
        return [];
    }
}
