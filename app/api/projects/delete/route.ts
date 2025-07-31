import { NextResponse } from "next/server";
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";

export async function POST(request: Request) {
    try {
        const { projectId } = await request.json();
        console.log("Attempting to delete project with ID:", projectId);

        if (!projectId) {
            return NextResponse.json({ success: false, error: "ID dự án không được cung cấp" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get("sb-access-token")?.value || null;
        const supabase = createSupabaseServerClient(token);
        const { data: { user }, error: userAuthError } = await supabase.auth.getUser();

        if (userAuthError || !user) {
            console.error("Authentication error:", userAuthError?.message);
            return NextResponse.json({ success: false, error: "Bạn chưa đăng nhập!" }, { status: 401 });
        }
        console.log("User authenticated:", user.id);

        // --- CHỈ CẦN KIỂM TRA VAI TRÒ TRONG BẢNG project_members ---
        const { data: projectMember, error: memberError } = await supabase
            .from("project_members")
            .select("role")
            .eq("project_id", projectId)
            .eq("employee_id", user.id)
            .single();

        if (memberError && memberError.code !== 'PGRST116') { // PGRST116 là lỗi "không tìm thấy bản ghi"
            console.error("Lỗi khi lấy vai trò thành viên dự án:", memberError.message);
            return NextResponse.json({ success: false, error: "Lỗi kiểm tra quyền dự án" }, { status: 500 });
        }
        console.log("Project Member Role for this project:", projectMember?.role);

        // Kiểm tra xem người dùng có vai trò "Admin" trong project_members của dự án này không
        const isAdminInProject = projectMember?.role === "Admin"; // Đảm bảo khớp chính xác với tên role trong DB

        if (!isAdminInProject) {
            console.warn("User lacks 'Admin' permission within this project to delete.");
            return NextResponse.json({ success: false, error: "Bạn không có quyền xóa dự án này" }, { status: 403 });
        }
        // --- KẾT THÚC LOGIC KIỂM TRA QUYỀN ---


        // Sử dụng service role key để thực hiện xóa, bỏ qua RLS của database
        const supabaseAdmin = createClient<Database>(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            {
                auth: { autoRefreshToken: false, persistSession: false },
            }
        );
        console.log("Supabase Admin Client created.");

        const { error: deleteError } = await supabaseAdmin
            .from("projects")
            .delete()
            .eq("id", projectId);

        if (deleteError) {
            console.error("Lỗi khi xóa dự án từ Supabase:", deleteError.message);
            return NextResponse.json({ success: false, error: `Không thể xóa dự án: ${deleteError.message}` }, { status: 500 });
        }

        console.log("Project deleted successfully.");
        return NextResponse.json({ success: true, message: "Dự án đã được xóa thành công" });
    } catch (error) {
        console.error("Lỗi chung trong API route xóa dự án:", error);
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