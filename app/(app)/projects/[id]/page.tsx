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

import { getProjectFinanceStats } from "@/lib/action/finance";
import { getEmployees } from "@/lib/action/employeeActions";
import { getMaterialRequests } from "@/lib/action/request";
import { getQuotations } from "@/lib/action/quotationActions";
import { getContracts } from "@/lib/action/contractActions";

import { formatDate, formatCurrency } from "@/lib/utils/utils";
import { getCurrentSession } from "@/lib/supabase/session";
import { createClient } from "@supabase/supabase-js";

import ProjectTabs from "@/components/projects/ProjectTabs";
import ProjectHeaderWrapper from "@/components/projects/ProjectHeaderWrapper";
import StatCard from "@/components/projects/StatCard";
import TaskItemServerWrapper from '@/components/tasks/TaskItemServerWrapper';
import DebtWidget from "@/components/projects/finance/DebtWidget";
import { Clock, Banknote, TrendingUp, Briefcase, FileText, Activity, Wallet } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import QuotationPageClient from "./quotation/page-client";

import { ProjectData } from "@/types/project";

// 1. Mở rộng kiểu dữ liệu Project
type ProjectWithExtras = ProjectData & {
    risk_data?: { name: string; color: string; code?: string } | null;
    type_data?: { name: string; code?: string } | null;
    status_data?: { name: string; color: string; code?: string } | null;
    priority_data?: { name: string; color: string; code?: string } | null;
    customers?: { name: string; phone?: string; email?: string; avatar_url?: string } | null;
    employees?: { name: string; email?: string; avatar_url?: string } | null;
};

// ✅ FIX LỖI TS: Định nghĩa đúng kiểu cho Finance Stats trả về từ Action
interface FinanceStats {
    totalRevenue: number;
    totalCost: number;
    actualReceived: number;
    remainingDebt: number;   // Thêm trường này
    overdueCount: number;    // Thêm trường này
    profit: number;
    profitMargin: number;
}

interface PageProps {
    params: Promise<{ id: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
    const { id } = await params;
    const session = await getCurrentSession();

    if (!session.isAuthenticated) {
        return <div className="p-10 text-center">Vui lòng đăng nhập để xem dự án.</div>;
    }

    const projectRoleCode = await getCurrentUserRoleInProject(id);

    const permissions = {
        canEdit: projectRoleCode === "MANAGER" || session.role === "admin",
        canDelete: session.role === "admin",
        canAddMember: ["MANAGER", "SUPERVISOR"].includes(projectRoleCode || "") || session.role === "admin",
        canDeleteTask: projectRoleCode === "MANAGER" || session.role === "admin",
    };

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
        requestsRes,
        rolesRes,
        employeesRes,
        quotationsRes,
        contractsRes
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
        getMaterialRequests(id),
        getProjectRoles(),
        getEmployees({ limit: 1000, page: 1 }),
        getQuotations(id),
        getContracts(id)
    ]);

    let project = (projectRes as any)?.data as ProjectWithExtras;

    if (!project && session.role === 'admin') {
        const supabaseAdmin = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { data: adminProject } = await supabaseAdmin
            .from("projects")
            .select(`
                *,
                status_data:sys_dictionaries!status_id ( name, color, code ),
                type_data:sys_dictionaries!type_id ( name, code ),
                risk_data:sys_dictionaries!risk_level_id ( name, color, code ),
                priority_data:sys_dictionaries!priority_id ( name, color, code ),
                customers ( name, phone, email, avatar_url ),
                employees!project_manager ( name, email, avatar_url )
            `)
            .eq("id", id)
            .single();

        if (adminProject) project = adminProject as unknown as ProjectWithExtras;
    }

    if (!project) {
        return <div className="p-20 text-center">Dự án không tồn tại hoặc bạn không có quyền truy cập.</div>;
    }

    // ✅ FIX LỖI TS: Ép kiểu cho financeStats và xử lý fallback
    const financeStats = (financeRes as unknown as FinanceStats) || {
        totalRevenue: 0,
        totalCost: 0,
        actualReceived: 0,
        remainingDebt: 0,
        overdueCount: 0,
        profit: 0,
        profitMargin: 0
    };

    const members = (membersRes as any)?.data || [];
    const documents = (docsRes as any)?.data || [];
    const milestones = (milestonesRes as any)?.data || [];
    const tasks = (tasksRes as any)?.data || [];
    const requests = Array.isArray(requestsRes) ? requestsRes : ((requestsRes as any)?.data || []);

    // ✅ FIX LỖI TS: Đảm bảo gán mảng rỗng nếu dữ liệu là undefined
    const quotations = (quotationsRes as any)?.success ? (quotationsRes as any).data : [];
    const contracts = (contractsRes as any)?.success ? (contractsRes as any).data : [];

    // ✅ FIX LỖI TS: Khai báo lại các biến bị thiếu để truyền vào ProjectTabs
    const surveys = (surveysRes as any)?.data || [];
    const surveyTemplates = (surveyTemplatesRes as any)?.data || [];
    const surveyTaskTemplates = (surveyTaskTemplatesRes as any)?.data || [];
    const qtoItems: any[] = [];
    const qtoTemplates: any[] = [];
    const roles = Array.isArray(rolesRes) ? rolesRes : ((rolesRes as any)?.data || []);
    const allEmployees = (employeesRes as any)?.employees || [];

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
            <ProjectHeaderWrapper project={project} permissions={permissions} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-in fade-in duration-500">
                <StatCard
                    icon={<Clock size={18} className="text-blue-500" />}
                    title="Thời gian"
                    value={`${formatDate(project.start_date)} - ${formatDate(project.end_date)}`}
                />
                <StatCard
                    icon={<Banknote size={18} className="text-emerald-500" />}
                    title="Doanh thu (HĐ)"
                    value={formatCurrency(financeStats.totalRevenue)}
                />
                <StatCard
                    icon={<Wallet size={18} className="text-blue-600" />}
                    title="Thực thu (Tiền mặt)"
                    value={formatCurrency(financeStats.actualReceived)}
                />
                <StatCard
                    icon={<TrendingUp size={18} className="text-orange-500" />}
                    title="Ngân sách gốc"
                    value={formatCurrency(project.budget || 0)}
                />
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-white p-1 border rounded-lg w-full md:w-auto flex justify-start overflow-x-auto">
                    <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-2" />Tổng quan</TabsTrigger>
                    <TabsTrigger value="execution"><Briefcase className="w-4 h-4 mr-2" />Thi công & Nhiệm vụ</TabsTrigger>
                    <TabsTrigger value="quotation"><FileText className="w-4 h-4 mr-2" />Báo giá & Hợp đồng</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card className="md:col-span-2 shadow-sm border-none">
                            <CardHeader><CardTitle className="text-base">Thông tin dự án</CardTitle></CardHeader>
                            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                                <div>
                                    <span className="text-slate-400 block uppercase text-[10px] font-bold">Khách hàng</span>
                                    <span className="font-semibold text-slate-700">{project.customers?.name || 'Chưa xác định'}</span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block uppercase text-[10px] font-bold">Quản lý (PM)</span>
                                    <span className="font-semibold text-slate-700">{project.employees?.name || '---'}</span>
                                </div>
                                <div className="md:col-span-2">
                                    <span className="text-slate-400 block uppercase text-[10px] font-bold mb-1">Mô tả dự án</span>
                                    <p className="text-slate-600 bg-slate-50 p-4 rounded-lg border border-slate-100 italic leading-relaxed">
                                        {project.description || 'Không có mô tả chi tiết cho dự án này.'}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        <div className="space-y-4">
                            <DebtWidget
                                debtData={{
                                    remaining_debt: financeStats.remainingDebt,
                                    overdue_count: financeStats.overdueCount
                                }}
                            />

                            <Card className="shadow-sm border-none">
                                <CardHeader><CardTitle className="text-base">Tài chính dự án</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Tổng giá trị hợp đồng</span>
                                        <span className="font-bold">{formatCurrency(financeStats.totalRevenue)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Đã thu (Tiền mặt)</span>
                                        <span className="font-bold text-emerald-600">{formatCurrency(financeStats.actualReceived)}</span>
                                    </div>
                                    <div className="pt-2 border-t space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-slate-500">Thực chi vật tư/CP</span>
                                            <span className="font-bold text-red-500">-{formatCurrency(financeStats.totalCost)}</span>
                                        </div>
                                        <div className="flex justify-between items-center mt-2 font-bold pt-2 border-t-2 border-double">
                                            <span className="text-slate-800 text-sm">Lợi nhuận gộp</span>
                                            <span className={financeStats.profit >= 0 ? "text-blue-600" : "text-red-600"}>
                                                {formatCurrency(financeStats.profit)}
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="execution">
                    <div className="bg-white p-2 md:p-6 rounded-xl shadow-sm border border-slate-100 min-h-[500px]">
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
                            allEmployees={allEmployees}
                            roles={roles}
                            isManager={permissions.canAddMember}
                            currentUserId={session.entityId || ""}
                            taskFeed={taskFeedOutput}
                            membersCount={members.length}
                            documentsCount={documents.length}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="quotation">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[500px]">
                        <QuotationPageClient
                            projectId={id}
                            quotations={quotations}
                            contracts={contracts}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}