export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/action/authActions";
import ProjectList from "@/components/projects/project-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
    const cookieStore = await cookies();
    const token = await cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    const user = await getCurrentUser();

    if (!user) {
        return <div>Bạn cần đăng nhập để xem dự án.</div>;
    }

    // 1. Lấy các project mà user là thành viên (Giữ nguyên, đã chuẩn)
    const { data: memberProjects, error: memberError } = await supabase
        .from("project_members")
        .select("project_id")
        .eq("employee_id", user.id);

    if (memberError) {
        return <div className="text-red-600">Lỗi khi truy vấn phân quyền dự án: {memberError.message}</div>;
    }

    const projectIds = memberProjects?.map((m: any) => m.project_id) || [];

    if (projectIds.length === 0) {
        return <div>Bạn chưa được tham gia dự án nào.</div>;
    }

    // --- PHẦN FIX HIỆU NĂNG (N+1) ---
    // 2. Lấy danh sách dự án VÀ JOIN thông tin liên quan (Khách hàng, Quản lý)

    // Dựa trên file 'supabase.ts':
    // - Cột 'customer_id' liên kết với bảng 'customers'
    // - Cột 'project_manager' liên kết với bảng 'employees' (chứa tên Quản lý)

    const { data: projects, error } = await supabase
        .from("projects")
        .select(`
            *,
            customers ( name ),
            employees!project_manager ( name )
        `)
        .in("id", projectIds)
        .order("created_at", { ascending: false });
    // --- KẾT THÚC FIX ---

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
                <h2 className="text-lg font-semibold mb-2">Lỗi khi tải dữ liệu</h2>
                <p className="text-sm">{error.message}</p>
            </div>
        );
    }

    /*
    * GHI CHÚ:
    * Dữ liệu 'projects' trả về bây giờ sẽ có dạng:
    * {
    * id: "...",
    * name: "Dự án A",
    * customers: { name: "Tên Khách Hàng" },
    * employees: { name: "Tên Người Quản Lý" }
    * }
    * Component <ProjectList> giờ chỉ cần render, không cần fetch data nữa.
    */

    return (
        <div className="flex w-full h-full gap-6 p-4">
            <div className="flex-1 min-w-0">
                <h1 className="text-2xl font-bold mb-6">Dự án</h1>
                <Suspense fallback={<div>Đang tải dự án...</div>}>
                    <ProjectList projects={projects} />
                </Suspense>
            </div>
        </div>
    );
}