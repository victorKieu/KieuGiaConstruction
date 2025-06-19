import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Đảm bảo bạn đã set các biến môi trường này trong .env.local
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET() {
    const { data, error } = await supabase
        .from("company_settings")
        .select("*")
        .eq("id", 1)
        .maybeSingle();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
}