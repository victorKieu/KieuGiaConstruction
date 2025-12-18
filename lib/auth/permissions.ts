// lib/auth/permissions.ts
import { get_user_role } from "@/lib/supabase/functions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// 1. Định nghĩa các Tài nguyên (Resources) trong hệ thống
export type Resource =
    | "projects"
    | "project_members"
    | "tasks"
    | "employees"
    | "customers"
    | "contracts"
    | "finance";

// 2. Định nghĩa các Hành động (Actions)
export type Action = "view" | "create" | "update" | "delete" | "approve";

// 3. Định nghĩa Vai trò (Roles) - Khớp với DB của bạn
export type Role = "admin" | "manager" | "hr_manager" | "hr_staff" | "accountant" | "employee" | "employee" | "customer" | "supplier";

// 4. MA TRẬN PHÂN QUYỀN (PERMISSION MATRIX)
// Đây là nơi duy nhất bạn cần sửa khi muốn thay đổi luật chơi
type PermissionRules = Record<Resource, Partial<Record<Action, Role[]>>>;

const PERMISSIONS: PermissionRules = {
    projects: {
        // Khách hàng có thể được xem dự án của chính họ (sẽ lọc ở bước Data Scope)
        view: ["admin", "manager", "employee", "customer"],
        create: ["admin", "manager"],
        update: ["admin", "manager"],
        delete: ["admin"],
    },
    tasks: {
        view: ["admin", "manager", "employee"],
        create: ["admin", "manager"],
        update: ["admin", "manager", "employee"],
        delete: ["admin", "manager"],
    },
    project_members: {
        view: ["admin", "manager", "employee"],
        create: ["admin", "manager"],
        update: ["admin", "manager"],
        delete: ["admin"],
    },
    employees: {
        view: ["admin", "hr_manager", "hr_staff", "manager"],
        create: ["admin", "hr_manager", "hr_staff"],
        update: ["admin", "hr_manager", "hr_staff"],
        delete: ["admin"],
    },
    finance: {
        view: ["admin", "accountant", "manager"],
        create: ["admin", "accountant"],
        approve: ["admin"],
    },
    // ✅ FIX: Bổ sung Customers (Khách hàng)
    customers: {
        view: ["admin", "manager", "employee"], // Sale/CSKH cần xem
        create: ["admin", "manager", "employee"], // Sale tạo khách hàng
        update: ["admin", "manager", "employee"],
        delete: ["admin", "manager"],
    },
    // ✅ FIX: Bổ sung Contracts (Hợp đồng)
    contracts: {
        view: ["admin", "manager", "accountant"],
        create: ["admin", "manager"],
        update: ["admin", "manager"],
        delete: ["admin"],
    }
};

/**
 * Hàm kiểm tra quyền (Core Function)
 * @param resource Phân hệ cần kiểm tra
 * @param action Hành động muốn thực hiện
 * @param role Vai trò hiện tại của user (nếu có sẵn thì truyền vào để tối ưu)
 */
export async function checkPermission(
    resource: Resource,
    action: Action,
    currentRole?: string | null
): Promise<boolean> {
    const logPrefix = `[🛡️ PERMISSION_CHECK] [${resource} > ${action}]`;

    console.log(`${logPrefix} 👉 Bắt đầu kiểm tra...`);

    // 1. Lấy role nếu chưa có
    if (!currentRole) {
        console.log(`${logPrefix} ⚠️ Role chưa được truyền vào, đang gọi get_user_role()...`);
        currentRole = await get_user_role();
    }

    console.log(`${logPrefix} 👤 User Role hiện tại: "${currentRole}"`);

    if (!currentRole) {
        console.error(`${logPrefix} ❌ TỪ CHỐI: Không lấy được Role của user (Chưa đăng nhập hoặc lỗi RPC).`);
        return false;
    }

    // 2. Nếu là Admin -> Luôn đúng
    if (currentRole === "admin") {
        console.log(`${logPrefix} ✅ CHẤP NHẬN: User là Admin (God Mode).`);
        return true;
    }

    // 3. Tra cứu trong ma trận
    const resourceRules = PERMISSIONS[resource];

    if (!resourceRules) {
        console.warn(`${logPrefix} ❓ TỪ CHỐI: Không tìm thấy Resource "${resource}" trong Ma trận phân quyền.`);
        return false;
    }

    const allowedRoles = resourceRules[action];

    console.log(`${logPrefix} 📋 Danh sách Role được phép: ${JSON.stringify(allowedRoles)}`);

    // 4. Kiểm tra
    if (!allowedRoles || allowedRoles.length === 0) {
        console.warn(`${logPrefix} ⛔ TỪ CHỐI: Hành động "${action}" chưa được định nghĩa hoặc mảng rỗng.`);
        return false; // Không định nghĩa = Cấm
    }

    const hasPermission = allowedRoles.includes(currentRole as Role);

    if (hasPermission) {
        console.log(`${logPrefix} ✅ CHẤP NHẬN: Role khớp.`);
    } else {
        console.warn(`${logPrefix} 🚫 TỪ CHỐI: Role "${currentRole}" không nằm trong danh sách cho phép.`);
    }

    return hasPermission;
}

/**
 * Hàm trả về toàn bộ quyền của user đối với 1 resource
 * Dùng để render UI (ẩn/hiện nút bấm)
 */
export async function getResourcePermissions(resource: Resource) {
    const role = await get_user_role();

    return {
        canView: await checkPermission(resource, "view", role),
        canCreate: await checkPermission(resource, "create", role),
        canUpdate: await checkPermission(resource, "update", role),
        canDelete: await checkPermission(resource, "delete", role),
        canApprove: await checkPermission(resource, "approve", role),
    };
}