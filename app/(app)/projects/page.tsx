export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import ProjectList from "@/components/projects/project-list";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentSession } from "@/lib/supabase/session";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function ProjectsPage() {
    const supabase = await createSupabaseServerClient();
    const session = await getCurrentSession();

    // 🔍 DEBUG: Kiểm tra xem ID nhân viên (entityId) đã được load chưa
    console.log("DEBUG SESSION:", {
        authId: session.userId, // ✅ Đã sửa
        entityId: session.entityId,
        role: session.role
    });

    if (!session.isAuthenticated) {
        return <div className="p-10 text-center">Vui lòng đăng nhập để xem dự án.</div>;
    }

    // --- LOGIC LẤY DỰ ÁN ---
    let projectIds: string[] = [];

    // Lấy dự án mà user là thành viên (dựa trên session.entityId)
    if (session.entityId) {
        const { data: memberProjects, error: memberError } = await supabase
            .from("project_members")
            .select("project_id")
            .eq("employee_id", session.entityId);

        if (!memberError && memberProjects) {
            projectIds = memberProjects.map((m: any) => m.project_id);
        }
    }

    // Nếu không có dự án nào và không phải admin
    if (projectIds.length === 0 && session.role !== 'admin') {
        return (
            <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
                <p className="text-gray-500">Bạn chưa được tham gia dự án nào.</p>
            </div>
        );
    }

    // Fetch chi tiết dự án
    let query = supabase
        .from("projects")
        .select(`
            *,
            customers ( name ),
            employees!project_manager ( name )
        `)
        .order("created_at", { ascending: false });

    // Nếu không phải Admin, chỉ lấy các dự án mình tham gia
    if (session.role !== 'admin' && projectIds.length > 0) {
        query = query.in("id", projectIds);
    } else if (session.role !== 'admin' && projectIds.length === 0) {
        query = query.in("id", []);
    }

    const { data: projects, error } = await query;

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-800 rounded-md p-4 mb-6">
                <h2 className="text-lg font-semibold mb-2">Lỗi khi tải dữ liệu</h2>
                <p className="text-sm">{error.message}</p>
            </div>
        );
    }

    return (
        <div className="flex w-full h-full gap-6 p-4 md:p-8 bg-slate-50 min-h-screen">
            <div className="flex-1 min-w-0 max-w-7xl mx-auto">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Dự án của tôi</h1>
                        <p className="text-sm text-slate-500 mt-1">Quản lý danh sách các dự án đang tham gia</p>
                    </div>
                </div>

                <Suspense fallback={<div className="text-center p-10 text-slate-500">Đang tải danh sách dự án...</div>}>
                    <ProjectList
                        projects={projects || []}
                        currentUserRole={session.role}
                    />
                </Suspense>
            </div>
        </div>
    );
}