import { NextResponse } from "next/server";
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || "";
    
    // Tạo client Supabase
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    // Khởi tạo truy vấn
    let query = supabase.from("employees").select("*").order("created_at", { ascending: false });

    // Thêm điều kiện tìm kiếm nếu có
    if (q) {
        query = query.ilike("name", `%${q}%`);
    }

    // Thực thi truy vấn
    const { data, error } = await query;

    // Kiểm tra lỗi
    if (error) {
        console.error("Error fetching employees:", error);
        return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Trả về dữ liệu
    return NextResponse.json({ data });
}