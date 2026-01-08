import { redirect } from "next/navigation";
import { getNorms, getNormGroups } from "@/lib/action/normActions";
import { getMaterials } from "@/lib/action/catalog"; // ✅ Sử dụng hàm có sẵn từ Catalog
import NormClient from "@/components/dictionaries/norms/NormClient";
import { checkIsAdmin } from "@/lib/supabase/getUserProfile";

export default async function AdminNormsPage() {
    const isAdmin = await checkIsAdmin();
    if (!isAdmin) redirect("/dashboard");

    // Fetch song song: Định mức, Nhóm định mức, và Danh sách vật tư
    const [norms, groups, materials] = await Promise.all([
        getNorms(),
        getNormGroups(),
        getMaterials() // ✅ Lấy toàn bộ vật tư
    ]);

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 bg-slate-50/50 h-[calc(100vh-80px)]">
            {/* Truyền materials xuống Client */}
            <NormClient norms={norms} groups={groups} materials={materials} />
        </div>
    );
}