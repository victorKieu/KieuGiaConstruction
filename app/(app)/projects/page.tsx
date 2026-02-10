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

    // ✅ FIX: Giao diện lỗi hỗ trợ Dark Mode
    if (error) {
        return (
            // bg-slate-50 -> bg-background
            <div className="flex w-full h-screen items-center justify-center bg-background">
                {/* bg-white -> bg-card, border-red-100 -> dark:border-red-900/50, text-red-600 -> dark:text-red-400 */}
                <div className="p-6 text-center text-red-600 dark:text-red-400 bg-card rounded-lg shadow border border-red-100 dark:border-red-900/50 max-w-md">
                    <h3 className="font-bold text-lg mb-2">Không thể tải dữ liệu</h3>
                    <p>{error.message || "Đã xảy ra lỗi không xác định."}</p>
                    {/* text-gray-400 -> text-muted-foreground */}
                    <p className="text-xs text-muted-foreground mt-4">Code: {error.code}</p>
                </div>
            </div>
        );
    }

    // 2. Lấy Dictionary
    const [projectStatuses, projectTypes] = await Promise.all([
        getDictionaryItems("PROJECT_STATUS"),
        getDictionaryItems("PROJECT_TYPE"),
    ]);

    const dictionaries = {
        statuses: Array.isArray(projectStatuses) ? projectStatuses : [],
        types: Array.isArray(projectTypes) ? projectTypes : []
    };

    return (
        // ✅ FIX: bg-slate-50 -> bg-background (Bỏ nền xám, chuẩn Dark Mode)
        <div className="flex w-full h-full gap-6 p-4 md:p-8 bg-background min-h-screen">
            <div className="flex-1 min-w-0 max-w-[1600px] mx-auto">
                <Suspense fallback={<div className="text-center p-10 text-muted-foreground">Đang tải danh sách dự án...</div>}>
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