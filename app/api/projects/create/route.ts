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

    // Kiểm tra mã dự án đã tồn tại
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

    // --- BẮT ĐẦU LOGIC THÊM DỰ ÁN VÀ THÀNH VIÊN ---
    // Bắt đầu một transaction để đảm bảo cả hai thao tác thành công hoặc không thành công
    // Lưu ý: Supabase client không hỗ trợ transaction rõ ràng ở phía client/serverless function
    // một cách trực tiếp như trong Node.js truyền thống với pool.
    // Tuy nhiên, chúng ta vẫn có thể xử lý lỗi để rollback thủ công nếu một trong các bước thất bại.
    // Hoặc tốt hơn là sử dụng PostgREST RPC functions nếu bạn muốn transaction thực sự.
    // Với cách này, chúng ta sẽ thực hiện 2 lần insert và kiểm tra lỗi sau mỗi lần.

    let createdProject = null;

    try {
        // 1. Tạo dự án mới trong bảng 'projects'
        const { data: project, error: insertProjectError } = await supabase
            .from('projects')
            .insert([{
                name,
                code,
                customer_id: customer_id || null,
                project_manager: project_manager || null, // KHÔNG LƯU VÀO CỘT NÀY NỮA
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
            .select() // Quan trọng: select() để lấy lại dữ liệu dự án vừa tạo, bao gồm 'id'
            .single();

        if (insertProjectError) {
            console.error("Lỗi khi tạo dự án:", insertProjectError.message);
            throw new Error(insertProjectError.message || 'Tạo dự án không thành công');
        }

        createdProject = project; // Lưu dự án vừa tạo

        // 2. Nếu có project_manager được chọn, thêm vào bảng 'project_members'
        if (project_manager) {
            const { error: insertMemberError } = await supabase
                .from('project_members')
                .insert([
                    {
                        project_id: createdProject.id, // Sử dụng ID của dự án vừa tạo
                        employee_id: project_manager,     // ID của người quản lý được chọn
                        role: 'Admin',      // Hoặc vai trò mặc định của người quản lý
                        // Bạn có thể thêm các cột khác như `joined_at`, `status` nếu có
                    }
                ]);

            if (insertMemberError) {
                console.error("Lỗi khi thêm quản lý dự án vào project_members:", insertMemberError.message);
                // Quyết định: Nếu không thêm được thành viên, có nên rollback dự án không?
                // Hiện tại, tôi sẽ cho phép dự án được tạo nhưng báo lỗi về thành viên.
                // Để rollback, bạn sẽ cần xóa dự án vừa tạo ở đây.
                // await supabase.from('projects').delete().eq('id', createdProject.id);
                // throw new Error("Dự án được tạo nhưng không thể thêm quản lý dự án.");
                return NextResponse.json({ error: "Dự án đã được tạo, nhưng không thể thêm quản lý dự án vào thành viên." }, { status: 202 }); // 202 Accepted cho biết một phần thành công
            }
        }

        // --- KẾT THÚC LOGIC THÊM DỰ ÁN VÀ THÀNH VIÊN ---

        return NextResponse.json({ project: createdProject }, { status: 201 });

    } catch (error: any) {
        // Xử lý lỗi chung cho cả quá trình tạo dự án và thêm thành viên
        return NextResponse.json({ error: error.message || "Đã xảy ra lỗi không xác định" }, { status: 500 });
    }
}