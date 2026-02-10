import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProjectForm from '@/components/projects/ProjectForm';
import { notFound } from "next/navigation";
// ✅ 1. IMPORT HÀM LẤY DỮ LIỆU TỪ DICTIONARY
import { getProjectTypes, getConstructionTypes } from "@/lib/action/projectActions";

function cleanProjectDataForClient<T extends Record<string, any>>(data: T | null): T | Record<string, string | undefined> {
    if (!data) return {};
    const cleanedData: Record<string, string | undefined> = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            cleanedData[key] = (value === null || value === undefined) ? "" : String(value);
        }
    }
    return cleanedData as T;
}

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const resolvedParams = await params;
    const projectId = resolvedParams.id;

    const supabase = await createSupabaseServerClient();

    // ✅ 2. GỌI API SONG SONG ĐỂ LẤY DATA CHO DROPDOWN
    const [
        projectRes,
        customersRes,
        managersRes,
        projectTypes,
        constructionTypes
    ] = await Promise.all([
        supabase.from("projects").select("*").eq("id", projectId).single(),
        supabase.from("customers").select("id, name"),
        supabase.from("employees").select("id, name"),
        getProjectTypes(),       // <-- Lấy Loại dự án
        getConstructionTypes()   // <-- Lấy Loại hình xây dựng
    ]);

    const project = projectRes.data;

    // ✅ FIX: Giao diện lỗi chuẩn Dark Mode (Thay vì div trần)
    if (projectRes.error) {
        console.error("Lỗi khi tải dự án:", projectRes.error.message);
        return (
            <div className="flex w-full h-screen items-center justify-center bg-background">
                <div className="p-6 text-center text-red-600 dark:text-red-400 bg-card rounded-lg shadow border border-red-100 dark:border-red-900/50 max-w-md">
                    <h3 className="font-bold text-lg mb-2">Đã xảy ra lỗi</h3>
                    <p>Không thể tải dữ liệu dự án. Vui lòng thử lại sau.</p>
                    <p className="text-xs text-muted-foreground mt-4">Error: {projectRes.error.message}</p>
                </div>
            </div>
        );
    }

    if (!project) {
        notFound();
    }

    const initialDataForForm = cleanProjectDataForClient(project);

    // Form component thường đã tự handle layout, nên không cần bọc thêm div ngoài nếu không cần thiết
    return (
        <ProjectForm
            initialData={initialDataForForm}
            customers={customersRes.data ?? []}
            managers={managersRes.data ?? []}
            // ✅ 3. TRUYỀN DỮ LIỆU VÀO FORM
            projectTypes={projectTypes}
            constructionTypes={constructionTypes}
        />
    );
}