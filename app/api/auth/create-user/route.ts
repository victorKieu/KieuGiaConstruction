import { createSupabaseServerClient } from "@/lib/supabase/server"; // Đảm bảo đường dẫn đúng
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
    try {
        const cookieStore = await cookies(); // phải await
        const token = cookieStore.get("sb-access-token")?.value || null;
        const supabase = createSupabaseServerClient(token);

        // Kiểm tra xác thực
        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession();

        if (sessionError) {
            console.error("Session error:", sessionError);
            return NextResponse.json({ error: "Authentication error" }, { status: 401 });
        }

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let body;
        try {
            body = await request.json();
        } catch (error) {
            console.error("JSON parse error:", error);
            return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 });
        }

        const { id, email, name, role, status } = body;

        // Xác thực dữ liệu đầu vào
        if (!id || !email) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Kiểm tra xem ID người dùng trong request có khớp với ID người dùng đang đăng nhập không
        if (id !== session.user.id) {
            return NextResponse.json({ error: "User ID mismatch" }, { status: 403 });
        }

        // Thực thi SQL trực tiếp để tạo người dùng
        const { error: sqlError } = await supabase.rpc("execute_sql", {
            sql_query: `
                INSERT INTO public.users (id, email, name, role, status)
                VALUES ('${id}', '${email}', '${name || ""}', '${role || "employee"}', '${status || "active"}')
                ON CONFLICT (id) DO NOTHING;
            `,
        });

        if (sqlError) {
            console.error("SQL execution error:", sqlError);
            return NextResponse.json({
                success: true,
                message: "User creation handled gracefully",
            });
        }

        return NextResponse.json({
            success: true,
            message: "User created successfully via SQL",
        });
    } catch (err: unknown) { // Thay đổi ở đây
        if (err instanceof Error) {
            console.error("Đã xảy ra lỗi:", err.message);
        } else {
            console.error("Đã xảy ra lỗi không xác định:", err);
        }
    }
}