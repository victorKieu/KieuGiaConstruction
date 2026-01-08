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
        getProjectTypes(),      // <-- Lấy Loại dự án
        getConstructionTypes()  // <-- Lấy Loại hình xây dựng
    ]);

    const project = projectRes.data;

    if (projectRes.error) {
        console.error("Lỗi khi tải dự án:", projectRes.error.message);
        return <div>Đã xảy ra lỗi khi tải dữ án. Vui lòng thử lại.</div>;
    }

    if (!project) {
        notFound();
    }

    const initialDataForForm = cleanProjectDataForClient(project);

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