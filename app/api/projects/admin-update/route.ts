import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export async function POST(req: Request) {
    try {
        const { projectId, updateData } = await req.json();
        const projectData = updateData?.projectData || {};

        if (!projectId) {
            return NextResponse.json({ success: false, error: "ID dự án không được cung cấp" }, { status: 400 });
        }

        // Lấy Supabase user
        const cookieStore = await cookies(); // phải await
        const token = cookieStore.get("sb-access-token")?.value || null;
        const supabase = createSupabaseServerClient(token);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) {
            console.error("Supabase user error:", userError);
            return NextResponse.json({ success: false, error: "Lỗi xác thực", details: userError.message }, { status: 401 });
        }
        if (!user) {
            return NextResponse.json({ success: false, error: "Bạn chưa đăng nhập" }, { status: 401 });
        }

        // Kiểm tra quyền
        const { data: member, error: memberError } = await supabase
            .from("project_members")
            .select("role")
            .eq("project_id", projectId)
            .eq("employee_id", user.id)
            .eq("role", "admin")
            .maybeSingle();

        if (memberError) {
            console.error("Check member error:", memberError);
            return NextResponse.json({ success: false, error: "Lỗi kiểm tra phân quyền", details: memberError.message }, { status: 500 });
        }
        if (!member) {
            return NextResponse.json({ success: false, error: "Bạn không có quyền chỉnh sửa dự án này" }, { status: 403 });
        }

        // Update bằng service role nếu cần
        if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
            return NextResponse.json({ success: false, error: "Thiếu biến môi trường Supabase!" }, { status: 500 });
        }
        const supabaseAdmin = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error } = await supabaseAdmin
            .from("projects")
            .update(projectData)
            .eq("id", projectId);

        if (error) {
            console.error("Supabase update error:", error);
            return NextResponse.json({ success: false, error: `Không thể cập nhật dự án: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("API catch error:", error);
        return NextResponse.json({
            success: false,
            error: "Đã xảy ra lỗi khi cập nhật dự án",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}