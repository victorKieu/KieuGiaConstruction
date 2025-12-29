// app/(app)/projects/[id]/page.tsx
import { getProject, getProjectMembers, getProjectDocuments, getProjectMilestones } from "@/lib/action/projectActions";
import { getProjectTasks } from "@/lib/action/projectActions";
import { getProjectSurveys, getSurveyTemplates, getSurveyTaskTemplates } from "@/lib/action/surveyActions";
import { getQtoItems, getQtoTemplates } from "@/lib/action/qtoActions";

import { getProjectFinanceStats } from "@/lib/action/finance";

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
import { getMaterialRequests } from "@/lib/action/request";

export default async function ProjectPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.id ?? "";
    const currentUserRole = await getCurrentUserRoleInProject(id);

    const permissions = {
        canEdit: !!(currentUserRole?.includes("manager") || currentUserRole?.includes("quản lý")),
        canDelete: !!(currentUserRole?.includes("manager") || currentUserRole?.includes("quản lý")),
        canAddMember: !!(currentUserRole?.includes("manager") || currentUserRole?.includes("giám sát")),
    };

    // 1. Lấy dữ liệu (Lưu ý thứ tự Promise)
    const [
        projectResult,
        membersResult,
        documentsResult,
        financeStats, // 👈 Đổi tên biến kết quả này (Cũ là financeResult)
        milestonesResult,
        tasksResult,
        surveysResult,
        surveyTemplatesResult,
        surveyTaskTemplatesResult,
        qtoItemsResult,
        qtoTemplatesResult,
        requests
    ] = await Promise.all([
        getProject(id),
        getProjectMembers(id),
        getProjectDocuments(id),
        getProjectFinanceStats(id), // 👈 Dùng hàm MỚI (Cũ là getProjectFinance)
        getProjectMilestones(id),
        getProjectTasks(id),
        getProjectSurveys(id),
        getSurveyTemplates(),
        getSurveyTaskTemplates(),
        getQtoItems(id),
        getQtoTemplates(),
        getMaterialRequests(id)
    ]);
    console.log("Finance Data Check:", JSON.stringify(financeStats, null, 2));
    const project = projectResult.data as ProjectData;
    const members = membersResult.data || [];
    const documents = documentsResult.data || [];
    const milestones = milestonesResult.data || [];
    const tasks = tasksResult.data || [];
    const surveys = surveysResult.data || [];
    const surveyTemplates = surveyTemplatesResult.data || [];
    const surveyTaskTemplates = surveyTaskTemplatesResult.data || [];
    const qtoItems = qtoItemsResult.data || [];
    const qtoTemplates = qtoTemplatesResult.data || [];

    const taskFeedOutput = tasks.map((task: any) => (
        <TaskItemServerWrapper
            key={task.id}
            task={task}
            members={members}
            projectId={id}
            currentUserId={currentUserId}
        />
    ));

    if (!project) return <div>Không tìm thấy dự án</div>;

    return (
        <div className="container mx-auto px-2 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6 bg-gray-50 min-h-screen">
            {/* Header & Stats Cards giữ nguyên ... */}
            <div className="bg-white p-3 md:p-0 rounded-lg md:bg-transparent shadow-sm md:shadow-none">
                <ProjectHeaderWrapper project={project} permissions={permissions} />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6">
                <div className="col-span-1">
                    <StatCard icon={<Clock size={18} />} title="Thời gian" value={`${formatDate(project.start_date)} - ${formatDate(project.end_date)}`} />
                </div>
                <div className="col-span-1">
                    <StatCard icon={<Banknote size={18} />} title="Ngân sách" value={`${formatCurrency(project.budget)}`} />
                </div>
                <div className="col-span-2 md:col-span-1">
                    <StatCard icon={<TrendingUp size={18} />} title="Tiến độ" value={<div className="w-full mt-1"><ProgressBar value={project.progress_percent || 0} /></div>} />
                </div>
            </div>

            {/* Tabs Content */}
            <div className="bg-white p-2 md:p-6 rounded-lg shadow border border-gray-100">
                <ProjectTabs
                    projectId={id}
                    project={project}
                    members={members}
                    documents={documents}
                    financeStats={financeStats}
                    milestones={milestones}
                    tasks={tasks}
                    surveys={surveys}
                    surveyTemplates={surveyTemplates}
                    surveyTaskTemplates={surveyTaskTemplates}
                    qtoItems={qtoItems}
                    qtoTemplates={qtoTemplates}
                    requests={requests}
                    taskFeed={taskFeedOutput}
                    membersCount={members.length}
                    documentsCount={documents.length}
                />
            </div>
        </div>
    );
}