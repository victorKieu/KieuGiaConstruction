import QuotationPageClient from "./page-client";
import { getQuotations } from "@/lib/action/quotationActions";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function QuotationPage({ params }: { params: { id: string } }) {
    // 1. Lấy ID dự án từ URL
    const projectId = params.id;

    // 2. Lấy danh sách báo giá
    const { data: quotations } = await getQuotations(projectId);

    // 3. ✅ FIX LỖI TẠI ĐÂY: Lấy thêm thông tin chi tiết của Dự án (kèm Khách hàng)
    const supabase = await createSupabaseServerClient();
    const { data: project } = await supabase
        .from('projects')
        .select('*, customers(*)') // Join để lấy tên khách hàng truyền xuống Form
        .eq('id', projectId)
        .single();

    return (
        <div className="w-full">
            <QuotationPageClient
                projectId={projectId}
                quotations={quotations || []}
                project={project} // ✅ Truyền thêm prop này xuống để hết báo lỗi đỏ
            />
        </div>
    );
}