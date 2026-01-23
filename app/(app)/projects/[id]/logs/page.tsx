// app/(app)/projects/[id]/logs/page.tsx
import ProjectLogsPageClient from "@/components/project-logs/ProjectLogsPageClient";
import { getConstructionLogs } from "@/lib/action/log-actions";


async function ProjectLogsPageInner({ params }: { params: { id: string } }) {
    const { id: projectId } = await params;
    const logs = await getConstructionLogs(projectId); //Gọi hàm getlogs
    console.log(logs); // Kiểm tra cấu trúc dữ liệu

    return (
        <ProjectLogsPageClient logs={logs} projectId={projectId} />
    );
}

export default async function ProjectLogsPage({ params }: { params: { id: string } }) {
    return <ProjectLogsPageInner params={params} />;
}