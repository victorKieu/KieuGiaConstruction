import { getMaterialRequestById } from "@/lib/action/requestActions";
import RequestDetailClient from "@/components/projects/requests/request-detail-client";

export default async function RequestDetailPage({
    params
}: {
    params: Promise<{ id: string; requestId: string }>
}) {
    // 🚨 QUAN TRỌNG VỚI NEXT.JS 15: Phải await params trước khi dùng
    const resolvedParams = await params;
    const { requestId } = resolvedParams;

    // Fetch dữ liệu từ Database
    const requestData = await getMaterialRequestById(requestId);

    // Nếu lấy data lỗi (null), log ra server để dễ debug
    if (!requestData) {
        console.error("❌ Không tìm thấy Request ID:", requestId);
    }

    // Truyền data xuống Client Component
    return <RequestDetailClient request={requestData} />;
}