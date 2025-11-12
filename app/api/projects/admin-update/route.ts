import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/types/supabase";
import { revalidatePath } from "next/cache";

export async function POST(req: Request) {
    try {
        // ... (Lấy projectId, projectData, user) ...
        const { projectId, updateData } = await req.json();
        const projectData = updateData?.projectData || {};
        console.log("[admin-update] Dữ liệu nhận được:", projectData);
        if (!projectId) {
            return NextResponse.json({ success: false, error: "ID dự án không được cung cấp" }, { status: 400 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get("sb-access-token")?.value || null;
        const supabase = createSupabaseServerClient(token);

        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            return NextResponse.json({ success: false, error: "Lỗi xác thực hoặc chưa đăng nhập" }, { status: 401 });
        }

        // --- PHẦN FIX LỖI 403 ---
        // Logic: API "admin-update" chỉ dành cho Quản lý (manager) của dự án.
        // Chúng ta sẽ kiểm tra cột `role` (string) xem có phải là 'manager' không.
        const { data: member, error: memberError } = await supabase
            .from("project_members")
            .select("role")
            .eq("project_id", projectId)
            .eq("employee_id", user.id)
            .eq("role", "manager") // <-- SỬA "admin" THÀNH "manager"
            .maybeSingle();

        if (memberError) {
            console.error("Check member error:", memberError);
            return NextResponse.json({ success: false, error: "Lỗi kiểm tra phân quyền", details: memberError.message }, { status: 500 });
        }

        // Nếu không tìm thấy (vai trò không phải 'manager')
        if (!member) {
            return NextResponse.json({ success: false, error: "Bạn không có quyền (Manager) để chỉnh sửa dự án này" }, { status: 403 });
        }
        // --- KẾT THÚC FIX ---

        // 5. Update bằng service role (Giữ nguyên logic của bạn)
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
        revalidatePath(`/projects/${projectId}`); // Xóa cache trang chi tiết
        revalidatePath("/projects"); // Xóa cache trang danh sách

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