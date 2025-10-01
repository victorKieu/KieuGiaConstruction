// app/projects/[id]/page.tsx
// PHẢI LÀ SERVER COMPONENT

import { getProject, getProjectMembers, getProjectDocuments, getProjectMilestones, getProjectFinance } from "@/lib/action/projectActions";
import { getProjectTasks } from "@/lib/action/projectActions";
import ProjectTabs from "@/components/projects/ProjectTabs";
import ProjectHeaderWrapper from "@/components/projects/ProjectHeaderWrapper";
import StatCard from "@/components/projects/StatCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { Clock, Banknote, TrendingUp } from 'lucide-react';
import { formatDate, formatCurrency } from "@/lib/utils/utils";
import TaskItemServerWrapper from '@/components/tasks/TaskItemServerWrapper'; // ✅ IMPORT SERVER WRAPPER MỚI
// Import các types cần thiết (Giả định đã được khai báo ở nơi khác)
// import { TaskData, MemberData } from "@/types/project"; 

export default async function ProjectPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    // Bước 1: Lấy dữ liệu song song
    const [
        projectResult,
        membersResult,
        documentsResult,
        financeResult,
        milestonesResult,
        tasksResult
    ] = await Promise.all([
        getProject(id),
        getProjectMembers(id),
        getProjectDocuments(id),
        getProjectFinance(id),
        getProjectMilestones(id),
        getProjectTasks(id)
    ]);

    const project = projectResult.data;

    // KHẮC PHỤC LỖI TS2322: Xử lý giá trị null
    const members = membersResult.data || [];
    const documents = documentsResult.data || [];
    const finance = financeResult.data;
    const milestones = milestonesResult.data || [];
    const tasks = tasksResult.data || [];

    // ✅ BƯỚC 2: TẠO TASK FEED ĐÃ ĐƯỢC SERVER RENDER
    // TaskItemServerWrapper sẽ gọi TaskCommentWrapper (Server) để lấy user ID, sau đó render TaskCommentSection (Client)
    const taskFeedOutput = tasks.map((task: any) => ( // Cast 'any' tạm thời nếu types/project chưa được import
        <TaskItemServerWrapper
            key={task.id}
            task={task}
            members={members}
            projectId={id}
        />
    ));

    if (!project) {
        return <div className="p-10 text-center text-xl text-red-600">
            Không tìm thấy dự án hoặc đã xảy ra lỗi: {projectResult.error?.message}
        </div>;
    }

    return (
        <div className="container mx-auto px-4 md:px-6 py-8 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <ProjectHeaderWrapper project={project} />

            {/* Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    icon={<Clock size={20} />}
                    title="Thời gian"
                    value={`${formatDate(project.start_date)} - ${formatDate(project.end_date)}`}
                />
                <StatCard
                    icon={<Banknote size={20} />}
                    title="Ngân sách"
                    value={`${formatCurrency(project.budget)} ₫`}
                />
                <StatCard
                    icon={<TrendingUp size={20} />}
                    title="Tiến độ"
                    value={
                        <div className="w-full">
                            <div className="flex justify-between items-center mb-1">
                                <span className="text-base font-semibold text-gray-800">{project.progress_percent || 0}%</span>
                            </div>
                            <ProgressBar value={project.progress_percent || 0} />
                        </div>
                    }
                />
            </div>

            {/* Tabs - Phần nội dung chi tiết sẽ nằm trong này */}
            <div className="bg-white p-6 rounded-lg shadow">
                <ProjectTabs
                    project={project}
                    members={members}
                    documents={documents}
                    finance={finance}
                    milestones={milestones}
                    tasks={tasks}

                    // ✅ TRUYỀN TASK FEED ĐÃ CÓ BÌNH LUẬN VÀO ĐÂY
                    taskFeed={taskFeedOutput}

                    membersCount={members.length}
                    documentsCount={documents.length}
                />
            </div>
        </div>
    );
}
