export const dynamic = "force-dynamic";

import { cookies } from "next/headers";
import { Suspense } from "react";
import { getCurrentUser } from "@/lib/action/authActions"; // Nhập hàm getCurrentUser
import ProjectList from "@/components/projects/project-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function ProjectsPage() {
    const cookieStore = await cookies(); // phải await
    const token = await cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
    const user = await getCurrentUser(); // Gọi hàm getCurrentUser từ actions

    if (!user) {
        return <div>Bạn cần đăng nhập để xem dự án.</div>;
    }

    // 1. Lấy các project mà user là thành viên
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

    // 2. Lấy danh sách dự án mà user là thành viên

    const { data: projects, error } = await supabase
        .from("projects")
        .select("*")
        .in("id", projectIds)
        .order("created_at", { ascending: false });

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
                <h2 className="text-lg font-semibold mb-2">Lỗi khi tải dữ liệu</h2>
                <p className="text-sm">{error.message}</p>
            </div>
        );
    }

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