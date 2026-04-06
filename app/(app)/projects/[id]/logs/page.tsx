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

    // 3. Normalize dữ liệu thông minh (Tự động bắt cả 2 trường hợp Mảng hoặc Object)
    const formattedLogs = Array.isArray(logs) ? logs : (logs?.data || []);

    return (
        // ✅ Đã thay bg-background bằng hệ màu chuẩn: bg-slate-50 dark:bg-slate-950
        // Đưa min-h-screen ra ngoài cùng để bao phủ toàn bộ chiều cao màn hình
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
            <div className="container mx-auto py-6">
                <ProjectLogsPageClient
                    logs={formattedLogs}
                    projectId={projectId}
                />
            </div>
        </div>
    );
}