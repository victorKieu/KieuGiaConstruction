import { ReactNode } from "react";
import { Resource, Action, checkPermission } from "./permissions";
import { get_user_role } from "@/lib/supabase/functions";

interface RoleGuardProps {
    resource: Resource;
    action: Action;
    fallback?: ReactNode; // Tùy chọn: Giao diện thay thế nếu không có quyền (VD: Nút bị mờ)
    children: ReactNode;
}

/**
 * Server Component dùng để bọc các phần tử UI cần phân quyền.
 * Sẽ không render ra DOM nếu user không có quyền.
 */
export async function RoleGuard({
    resource,
    action,
    fallback = null,
    children
}: RoleGuardProps) {
    // Lấy role của user hiện tại
    const role = await get_user_role();

    // Kiểm tra quyền từ ma trận PERMISSIONS
    const isAllowed = await checkPermission(resource, action, role);

    if (!isAllowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}