// --- START OF FILE middleware.ts ---

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
// Import createClient từ supabase-js để tạo client server-side
import { createClient } from "@supabase/supabase-js";

// Lấy biến môi trường cho Supabase URL và Anon Key
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export async function middleware(req: NextRequest) { // Thêm async vì chúng ta sẽ gọi hàm bất đồng bộ
    const { pathname } = req.nextUrl;

    // Trang không cần bảo vệ
    if (pathname === "/" || pathname === "/login" || pathname === "/register") {
        return NextResponse.next();
    }

    // Lấy token từ cookie VỚI TÊN ĐÃ ĐƯỢC ĐỒNG NHẤT
    const token = req.cookies.get("sb-access-token")?.value; // <-- Sử dụng tên cookie thống nhất

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

    // Kiểm tra xem người dùng có token không VÀ đang truy cập trang bảo vệ
    if (authRequiredPages.some((page) => pathname.startsWith(page))) {
        // Nếu không có token, chuyển hướng đến trang đăng nhập ngay lập tức
        if (!token) {
            return NextResponse.redirect(new URL("/login", req.url));
        }

        // Nếu có token, chúng ta cần xác thực nó
        try {
            // Tạo một client Supabase để xác thực token server-side
            const supabase = createClient(supabaseUrl, supabaseAnonKey, {
                global: {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                },
            });

            // Gọi getUser() để xác thực token
            const { data: { user }, error: authError } = await supabase.auth.getUser();

            if (authError || !user) {
                console.warn("Xác thực token thất bại trong middleware:", authError?.message || "Không có người dùng.");
                // Token không hợp lệ hoặc hết hạn, chuyển hướng về trang đăng nhập
                return NextResponse.redirect(new URL("/login", req.url));
            }

            // Nếu user hợp lệ, cho phép tiếp tục
            return NextResponse.next();

        } catch (error) {
            console.error("Lỗi không mong muốn trong quá trình xác thực middleware:", error);
            return NextResponse.redirect(new URL("/login", req.url));
        }
    }

    // Nếu không phải trang yêu cầu xác thực, cho phép tiếp tục
    return NextResponse.next();
}

// Cấu hình matcher để xác định các đường dẫn mà middleware sẽ áp dụng
export const config = {
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|public).*)", // Bỏ qua các đường dẫn tĩnh
    ],
};