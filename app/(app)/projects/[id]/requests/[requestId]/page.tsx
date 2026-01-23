import { getMaterialRequestById } from "@/lib/action/requestActions";
// Import component Client đã tách ra
import RequestDetailClient from "@/components/projects/requests/request-detail-client";

// Đây là Server Component (Fetch dữ liệu)
export default async function RequestDetailPage({ params }: { params: Promise<{ id: string; requestId: string }> }) {
    const { id: projectId, requestId } = await params;

    // 1. Lấy dữ liệu từ Database
    const req = await getMaterialRequestById(requestId);

    // 2. Nếu không có dữ liệu -> Báo lỗi
    if (!req) {
        return <div className="p-8 text-center text-muted-foreground">Không tìm thấy phiếu yêu cầu hoặc phiếu đã bị xóa.</div>;
    }

    // 3. Truyền dữ liệu xuống Client Component để hiển thị
    return <RequestDetailClient req={req} projectId={projectId} />;
}