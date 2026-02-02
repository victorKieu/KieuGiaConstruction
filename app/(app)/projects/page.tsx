import { Suspense } from "react";
import ProjectList from "@/components/projects/project-list";
import { getProjects } from "@/lib/action/projectActions";
import { getDictionaryItems } from "@/lib/action/dictionaryActions";
import { getCurrentSession } from "@/lib/supabase/session";
import { redirect } from "next/navigation";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function ProjectsPage() {
    const session = await getCurrentSession();
    if (!session.isAuthenticated) redirect("/login");

    // 1. Lấy danh sách dự án
    const { data: projects, error } = await getProjects();

    // 🔴 LỖI CŨ: if (error) return <div>{error}</div>; (Gây lỗi Object valid)
    // ✅ FIX: Chỉ render error.message
    if (error) {
        return (
            <div className="flex w-full h-screen items-center justify-center bg-slate-50">
                <div className="p-6 text-center text-red-600 bg-white rounded-lg shadow border border-red-100 max-w-md">
                    <h3 className="font-bold text-lg mb-2">Không thể tải dữ liệu</h3>
                    {/* Render chuỗi message thay vì object error */}
                    <p>{error.message || "Đã xảy ra lỗi không xác định."}</p>
                    <p className="text-xs text-gray-400 mt-4">Code: {error.code}</p>
                </div>
            </div>
        );
    }

    // 2. Lấy Dictionary (Dùng Promise.all để nhanh hơn)
    const [projectStatuses, projectTypes] = await Promise.all([
        getDictionaryItems("PROJECT_STATUS"),
        getDictionaryItems("PROJECT_TYPE"),
    ]);

    // Chuẩn hóa dữ liệu dictionary (đảm bảo luôn là mảng)
    const dictionaries = {
        statuses: Array.isArray(projectStatuses) ? projectStatuses : [],
        types: Array.isArray(projectTypes) ? projectTypes : []
    };

    return (
        <div className="flex w-full h-full gap-6 p-4 md:p-8 bg-slate-50 min-h-screen">
            <div className="flex-1 min-w-0 max-w-[1600px] mx-auto">
                <Suspense fallback={<div className="text-center p-10 text-slate-500">Đang tải danh sách dự án...</div>}>
                    <ProjectList
                        projects={projects || []}
                        currentUserRole={session.role}
                        dictionaries={dictionaries}
                    />
                </Suspense>
            </div>
        </div>
    );
}