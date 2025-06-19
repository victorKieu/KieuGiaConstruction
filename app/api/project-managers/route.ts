import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

// Danh sách rank đủ điều kiện làm quản lý dự án
const MANAGER_RANKS = [
    "Trưởng phòng",
    "Phó phòng",
    "Ban giám đốc",
    "Giám đốc",
    "Phó giám đốc",
    "Quản lý"
];

export async function GET() {
    const supabase = createClient();
    const { data, error } = await supabase
        .from("employees")
        .select("id, name, code, position, rank")
        .in("rank", MANAGER_RANKS);
    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ data });
}