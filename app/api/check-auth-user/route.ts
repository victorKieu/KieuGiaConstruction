import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Chỉ sử dụng trên server, không public key này ra client!
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    const { email } = await req.json();

    // Truy vấn bảng hệ thống auth.users
    const { data, error } = await supabase
        .from('auth.users')
        .select('id')
        .eq('email', email)
        .maybeSingle();

    if (error) {
        // Log lỗi để debug nếu cần
        console.log("Supabase error in check-auth-user:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (data) {
        return NextResponse.json({ exists: true });
    }
    return NextResponse.json({ exists: false });
}