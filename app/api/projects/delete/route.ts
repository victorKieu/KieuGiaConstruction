import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Database } from "@/types/supabase";

export async function POST(request: Request) {
    try {
        const { projectId } = await request.json();
        if (!projectId) {
            return NextResponse.json({ success: false, error: "ID dự án không được cung cấp" }, { status: 400 });
        }

        const supabase = createServerSupabaseClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ success: false, error: "Bạn chưa đăng nhập" }, { status: 401 });
        }

        // Lấy vai trò user
        const { data: userRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id)
            .single();

        // Lấy thông tin dự án
        const { data: project } = await supabase
            .from("projects")
            .select("project_manager")
            .eq("id", projectId)
            .single();

        // Chỉ admin hoặc project_manager mới được xóa
        if (
            userRole?.role !== "admin" &&
            project?.project_manager !== user.id
        ) {
            return NextResponse.json({ success: false, error: "Bạn không có quyền xóa dự án này" }, { status: 403 });
        }

        // Dùng service role key xóa (nếu thật sự cần), CÓ kiểm tra quyền phía trên
        const supabaseAdmin = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: { autoRefreshToken: false, persistSession: false },
            }
        );

        const { error } = await supabaseAdmin.from("projects").delete().eq("id", projectId);

        if (error) {
            return NextResponse.json({ success: false, error: `Không thể xóa dự án: ${error.message}` }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json(
            {
                success: false,
                error: "Đã xảy ra lỗi khi xóa dự án",
                details: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}