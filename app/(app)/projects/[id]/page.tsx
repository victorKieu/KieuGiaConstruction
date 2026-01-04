import {
    getProject,
    getProjectMembers,
    getProjectDocuments,
    getProjectMilestones,
    getProjectTasks,
    getCurrentUserRoleInProject,
    getProjectRoles
} from "@/lib/action/projectActions";
import {
    getProjectSurveys,
    getSurveyTemplates,
    getSurveyTaskTemplates
} from "@/lib/action/surveyActions";
import { getQtoItems, getQtoTemplates } from "@/lib/action/qtoActions";
import { getProjectFinanceStats } from "@/lib/action/finance";
import { getCurrentUser } from "@/lib/action/authActions";
import { getEmployees } from "@/lib/action/employeeActions";
import { getMaterialRequests } from "@/lib/action/request";
import { formatDate, formatCurrency } from "@/lib/utils/utils";
import { getCurrentSession } from "@/lib/supabase/session";

// Components
import ProjectTabs from "@/components/projects/ProjectTabs";
import ProjectHeaderWrapper from "@/components/projects/ProjectHeaderWrapper";
import StatCard from "@/components/projects/StatCard";
import ProgressBar from "@/components/ui/ProgressBar";
import TaskItemServerWrapper from '@/components/tasks/TaskItemServerWrapper';
import { Clock, Banknote, TrendingUp } from 'lucide-react';

// Types
import { ProjectData } from "@/types/project";

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
    // 1. Resolve Params & Auth Session
    const { id } = await params;
    const session = await getCurrentSession();

    if (!session.isAuthenticated) {
        return <div className="p-10 text-center">Vui lòng đăng nhập để xem dự án.</div>;
    }

    // 2. Lấy Role và Quyền (Dựa trên logic: Session -> Entity ID -> Project Role)
    const projectRoleCode = await getCurrentUserRoleInProject(id);

    // Debug để kiểm tra logic 3 bước của bạn
    console.log("DEBUG AUTH FLOW:", {
        isAuthenticated: session.isAuthenticated,
        entityId: session.entityId, // ID từ bảng employee/customer
        projectRole: projectRoleCode
    });

    const permissions = {
        canEdit: projectRoleCode === "MANAGER" || session.role === "admin",
        // Nút thêm thành viên hiện ra nếu là Manager/Supervisor dự án HOẶC Admin hệ thống
        canAddMember: ["MANAGER", "SUPERVISOR"].includes(projectRoleCode || "") || session.role === "admin",
        canDeleteTask: projectRoleCode === "MANAGER" || session.role === "admin",
    };

    // 3. Parallel Data Fetching
    const [
        projectRes,
        membersRes,
        docsRes,
        financeRes,
        milestonesRes,
        tasksRes,
        surveysRes,
        surveyTemplatesRes,
        surveyTaskTemplatesRes,
        qtoRes,
        qtoTemplatesRes,
        requestsRes,
        rolesRes,      // Danh sách từ điển roles
        employeesRes   // Danh sách toàn bộ nhân viên
    ] = await Promise.all([
        getProject(id),
        getProjectMembers(id),
        getProjectDocuments(id),
        getProjectFinanceStats(id),
        getProjectMilestones(id),
        getProjectTasks(id),
        getProjectSurveys(id),
        getSurveyTemplates(),
        getSurveyTaskTemplates(),
        getQtoItems(id),
        getQtoTemplates(),
        getMaterialRequests(id),
        getProjectRoles(),
        getEmployees()
    ]);

    // 4. Data Extraction & Fallbacks (Sửa lỗi 'never' bằng Type Casting)
    const project = (projectRes as any)?.data as ProjectData;

    if (!project) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="text-center">
                    <h2 className="text-xl font-bold text-gray-800">Không tìm thấy dự án</h2>
                    <p className="text-gray-500">Dự án không tồn tại hoặc bạn không có quyền truy cập.</p>
                </div>
            </div>
        );
    }

    const members = (membersRes as any)?.data || [];
    const documents = (docsRes as any)?.data || [];
    const milestones = (milestonesRes as any)?.data || [];
    const tasks = (tasksRes as any)?.data || [];
    const financeStats = financeRes || { totalRevenue: 0, totalCost: 0, profit: 0, profitMargin: 0 };
    const surveys = (surveysRes as any)?.data || [];
    const surveyTemplates = (surveyTemplatesRes as any)?.data || [];
    const surveyTaskTemplates = (surveyTaskTemplatesRes as any)?.data || [];
    const qtoItems = Array.isArray(qtoRes) ? qtoRes : ((qtoRes as any)?.data || []);
    const qtoTemplates = Array.isArray(qtoTemplatesRes) ? qtoTemplatesRes : ((qtoTemplatesRes as any)?.data || []);
    const requests = Array.isArray(requestsRes) ? requestsRes : ((requestsRes as any)?.data || []);

    const roles = (rolesRes as any) || [];
    const allEmployees = (employeesRes as any)?.data || [];

    // 5. Pre-render Server Components cho Task Feed
    const taskFeedOutput = tasks.map((task: any) => (
        <TaskItemServerWrapper
            key={task.id}
            task={task}
            members={members}
            projectId={id}
            currentUserId={session.entityId || ""}
        />
    ));

    return (
        <div className="container mx-auto px-2 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6 bg-gray-50 min-h-screen">

            {/* Header */}
            <div className="bg-white p-3 md:p-0 rounded-lg md:bg-transparent shadow-sm md:shadow-none">
                <ProjectHeaderWrapper project={project} permissions={permissions} />
            </div>

            {/* Thống kê nhanh */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-6 animate-in fade-in duration-500">
                <StatCard
                    icon={<Clock size={18} className="text-blue-500" />}
                    title="Thời gian"
                    value={`${formatDate(project.start_date)} - ${formatDate(project.end_date)}`}
                />
                <StatCard
                    icon={<Banknote size={18} className="text-green-500" />}
                    title="Ngân sách"
                    value={`${formatCurrency(project.budget)}`}
                />
                <div className="col-span-2 md:col-span-1">
                    <StatCard
                        icon={<TrendingUp size={18} className="text-orange-500" />}
                        title="Tiến độ"
                        value={
                            <div className="w-full mt-2">
                                <ProgressBar value={project.progress_percent || 0} />
                                <span className="text-xs text-gray-500 block text-right mt-1">
                                    {project.progress_percent}% hoàn thành
                                </span>
                            </div>
                        }
                    />
                </div>
            </div>

            {/* Tabs Nội dung */}
            <div className="bg-white p-2 md:p-6 rounded-lg shadow border border-gray-100 min-h-[500px]">
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

                    // Props quản trị nhân sự
                    allEmployees={allEmployees}
                    roles={roles}
                    isManager={permissions.canAddMember}
                    currentUserId={session.entityId || ""}

                    taskFeed={taskFeedOutput}
                    membersCount={members.length}
                    documentsCount={documents.length}
                />
            </div>
        </div>
    );
}