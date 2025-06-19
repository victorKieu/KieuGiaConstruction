import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    } catch (err: unknown) { // Thay đổi ở đây
        if (err instanceof Error) {
            console.error("Đã xảy ra lỗi:", err.message);
        } else {
            console.error("Đã xảy ra lỗi không xác định:", err);
        } { status: 500 };
    }
}