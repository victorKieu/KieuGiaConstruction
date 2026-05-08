// lib/auth/server-protect.ts
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { Resource, Action, checkPermission } from './permissions';
import { db } from '@/lib/prisma'; // Hoặc dùng Supabase Client nếu bạn không dùng Prisma ở đây

export type ScopeType = 'project' | 'department' | 'customer' | 'task';

export interface ResourceScope {
    type: ScopeType;
    id: string;
}

/**
 * Lõi bảo vệ cho Server Actions và API Routes
 * Kết hợp kiểm tra Global Role (RBAC) và Phạm vi dữ liệu (ABAC)
 */
export async function authorizeAction(resource: Resource, action: Action, scope?: ResourceScope) {
    const supabase = await createSupabaseServerClient();

    // 1. Xác thực User
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        throw new Error('Unauthorized: Vui lòng đăng nhập.');
    }

    // 2. Lấy Role từ hàm của bạn
    const { data: roleEnum } = await supabase.rpc('auth_role');
    const currentRole = roleEnum || 'employee'; // Fallback an toàn

    // 3. Kiểm tra quyền Global (RBAC) sử dụng ma trận hiện có
    const hasGlobalPerm = await checkPermission(resource, action, currentRole as string);
    if (!hasGlobalPerm) {
        throw new Error(`Forbidden: Role "${currentRole}" không có quyền ${action} trên ${resource}`);
    }

    // 4. Nếu là Admin, bỏ qua kiểm tra phạm vi (God Mode)
    if (currentRole === 'admin') {
        return { user, role: currentRole };
    }

    // 5. Kiểm tra Phạm vi Dữ liệu (ABAC)
    if (scope) {
        let isAllowedScoped = false;

        switch (scope.type) {
            case 'project':
                // Kiểm tra user có trong project_members không
                const isProjectMember = await db.projectMember.findFirst({
                    where: {
                        projectId: scope.id,
                        employeeId: user.id
                    }
                });
                // Nếu là Manager, có thể yêu cầu role trong dự án phải là 'Quản lý'
                // if (currentRole === 'manager' && isProjectMember?.role_id !== 'MANAGER_ROLE_ID') return false;
                isAllowedScoped = !!isProjectMember;
                break;

            case 'department':
                // Kiểm tra user có phải quản lý phòng ban không
                const isDeptManager = await db.departmentManager.findFirst({
                    where: {
                        departmentId: scope.id,
                        managerId: user.id
                    }
                });
                isAllowedScoped = !!isDeptManager;
                break;

            case 'customer':
                // Kiểm tra user có phải owner của khách hàng này không
                const isCustomerOwner = await db.customer.findFirst({
                    where: {
                        id: scope.id,
                        ownerId: user.id
                    }
                });
                isAllowedScoped = !!isCustomerOwner;
                break;

            case 'task':
                // Kiểm tra task có được assign cho user này không
                const isTaskAssignee = await db.projectTask.findFirst({
                    where: {
                        id: scope.id,
                        assignedTo: user.id
                    }
                });
                isAllowedScoped = !!isTaskAssignee;
                break;
        }

        if (!isAllowedScoped) {
            throw new Error(`Forbidden: Bạn không có quyền truy cập vào ${scope.type} này (Sai phạm vi).`);
        }
    }

    // Trả về context an toàn
    return { user, role: currentRole };
}