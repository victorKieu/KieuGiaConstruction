import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";


export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
    try {
        // Lấy session từ cookies
        const cookieStore = await cookies(); // phải await
        const token = cookieStore.get("sb-access-token")?.value || null;
        const supabase = createSupabaseServerClient(token);
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { user_id } = await request.json();
        if (!user_id) {
            return NextResponse.json({ success: false, error: "Missing user_id" }, { status: 400 });
        }

        // Chỉ manager hoặc chính user đó được xóa (policy đã bảo vệ)
        const { error } = await supabase
            .from("project_members")
            .delete()
            .eq("project_id", params.projectId)
            .eq("user_id", user_id);

        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 400 });
        }

        return NextResponse.json({ success: true });
    } catch (err: unknown) { // Thay đổi ở đây
        if (err instanceof Error) {
            console.error("Đã xảy ra lỗi:", err.message);
        } else {
            console.error("Đã xảy ra lỗi không xác định:", err);
        }
    }
}