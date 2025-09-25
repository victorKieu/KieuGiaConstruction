// ❌ KHÔNG dùng "use client"
import {
    getProject,
    getProjectMembers,
    getProjectDocuments,
    getProjectMilestones,
    getProjectFinance,
} from "@/lib/action/projectActions";
import ProjectTabs from "@/components/projects/ProjectTabs";

export default async function ProjectPage({ params }: { params: { id: string } }) {
    const id = params.id;
    const { data: project } = await getProject(id);
    const { data: members } = await getProjectMembers(id);
    const { data: documents } = await getProjectDocuments(id);
    const { data: finance } = await getProjectFinance(id);
    const { data: milestones } = await getProjectMilestones(id);

    if (!project) return <div>Không tìm thấy dự án.</div>;

    return (
        <div className="container mx-auto px-6 py-8 space-y-6">
            {/* Tiêu đề + trạng thái + thời gian + ngân sách */}
            <div className="bg-white p-6 rounded-lg shadow flex flex-col md:flex-row justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold mb-2">{project.name}</h1>
                    <p className="text-sm text-gray-500 mb-1">Trạng thái: <span className="font-medium">{project.status}</span></p>
                    <p className="text-sm text-gray-500 mb-1">Thời gian: {project.start_date} → {project.end_date}</p>
                    <p className="text-sm text-gray-500">Ngân sách: {project.budget.toLocaleString()} ₫</p>
                </div>
                <div className="flex gap-2 items-start md:items-center">
                    <button className="bg-blue-600 text-white px-4 py-2 rounded">Công việc</button>
                    <button className="bg-white border px-4 py-2 rounded">Chỉnh sửa</button>
                    <button className="bg-red-600 text-white px-4 py-2 rounded">Xóa dự án</button>
                </div>
            </div>

            {/* Địa điểm + quản lý */}
            <div className="bg-white p-6 rounded-lg shadow grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <p><strong>Địa điểm:</strong> {project.location || "Chưa có thông tin"}</p>
                    <p><strong>Địa chỉ:</strong> {project.address || "Chưa có thông tin"}</p>
                </div>
                <div>
                    <p><strong>Người giám sát:</strong> {project.supervisor || "—"}</p>
                    <p><strong>Người phụ trách:</strong> {project.manager?.name || "—"}</p>
                    <p><strong>Đơn vị thi công:</strong> {project.contractor || "—"}</p>
                </div>
            </div>

            {/* Thông tin nhanh */}
            <div className="bg-white p-6 rounded-lg shadow grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div><p className="font-semibold">Loại dự án</p><p>{project.project_type || "—"}</p></div>
                <div><p className="font-semibold">Hạng mục</p><p>{project.category || "—"}</p></div>
                <div><p className="font-semibold">Tiến độ</p><p>{project.progress_percent}%</p></div>
                <div><p className="font-semibold">Trễ hạn</p><p>{milestones?.[0]?.delay_percent || "0"}%</p></div>
            </div>

            {/* Tabs */}
            <ProjectTabs
                project={project}
                members={members}
                documents={documents}
                finance={finance}
                milestones={milestones}
            />
        </div>
    );
}