// app/(app)/projects/[id]/logs/page.tsx
import ProjectLogsPageClient from "@/components/project-logs/ProjectLogsPageClient";
import { getConstructionLogs } from "@/lib/action/log-actions";

// ✅ FIX: Định nghĩa type cho params là Promise (Chuẩn Next.js 15+)
interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectLogsPage({ params }: PageProps) {
    // 1. Await params trước khi dùng
    const { id: projectId } = await params;

    // 2. Lấy dữ liệu từ Server
    const logs = await getConstructionLogs(projectId);

    // 3. Normalize dữ liệu an toàn (tránh lỗi nếu logs là null/undefined)
    // Nếu getConstructionLogs trả về object {data: [...]}, hãy sửa thành logs.data
    const formattedLogs = Array.isArray(logs) ? logs : [];

    return (
        // ✅ FIX: Thêm wrapper bg-background min-h-screen để chuẩn Dark Mode toàn trang
        <div className="container mx-auto py-6 bg-background min-h-screen">
            <ProjectLogsPageClient
                logs={formattedLogs}
                projectId={projectId}
            />
        </div>
    );
}