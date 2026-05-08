// lib/auth/permissions.ts

// 1. Định nghĩa các Role có trong hệ thống
export type UserRole = 'ADMIN' | 'PROJECT_MANAGER' | 'ACCOUNTANT' | 'HR' | 'SUPPLIER' | 'CUSTOMER';

// 2. Định nghĩa các loại Quyền (Actions)
export type Permission =
    | 'projects:view' | 'projects:create' | 'projects:edit' | 'projects:delete'
    | 'finance:view' | 'finance:approve'
    | 'hrm:view' | 'hrm:manage'
    | 'inventory:view' | 'inventory:manage';

// 3. Mapping Role với Permissions
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    ADMIN: [
        'projects:view', 'projects:create', 'projects:edit', 'projects:delete',
        'finance:view', 'finance:approve',
        'hrm:view', 'hrm:manage',
        'inventory:view', 'inventory:manage'
    ],
    PROJECT_MANAGER: [
        'projects:view', 'projects:create', 'projects:edit',
        'inventory:view', 'inventory:manage'
    ],
    ACCOUNTANT: [
        'projects:view',
        'finance:view', 'finance:approve'
    ],
    HR: [
        'hrm:view', 'hrm:manage'
    ],
    SUPPLIER: [],
    CUSTOMER: [
        'projects:view' // Khách hàng chỉ được xem dự án của mình
    ]
};

// Hàm tiện ích kiểm tra quyền
export function hasPermission(userRole: UserRole, permission: Permission): boolean {
    const permissions = ROLE_PERMISSIONS[userRole] || [];
    return permissions.includes(permission);
}