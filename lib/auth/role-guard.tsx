"use client"; // BẮT BUỘC PHẢI CÓ DÒNG NÀY

import { ReactNode, useEffect, useState } from "react";
import { Resource, Action, checkPermission } from "./permissions";
import { get_user_role } from "@/lib/supabase/functions";

interface RoleGuardProps {
    resource: Resource;
    action: Action;
    fallback?: ReactNode; // Tùy chọn: Giao diện thay thế nếu không có quyền
    children: ReactNode;
}

/**
 * Client Component dùng để bọc các phần tử UI cần phân quyền.
 * An toàn để nhúng vào bất kỳ giao diện nào.
 */
export function RoleGuard({
    resource,
    action,
    fallback = null,
    children
}: RoleGuardProps) {
    // isAllowed = null: Đang kiểm tra | true: Cho phép | false: Từ chối
    const [isAllowed, setIsAllowed] = useState<boolean | null>(null);

    useEffect(() => {
        let isMounted = true;

        const verifyPermission = async () => {
            try {
                // Gọi Server Action để lấy role
                const role = await get_user_role();

                // Kiểm tra quyền từ ma trận PERMISSIONS
                const allowed = await checkPermission(resource, action, role);

                if (isMounted) {
                    setIsAllowed(allowed);
                }
            } catch (error) {
                console.error("Lỗi kiểm tra phân quyền:", error);
                if (isMounted) setIsAllowed(false);
            }
        };

        verifyPermission();

        return () => {
            isMounted = false;
        };
    }, [resource, action]);

    // Tránh giật giao diện (hydration mismatch) trong lúc đang chờ server trả kết quả
    if (isAllowed === null) {
        return null; // Hoặc một icon loading nhỏ nếu anh muốn
    }

    if (!isAllowed) {
        return <>{fallback}</>;
    }

    return <>{children}</>;
}