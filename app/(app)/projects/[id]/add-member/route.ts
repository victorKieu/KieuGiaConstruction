import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function POST(request: NextRequest, { params }: { params: { projectId: string } }) {
    try {
        const supabase = await createSupabaseServerClient();

        // Lấy thông tin phiên làm việc
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        // Lấy dữ liệu từ request
        const { user_id, role } = await request.json();
        if (!user_id || !role) {
            return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
        }

        // Chỉ manager mới thêm được thành viên (policy đã bảo vệ, nhưng có thể kiểm tra lại)
        const { error } = await supabase
            .from("project_members")
            .insert({ project_id: params.projectId, user_id, role });

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
        return NextResponse.json({ success: false, error: "Internal Server Error" }, { status: 500 });
    }
}