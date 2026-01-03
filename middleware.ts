import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(request: NextRequest) {
    // 1. Khởi tạo Response mặc định để có thể thao tác với header/cookie sau này
    let response = NextResponse.next({
        request: {
            headers: request.headers,
        },
    });

    // 2. Khởi tạo Supabase Client (Phiên bản SSR)
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                // Lấy tất cả cookie từ browser gửi lên
                getAll() {
                    return request.cookies.getAll();
                },
                // Quan trọng: Hàm này giúp Server Action đồng bộ cookie mới nếu token được refresh
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        request.cookies.set(name, value);
                    });
                    response = NextResponse.next({
                        request,
                    });
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        }
    );

    // 3. Quan trọng: Gọi getUser để Supabase kiểm tra và REFRESH token nếu cần
    // Lưu ý: Không dùng getSession() ở đây vì nó không an toàn bằng getUser()
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 4. Định nghĩa các trang cần bảo vệ (Auth Guard)
    const authRequiredPaths = [
        "/dashboard",
        "/projects",
        "/employees",
        "/customers",
        "/reports",
        "/crm", // Bảo vệ toàn bộ folder CRM
        "/permissions",
        "/settings",
        "/profile"
    ];

    const { pathname } = request.nextUrl;

    // 5. Logic chặn truy cập
    // Nếu đường dẫn bắt đầu bằng các path bảo vệ VÀ user chưa đăng nhập
    if (authRequiredPaths.some((path) => pathname.startsWith(path)) && !user) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        // Trả về login và kết thúc middleware
        return NextResponse.redirect(url);
    }

    // 6. Logic ngược lại: Nếu đã login mà cố vào trang login/register -> Đẩy về Dashboard hoặc CRM
    if (user && (pathname === "/login" || pathname === "/register" || pathname === "/")) {
        const url = request.nextUrl.clone();
        url.pathname = "/dashboard"; // Hoặc trang chủ của bạn
        return NextResponse.redirect(url);
    }

    // 7. Trả về response đã được update cookie (nếu có)
    return response;
}

export const config = {
    matcher: [
        /*
         * Match tất cả request paths ngoại trừ:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - public folder
         */
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};