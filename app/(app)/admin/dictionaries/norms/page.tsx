import { redirect } from "next/navigation";
// Import thêm getStandardResources
import { getNorms, getStandardResources } from "@/lib/action/normActions";
import NormClient from "@/components/dictionaries/norms/NormClient";
import { checkIsAdmin } from "@/lib/supabase/getUserProfile";

export default async function AdminNormsPage({
    searchParams
}: {
    searchParams: Promise<{ [key: string]: string | undefined }>
}) {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) redirect("/dashboard");

    const resolvedParams = await searchParams;
    const q = resolvedParams.q || "";
    const page = Number(resolvedParams.page) || 1;
    const pageSize = 50;

    // ĐỔI SANG FETCH RESOURCES (Hao phí chuẩn) THAY VÌ MATERIALS
    const [normsResult, resources] = await Promise.all([
        getNorms(q, page, pageSize),
        getStandardResources() // <--- Gọi hàm mới ở đây
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/50 h-[calc(100vh-80px)]">
            <NormClient
                norms={normsResult.data}
                totalItems={normsResult.total}
                currentPage={page}
                pageSize={pageSize}
                // Truyền resources xuống thay vì materials
                resources={resources}
                initialSearch={q}
            />
        </div>
    );
}