import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    const body = await req.json();
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return NextResponse.json({ error: "Bạn chưa đăng nhập!" }, { status: 401 });
    }

    // (Tùy chọn) Kiểm tra role nếu chỉ cho phép 1 số user tạo dự án
    /*
    const { data: roleRow } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();
    if (roleRow?.role !== 'admin') {
      return NextResponse.json({ error: "Chỉ admin mới được tạo dự án" }, { status: 403 });
    }
    */

    const {
        name, code, customer_id, project_manager, address,
        geocode, start_date, end_date, budget,
        project_type, construction_type, description,
    } = body;

    const { data: existingProject, error: checkError } = await supabase
        .from('projects')
        .select('id')
        .eq('code', code)
        .maybeSingle();

    if (checkError) {
        return NextResponse.json({ error: checkError.message || 'Lỗi kiểm tra mã dự án' }, { status: 500 });
    }
    if (existingProject) {
        return NextResponse.json({ error: 'Mã dự án đã tồn tại' }, { status: 400 });
    }

    const { data: project, error: insertError } = await supabase
        .from('projects')
        .insert([{
            name,
            code,
            customer_id: customer_id || null,
            project_manager: project_manager || null,
            address,
            geocode,
            start_date,
            end_date,
            budget,
            project_type,
            construction_type,
            description,
            created_by: user.id,
        }])
        .select()
        .single();

    if (insertError) {
        return NextResponse.json({ error: insertError.message || 'Tạo dự án không thành công' }, { status: 500 });
    }

    return NextResponse.json({ project }, { status: 201 });
}