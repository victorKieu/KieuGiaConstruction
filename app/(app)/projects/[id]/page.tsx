// app/(app)/projects/[id]/page.tsx
// PHẢI LÀ SERVER COMPONENT

import { getProject, getProjectMembers, getProjectDocuments, getProjectMilestones, getProjectFinance } from "@/lib/action/projectActions";
import { getProjectTasks } from "@/lib/action/projectActions";
import { getProjectSurveys, getSurveyTemplates, getSurveyTaskTemplates } from "@/lib/action/surveyActions";
import { getQtoItems, getQtoTemplates } from "@/lib/action/qtoActions";
import ProjectTabs from "@/components/projects/ProjectTabs";
import ProjectHeaderWrapper from "@/components/projects/ProjectHeaderWrapper";
import StatCard from "@/components/projects/StatCard";
import ProgressBar from "@/components/ui/ProgressBar";
import { Clock, Banknote, TrendingUp } from 'lucide-react';
import { formatDate, formatCurrency } from "@/lib/utils/utils";
import TaskItemServerWrapper from '@/components/tasks/TaskItemServerWrapper';
import { getCurrentUser } from "@/lib/action/authActions";
import { ProjectData } from "@/types/project";
import { getCurrentUserRoleInProject } from "@/lib/utils/auth";

export default async function ProjectPage({ params }: { params: { id: string } }) {
    const { id } = await params;

    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.id ?? "";
    const currentUserRole = await getCurrentUserRoleInProject(id);
    const permissions = {
        // Thêm dấu !! để ép kiểu về boolean (true/false), tránh undefined
        canEdit: !!(currentUserRole?.includes("manager") || currentUserRole?.includes("quản lý")),
        canDelete: !!(currentUserRole?.includes("manager") || currentUserRole?.includes("quản lý")),
        canAddMember: !!(currentUserRole?.includes("manager") || currentUserRole?.includes("giám sát")),
    };

    // Bước 1: Lấy dữ liệu song song
    const [
        projectResult,
        membersResult,
        documentsResult,
        financeResult,
        milestonesResult,
        tasksResult,
        surveysResult,
        surveyTemplatesResult,
        surveyTaskTemplatesResult,
        qtoItemsResult,
        qtoTemplatesResult
    ] = await Promise.all([
        getProject(id),
        getProjectMembers(id),
        getProjectDocuments(id),
        getProjectFinance(id),
        getProjectMilestones(id),
        getProjectTasks(id),
        getProjectSurveys(id),
        getSurveyTemplates(),
        getSurveyTaskTemplates(),
        getQtoItems(id),
        getQtoTemplates()
    ]);

    const project = projectResult.data as ProjectData;

    // Xử lý giá trị null
    const members = membersResult.data || [];
    const documents = documentsResult.data || [];
    const finance = financeResult.data;
    const milestones = milestonesResult.data || [];
    const tasks = tasksResult.data || [];
    const surveys = surveysResult.data || [];
    const surveyTemplates = surveyTemplatesResult.data || [];
    const surveyTaskTemplates = surveyTaskTemplatesResult.data || [];
    const qtoItems = qtoItemsResult.data || [];
    const qtoTemplates = qtoTemplatesResult.data || [];

    // Bước 2: Tạo Task Feed
    const taskFeedOutput = tasks.map((task: any) => (
        <TaskItemServerWrapper
            key={task.id}
            task={task}
            members={members}
            projectId={id}
            currentUserId={currentUserId}
        />
    ));

    if (!project) {
        return <div className="p-10 text-center text-xl text-red-600">
            Không tìm thấy dự án hoặc đã xảy ra lỗi: {projectResult.error?.message}
        </div>;
    }

    return (
        // ✅ MOBILE FIX: Giảm padding container chính (px-2 trên mobile, px-6 trên desktop)
        <div className="container mx-auto px-2 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6 bg-gray-50 min-h-screen">

            {/* Header */}
            <div className="bg-white p-3 md:p-0 rounded-lg md:bg-transparent shadow-sm md:shadow-none">
                <ProjectHeaderWrapper
                    project={project}
                    permissions={permissions}
                />
            </div>

            {/* ✅ MOBILE FIX: Stat Cards Grid
               - Mobile: Grid 2 cột (col-span-2 cho Tiến độ để nó nằm ngang full width dưới cùng)
               - Desktop: Grid 3 cột như cũ
            */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                <div className="col-span-1">
                    <StatCard
                        icon={<Clock size={18} />} // Giảm size icon chút xíu
                        title="Thời gian"
                        value={`${formatDate(project.start_date)} - ${formatDate(project.end_date)}`}
                    />
                </div>

                <div className="col-span-1">
                    <StatCard
                        icon={<Banknote size={18} />}
                        title="Ngân sách"
                        value={`${formatCurrency(project.budget)}`} // Bỏ chữ 'đ' nếu formatCurrency đã có, hoặc giữ nguyên
                    />
                </div>

                {/* Card Tiến độ chiếm 2 cột trên mobile, 1 cột trên desktop */}
                <div className="col-span-2 md:col-span-1">
                    <StatCard
                        icon={<TrendingUp size={18} />}
                        title="Tiến độ tổng thể"
                        value={
                            <div className="w-full mt-1">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-sm font-semibold text-gray-800">{project.progress_percent || 0}%</span>
                                </div>
                                <ProgressBar value={project.progress_percent || 0} />
                            </div>
                        }
                    />
                </div>
            </div>

            {/* Tabs Content */}
            {/* ✅ MOBILE FIX: Giảm padding p-2 trên mobile để nội dung tab rộng rãi hơn */}
            <div className="bg-white p-2 md:p-6 rounded-lg shadow border border-gray-100">
                <ProjectTabs
                    projectId={id}
                    project={project}
                    members={members}
                    documents={documents}
                    finance={finance}
                    milestones={milestones}
                    tasks={tasks}
                    surveys={surveys}
                    surveyTemplates={surveyTemplates}
                    surveyTaskTemplates={surveyTaskTemplates}
                    qtoItems={qtoItems}
                    qtoTemplates={qtoTemplates}
                    taskFeed={taskFeedOutput}
                    membersCount={members.length}
                    documentsCount={documents.length}
                />
            </div>
        </div>
    );
}