import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Trang không cần bảo vệ
    if (pathname === "/" || pathname === "/login" || pathname === "/register") {
        return NextResponse.next();
    }

    // Lấy token từ cookie
    const token = req.cookies.get("sb-oshquiqzokyyawgoemql-auth-token")?.value; // Đảm bảo tên cookie đúng

    // Danh sách các trang yêu cầu xác thực
    const authRequiredPages = [
        "/dashboard",
        "/projects",
        "/employees",
        "/customers",
        "/reports",
        "/permissions",
        "/system-status",
        "/settings",
        "/crm",
    ];

    // Kiểm tra xem người dùng có token không
    if (!token && authRequiredPages.some((page) => pathname.startsWith(page))) {
        // Nếu không có token, chuyển hướng đến trang đăng nhập
        return NextResponse.redirect(new URL("/login", req.url));
    }

    // Nếu có token hoặc không phải trang yêu cầu xác thực, cho phép tiếp tục
    return NextResponse.next();
}

// Cấu hình matcher để xác định các đường dẫn mà middleware sẽ áp dụng
export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|public).*)", // Bỏ qua các đường dẫn tĩnh
    ],
};