import { getProjectMembers, getAllEmployees } from "@/lib/data";
import ProjectMembersClient from "@/components/projects/ProjectMembersClient";

// Hàm lấy user hiện tại, nên thay thế bằng logic thực tế nếu có auth/session
async function getCurrentUserId(): Promise<string> {
    // TODO: Replace with logic lấy user thật (ví dụ: từ session hoặc request)
    return "YOUR_TEST_USER_ID"; // Thay bằng id user thật khi triển khai
}

interface PageProps {
    params: { id: string }
}

export default async function ProjectMembersPage({ params }: PageProps) {
    const projectId = params.id;

    const currentUserId = await getCurrentUserId();

    const allEmployees = await getAllEmployees();
    const initialMembers = await getProjectMembers(projectId);

    const isManager = initialMembers.some(
        m => m.employee_id === currentUserId && m.role === "manager"
    );

    return (
        <div className="container mx-auto p-4">
            <ProjectMembersClient
                projectId={projectId}
                initialMembers={initialMembers}
                employees={allEmployees}
                currentUserId={currentUserId}
                isManager={isManager}
            />
        </div>
    );
}