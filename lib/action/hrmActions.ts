// lib/actions/hrmActions.ts
"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { get_user_role } from '@/lib/supabase/functions';
import { z } from 'zod';
import { Employee, GetEmployeesParams, GetEmployeesResult, ActionResponse, InsertEmployee, UpdateEmployee } from '@/types/hrm';

const CreateEmployeeSchema = z.object({
    email: z.string().email("Email không hợp lệ."),
    password: z.string().min(6, "Mật khẩu phải có ít nhất 6 ký tự."),
    fullName: z.string().min(1, "Tên đầy đủ không được để trống."), // `fullName` từ form
    position: z.string().min(1, "Chức vụ không được để trống."),
    department: z.string().optional().nullable(),
    hireDate: z.string().optional().nullable(),
    birthDate: z.string().optional().nullable(), // `birthDate` từ form (sẽ map tới `birth_date` trong DB)
    phone: z.string().optional().nullable(),
    address: z.string().optional().nullable(),
});

// --- HRM Actions (Employees) ---

/**
 * Server Action: Tạo user trong Supabase Auth VÀ tạo hồ sơ nhân viên trong public.employees.
 * Chỉ Admin, HR Manager, HR Staff có quyền thực hiện.
 */
export async function createFullEmployeeAccount(formData: FormData): Promise<ActionResponse> {
    const supabaseAdmin = createSupabaseAdminClient();

    const callingUserRole = await get_user_role();
    if (!callingUserRole || !['admin', 'hr_manager', 'hr_staff'].includes(callingUserRole)) {
        return { success: false, error: "Bạn không có quyền tạo tài khoản nhân viên." };
    }

    const parsed = CreateEmployeeSchema.safeParse({
        email: formData.get('email'),
        password: formData.get('password'),
        fullName: formData.get('fullName'),
        position: formData.get('position'),
        department: formData.get('department'),
        hireDate: formData.get('hireDate'),
        birthDate: formData.get('birthDate'), // Lấy từ form
        phone: formData.get('phone'),
        address: formData.get('address'),
    });

    if (!parsed.success) {
        return { success: false, error: parsed.error.errors.map(e => e.message).join(", ") };
    }

    const { email, password, fullName, position, department, hireDate, birthDate, phone, address } = parsed.data;

    let newUserId: string | undefined;

    try {
        const { data: roleData, error: roleError } = await supabaseAdmin
            .from('roles')
            .select('id, name')
            .eq('name', 'employee')
            .single();

        if (roleError || !roleData) {
            console.error("Lỗi khi lấy ID vai trò 'employee':", roleError);
            return { success: false, error: "Không tìm thấy vai trò 'employee'. Vui lòng kiểm tra bảng roles." };
        }
        const employeeRoleId = roleData.id;
        const employeeRoleName = roleData.name;

        const { data: authUserData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email: email,
            password: password,
            email_confirm: true,
            user_metadata: { full_name: fullName }, // fullName sẽ được lưu vào user_metadata
            app_metadata: { role: employeeRoleName, role_id: employeeRoleId },
        });

        if (authError) {
            console.error("Lỗi khi tạo user Auth:", authError);
            return { success: false, error: authError.message || "Không thể tạo tài khoản người dùng." };
        }

        newUserId = authUserData.user?.id;
        if (!newUserId) {
            return { success: false, error: "Không lấy được ID người dùng mới từ Auth." };
        }

        // Tạo đối tượng dữ liệu để insert, SỬ DỤNG InsertEmployee
        const employeeInsertData: InsertEmployee = {
            id: newUserId,
            email: email,
            name: fullName, 
            position: position,
            phone: phone,
            address: address,
            department_id: department,
            hire_date: hireDate,
            birth_date: birthDate, 
            status: 'active',
            code: 'EMP_' + newUserId.substring(0, 8).toUpperCase(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            avatar_url: null,
        };

        const { error: employeeProfileError } = await supabaseAdmin
            .from('employees')
            .insert(employeeInsertData); // Truyền đối tượng đã được typed

        if (employeeProfileError) {
            console.error("Lỗi khi tạo hồ sơ nhân viên:", employeeProfileError);
            await supabaseAdmin.auth.admin.deleteUser(newUserId);
            return { success: false, error: employeeProfileError.message || "Không thể tạo hồ sơ nhân viên." };
        }

        revalidatePath("/hrm/employees");
        revalidatePath(`/hrm/employees/${newUserId}`);
        return { success: true, message: "Tài khoản và hồ sơ nhân viên đã được tạo thành công!", userId: newUserId };

    } catch (error: any) {
        console.error("Lỗi không mong muốn trong createFullEmployeeAccount:", error);
        if (newUserId) {
            await supabaseAdmin.auth.admin.deleteUser(newUserId).catch(e => console.error("Failed to cleanup auth user:", e));
        }
        return { success: false, error: error.message || "Đã xảy ra lỗi không mong muốn khi tạo nhân viên." };
    }
}


/**
 * Server Action: Lấy danh sách tất cả nhân viên có hỗ trợ tìm kiếm, lọc và phân trang.
 * Quyền hạn được kiểm soát bởi RLS trên bảng public.employees.
 */
export async function getEmployees({
    search,
    status,
    department,
    page = 1,
    limit = 5,
}: GetEmployeesParams = {}): Promise<GetEmployeesResult> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    let query = supabase
        .from("employees")

        .select(`
            id,
            email,
            name,
            code,
            position,
            phone,
            address,
            department_id,
            hire_date,
            birth_date,
            status,
            avatar_url,
            created_at,
            updated_at
        `, { count: 'exact' });

    if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,code.ilike.%${search}%`);
    }

    if (status && status !== "Tất cả") {
        query = query.eq('status', status);
    }

    if (department && department !== "Tất cả") {
        query = query.eq('department', department);
    }

    const from = (page - 1) * limit;
    const to = from + limit - 1;
    query = query.range(from, to);

    query = query.order("created_at", { ascending: false });

    const { data: employees, error, count } = await query;

    if (error) {
        console.error("Lỗi khi lấy danh sách nhân viên:", error.message);
        return { employees: [], totalCount: 0 };
    }

    return { employees: employees || [], totalCount: count || 0 };
}


/**
 * Server Action: Lấy danh sách nhân viên có vai trò quản lý dự án.
 * Quyền hạn được kiểm soát bởi RLS.
 */
interface ProjectManager {
    id: string;
    name: string;
    code: string | null;
    position: string;
}

export async function getProjectManagers(): Promise<ProjectManager[]> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    if (!supabase) {
        console.error("Supabase client là null trong getProjectManagers");
        return [];
    }

    const MANAGER_RANKS = [
        "Trưởng phòng",
        "Phó phòng",
        "Giám đốc",
        "Phó giám đốc",
        "Quản lý",
        "Project Manager",
        "Team Lead"
    ];

    const { data, error } = await supabase
        .from("employees")
        .select("id, name, code, position")
        .in("position", MANAGER_RANKS);

    if (error) {
        console.error("Lỗi khi lấy quản lý dự án:", error.message);
        return [];
    }

    if (!data || !Array.isArray(data)) {
        console.warn("Dữ liệu quản lý dự án không hợp lệ:", data);
        return [];
    }

    // Lọc bỏ phần tử thiếu id hoặc name
    return data.filter((m): m is ProjectManager => !!m?.id && !!m?.name);
}

/**
 * Lấy thông tin chi tiết của một nhân viên theo ID.
 * Quyền hạn được kiểm soát bởi RLS.
 */
export async function getEmployeeById(id: string): Promise<Employee | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { data, error } = await supabase
        .from("employees")
        .select(`
            id,
            email,
            name,
            code,
            position,
            phone,
            address,
            department_id,
            hire_date,
            birth_date,
            status,
            avatar_url,
            created_at,
            updated_at
        `)
        .eq('id', id)
        .maybeSingle();

    if (error) {
        console.error('Lỗi khi lấy thông tin nhân viên ${id}:', error.message);
        return null;
    }

    return data as Employee | null;
}

/**
 * Cập nhật hồ sơ nhân viên.
 * Chỉ Admin, HR Manager, HR Staff hoặc chính nhân viên đó có quyền cập nhật (cần RLS).
 */
export async function updateEmployeeProfile(id: string, formData: FormData): Promise<ActionResponse | null> {
    const supabaseAdmin = createSupabaseAdminClient();
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { success: false, error: "Bạn cần đăng nhập để thực hiện thao tác này." };
    }

    const callingUserRole = await get_user_role();
    const canUpdate = ['admin', 'hr_manager', 'hr_staff'].includes(callingUserRole || '') || user.id === id;

    if (!canUpdate) {
        return { success: false, error: "Bạn không có quyền cập nhật hồ sơ nhân viên này." };
        //return null; // Trả về null nếu không có quyền cập nhật
    }

    // Lấy dữ liệu từ FormData (tên biến khớp với form, sẽ map tới DB sau)
    const nameFromForm = formData.get("fullName") as string | null; // Tên từ form
    const position = formData.get("position") as string | null;
    const phone = (formData.get("phone") as string) || null;
    const address = (formData.get("address") as string) || null;
    const department = (formData.get("department") as string) || null;
    const hire_date = (formData.get("hireDate") as string) || null;
    const birth_date_from_form = (formData.get("birthDate") as string) || null; // Ngày sinh từ form
    const status = (formData.get("status") as Employee['status']) || null;
    const avatar_url = (formData.get("avatar_url") as string) || null;

    // Tạo đối tượng chứa dữ liệu cần cập nhật, SỬ DỤNG UpdateEmployee
    const updateData: UpdateEmployee = { updated_at: new Date().toISOString() };
    if (nameFromForm) updateData.name = nameFromForm;
    if (position) updateData.position = position;
    if (phone !== null) updateData.phone = phone;
    if (address !== null) updateData.address = address;
    if (department !== null) updateData.department_id = department;
    if (hire_date !== null) updateData.hire_date = hire_date;
    if (birth_date_from_form !== null) updateData.birth_date = birth_date_from_form;
    if (status !== null) updateData.status = status;
    if (avatar_url !== null) updateData.avatar_url = avatar_url;

    const { error } = await supabaseAdmin
        .from('employees')
        .update(updateData) // Truyền đối tượng đã được typed
        .eq('id', id);

    if (error) {
        console.error("Lỗi khi cập nhật hồ sơ nhân viên:", error.message);
        return { success: false, error: 'Không thể cập nhật hồ sơ nhân viên:' }
    };
 
    revalidatePath("/hrm/employees");
    revalidatePath(`/hrm/employees/${id}`);
    return { success: true, message: "Hồ sơ nhân viên đã được cập nhật thành công!" };
}

/**
 * Xóa hồ sơ nhân viên.
 * Chỉ Admin hoặc HR Manager có quyền xóa.
 */
export async function deleteEmployee(id: string): Promise<ActionResponse> {
    const supabaseAdmin = createSupabaseAdminClient();

    const callingUserRole = await get_user_role();
    if (!callingUserRole || !['admin', 'hr_manager'].includes(callingUserRole)) {
        return { success: false, error: "Bạn không có quyền xóa tài khoản nhân viên." };
    }

    try {
        const { error: employeeError } = await supabaseAdmin
            .from('employees')
            .delete()
            .eq('id', id);

        if (employeeError) {
            console.error("Lỗi khi xóa hồ sơ nhân viên:", employeeError.message);
            return { success: false, error: `Không thể xóa hồ sơ nhân viên: ${employeeError.message}.` };
        }

        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(id);

        if (authError) {
            console.error("Lỗi khi xóa user Auth:", authError.message);
            return { success: false, error: `Không thể xóa tài khoản người dùng: ${authError.message}.` };
        }

        revalidatePath("/hrm/employees");
        return { success: true, message: "Hồ sơ và tài khoản nhân viên đã được xóa thành công!" };

    } catch (error: any) {
        console.error("Lỗi không mong muốn khi xóa nhân viên:", error.message);
        return { success: false, error: error.message || "Đã xảy ra lỗi không mong muốn khi xóa nhân viên." };
    }
}