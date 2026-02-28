export const dynamic = 'force-dynamic';
export const revalidate = 0;

import {
    getProject,
    getProjectMembers,
    getProjectMilestones,
    getCurrentUserRoleInProject,
    getProjectRoles,
} from "@/lib/action/projectActions";

import { getProjectDocuments } from "@/lib/action/documentActions";
import { getProjectTasks } from "@/lib/action/taskActions";
import { getDictionaryItems } from "@/lib/action/dictionaryActions"; // ✅ Đảm bảo action này tồn tại

import {
    getProjectSurveys,
    getSurveyTaskTemplates
} from "@/lib/action/surveyActions";
import { getEmployees } from "@/lib/action/employeeActions";
import { getQuotations } from "@/lib/action/quotationActions";
import { getContracts } from "@/lib/action/contractActions";

import { getProjectQTO, getMaterialBudget } from "@/lib/action/qtoActions";
import { getNorms } from "@/lib/action/normActions";
import { getEstimationItems, getCostTemplates } from "@/lib/action/estimationActions";
import { getProjectRequests } from "@/lib/action/requestActions";
import { getProjectLegalDocs } from "@/lib/action/legal-actions";
import { getConstructionLogs } from "@/lib/action/log-actions";

import { formatDate, formatCurrency } from "@/lib/utils/utils";
import { getCurrentSession } from "@/lib/supabase/session";

import ProjectTabs from "@/components/projects/ProjectTabs";
import ProjectHeaderWrapper from "@/components/projects/ProjectHeaderWrapper";
import StatCard from "@/components/projects/StatCard";
import TaskItemServerWrapper from '@/components/tasks/TaskItemServerWrapper';
import DebtWidget from "@/components/projects/finance/DebtWidget";
import ProgressBar from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/badge";
import MaterialRequestManager from "@/components/projects/requests/MaterialRequestManager";
import QuotationPageClient from "./quotation/page-client";
import AIProjectAnalytics from "@/components/projects/analytics/AIProjectAnalytics";
import ProjectEstimationTab from "@/components/projects/tab/ProjectEstimationTab";
import ProjectLegalTab from "@/components/projects/tab/ProjectLegalTab";

import {
    Clock, Banknote, TrendingUp, Briefcase, FileText, Activity, Wallet,
    MapPin, Coins, Package, Scale
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectData } from "@/types/project";

// Type mở rộng để hứng dữ liệu từ View
type ProjectWithExtras = ProjectData & {
    risk_data?: { name: string; color: string; code?: string } | null;
    status_data?: { name: string; color: string; code?: string } | null;
    priority_data?: { name: string; color: string; code?: string } | null;
    type_data?: { name: string; code?: string } | null;
    construction_type_data?: { name: string; code?: string } | null;
    customer?: { name: string; phone?: string; email?: string; avatar_url?: string } | null;
    manager?: { id: string; name: string; email?: string; avatar_url?: string } | null;
    total_contract_value?: number;
    total_income?: number;
    total_expenses?: number;
    overdue_count?: number;
    geocode?: string | null;
    land_lot_number?: string | null;
    land_parcel_number?: string | null;
    construction_permit_code?: string | null;
    permit_issue_date?: string | null;
    total_floor_area?: number | null;
    num_floors?: number | null;
};

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
        canEditEstimate: ["MANAGER"].includes(projectRoleCode || "") || session.role === "admin",
    };

    // Load Data Parallel
    const [
        projectRes, membersRes, docsRes, milestonesRes,
        tasksRes,
        surveysRes,
        surveyTypesRes, // 🔴 Đã đổi từ surveyTemplatesRes
        surveyTaskTemplatesRes,
        rolesRes, employeesRes, quotationsRes, contractsRes,
        qtoItems, norms, estimateRes, costTemplatesRes,
        budgetRes,
        materialRequestsRes,
        legalDocsRes,
        constructionLogsRes,
        taskStatusesRes,
        taskPrioritiesRes,
        projectStatusesRes
    ] = await Promise.all([
        getProject(id),
        getProjectMembers(id),
        getProjectDocuments(id),
        getProjectMilestones(id),
        getProjectTasks(id),
        getProjectSurveys(id),
        getDictionaryItems('SURVEY_TYPE'), // 🔴 Lấy từ Dictionary thay vì bảng mẫu cũ
        getSurveyTaskTemplates(),
        getProjectRoles(),
        getEmployees({ limit: 1000, page: 1 }),
        getQuotations(id),
        getContracts(id),
        getProjectQTO(id),
        getNorms(),
        getEstimationItems(id),
        getCostTemplates(),
        getMaterialBudget(id),
        getProjectRequests(id),
        getProjectLegalDocs(id),
        getConstructionLogs(id),
        getDictionaryItems('TASK_STATUS'),
        getDictionaryItems('TASK_PRIORITY'),
        getDictionaryItems('PROJECT_STATUS')
    ]);

    const project = (projectRes as any)?.data as ProjectWithExtras;

    if (!project) {
        return <div className="p-20 text-center">Dự án không tồn tại hoặc bạn không có quyền truy cập.</div>;
    }

    // --- TÍNH TOÁN TÀI CHÍNH ---
    const totalRevenue = project.total_contract_value || 0;
    const actualReceived = project.total_income || 0;
    const totalCost = project.total_expenses || 0;
    const remainingDebt = totalRevenue - actualReceived;
    const profit = actualReceived - totalCost;

    // Normalize Data
    const members = (membersRes as any)?.data || [];
    const documents = (docsRes as any)?.data || [];
    const milestones = (milestonesRes as any)?.data || [];
    const tasks = Array.isArray(tasksRes) ? tasksRes : [];
    const quotations = (quotationsRes as any)?.success ? (quotationsRes as any).data : [];
    const contracts = (contractsRes as any)?.success ? (contractsRes as any).data : [];
    const surveys = (surveysRes as any)?.data || [];

    // 🔴 Xử lý dữ liệu Dictionary Survey Types
    const surveyTypes = (surveyTypesRes as any)?.data || (Array.isArray(surveyTypesRes) ? surveyTypesRes : []);
    console.log("CHECK DICTIONARY:", surveyTypes);

    const surveyTaskTemplates = (surveyTaskTemplatesRes as any)?.data || [];
    const roles = Array.isArray(rolesRes) ? rolesRes : ((rolesRes as any)?.data || []);
    const allEmployees = (employeesRes as any)?.employees || [];

    const legalDocs = Array.isArray(legalDocsRes) ? legalDocsRes : [];
    const constructionLogs = Array.isArray(constructionLogsRes) ? constructionLogsRes : [];

    const getDictData = (res: any) => {
        if (Array.isArray(res)) return res;
        if (res && Array.isArray(res.data)) return res.data;
        return [];
    };

    const dictionaries = {
        statuses: getDictData(taskStatusesRes),
        priorities: getDictData(taskPrioritiesRes),
        projectStatuses: getDictData(projectStatusesRes)
    };

    // Calculations cho Tiến độ
    const actualProgress = project.progress || 0;
    const today = new Date();
    const startDate = project.start_date ? new Date(project.start_date) : new Date();
    const endDate = project.end_date ? new Date(project.end_date) : new Date();
    let plannedProgress = 0;
    if (today < startDate) plannedProgress = 0;
    else if (today > endDate) plannedProgress = 100;
    else {
        const totalDuration = endDate.getTime() - startDate.getTime();
        const elapsed = today.getTime() - startDate.getTime();
        plannedProgress = totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;
    }
    const kpiProgress = actualProgress - plannedProgress;
    const kpiProgressStatus = kpiProgress >= 0 ? "Đúng/Vượt tiến độ" : "Chậm tiến độ";
    const kpiProgressColor = kpiProgress >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
    const daysRemaining = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const gmapsQuery = project.geocode || (project.address ? encodeURIComponent(project.address) : null);
    const googleMapsUrl = gmapsQuery ? `https://www.google.com/maps/search/?api=1&query=${gmapsQuery}` : null;

    const taskFeedOutput = tasks.map((task: any) => (
        <TaskItemServerWrapper
            key={task.id}
            task={task}
            members={members}
            projectId={id}
            currentUserId={session.entityId || ""}
        />
    ));

    const statusColor = project.status_data?.color || "#64748b";
    const statusBg = `${statusColor}15`;
    const statusBorder = `${statusColor}40`;

    return (
        <div className="container mx-auto px-2 md:px-6 py-4 md:py-8 space-y-4 md:space-y-6 bg-background min-h-screen">
            <ProjectHeaderWrapper project={project} permissions={permissions} />

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-in fade-in duration-500">
                <StatCard
                    icon={<Clock size={18} className="text-blue-500 dark:text-blue-400" />}
                    title="Thời gian"
                    value={
                        <div className="flex flex-col">
                            <span>{formatDate(project.end_date)}</span>
                            <span className={`text-[10px] ${daysRemaining >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                                {daysRemaining >= 0 ? `Còn ${daysRemaining} ngày` : `Trễ ${Math.abs(daysRemaining)} ngày`}
                            </span>
                        </div>
                    }
                />
                <StatCard
                    icon={<Banknote size={18} className="text-emerald-500 dark:text-emerald-400" />}
                    title="Giá trị Hợp đồng"
                    value={formatCurrency(totalRevenue)}
                />
                <StatCard
                    icon={<Wallet size={18} className="text-blue-600 dark:text-blue-400" />}
                    title="Thực thu (Tiền mặt)"
                    value={formatCurrency(actualReceived)}
                />
                <StatCard
                    icon={<TrendingUp size={18} className="text-orange-500 dark:text-orange-400" />}
                    title="Thực chi"
                    value={formatCurrency(totalCost)}
                />
            </div>

            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-card p-1 border border-border rounded-lg w-full md:w-auto flex justify-start overflow-x-auto">
                    <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-2" />Tổng quan</TabsTrigger>
                    <TabsTrigger value="legal"><Scale className="w-4 h-4 mr-2 text-purple-600 dark:text-purple-400" />Hồ sơ Pháp lý</TabsTrigger>
                    <TabsTrigger value="execution"><Briefcase className="w-4 h-4 mr-2" />Thi công & Nhiệm vụ</TabsTrigger>
                    <TabsTrigger value="cost_management"><Coins className="w-4 h-4 mr-2 text-yellow-600 dark:text-yellow-400" />Chi phí & Vật tư</TabsTrigger>
                    <TabsTrigger value="material_request"><Package className="w-4 h-4 mr-2" />Yêu cầu Vật tư</TabsTrigger>
                    <TabsTrigger value="quotation"><FileText className="w-4 h-4 mr-2" />Báo giá & Hợp đồng</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                    <AIProjectAnalytics
                        project={project}
                        financeStats={{ totalRevenue, totalCost, actualReceived, profit }}
                    />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-sm border-none bg-card">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-blue-600 dark:text-blue-400" /> Thông tin dự án
                                    </CardTitle>
                                    <Badge
                                        variant="outline"
                                        style={{
                                            backgroundColor: statusBg,
                                            color: statusColor,
                                            borderColor: statusBorder
                                        }}
                                    >
                                        {project.status_data?.name || "Đang thực hiện"}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                    <div className="space-y-3">
                                        <div><span className="text-muted-foreground block uppercase text-[10px] font-bold">Khách hàng</span><span className="font-semibold text-foreground">{project.customer?.name || 'Chưa xác định'}</span></div>
                                        <div><span className="text-muted-foreground block uppercase text-[10px] font-bold">Quản lý (PM)</span><span className="font-semibold text-foreground">{project.manager?.name || 'Chưa phân công'}</span></div>
                                    </div>
                                    <div className="space-y-3">
                                        <div><span className="text-muted-foreground block uppercase text-[10px] font-bold">Loại hình</span><span className="font-semibold text-foreground">{project.construction_type_data?.name || 'Không xác định'}</span></div>
                                        <div>
                                            <span className="text-muted-foreground block uppercase text-[10px] font-bold flex items-center gap-1"><MapPin className="w-3 h-3" /> Địa điểm</span>
                                            {googleMapsUrl ? (
                                                <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline truncate block dark:text-blue-400">
                                                    {project.address || "Xem bản đồ"}
                                                </a>
                                            ) : <span className="text-muted-foreground">Chưa có địa chỉ</span>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-none bg-card">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2"><Activity className="w-4 h-4 text-orange-500 dark:text-orange-400" /> Tiến độ & KPI</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="flex justify-between mb-1 text-sm"><span className="text-muted-foreground">Kế hoạch</span><span className="font-bold text-blue-600 dark:text-blue-400">{plannedProgress}%</span></div>
                                            <ProgressBar value={plannedProgress} colorClass="bg-blue-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1 text-sm"><span className="text-muted-foreground">Thực tế</span><span className="font-bold text-green-600 dark:text-green-400">{actualProgress}%</span></div>
                                            <ProgressBar value={actualProgress} colorClass="bg-green-500" />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-muted/50 rounded-lg flex justify-between items-center">
                                        <span className="text-sm font-semibold text-foreground">Đánh giá KPI:</span>
                                        <span className={`text-sm font-bold ${kpiProgressColor}`}>{kpiProgress > 0 ? `+${kpiProgress}%` : `${kpiProgress}%`} ({kpiProgressStatus})</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <DebtWidget debtData={{ remaining_debt: remainingDebt, overdue_count: project.overdue_count || 0 }} />

                            <Card className="shadow-sm border-none bg-card">
                                <CardHeader><CardTitle className="text-base text-foreground">Tài chính dự án</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900 rounded-lg text-green-800 dark:text-green-300 shadow-sm">
                                            <Banknote className="w-4 h-4" />
                                            <span className="text-sm font-medium">Giá trị HĐ:</span>
                                            <span className="text-lg font-bold">{formatCurrency(totalRevenue)}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Thực thu</span><span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(actualReceived)}</span></div>
                                    <div className="flex justify-between items-center text-sm"><span className="text-muted-foreground">Thực chi</span><span className="font-bold text-red-500 dark:text-red-400">-{formatCurrency(totalCost)}</span></div>
                                    <div className="flex justify-between items-center mt-2 font-bold pt-2 border-t-2 border-double border-border">
                                        <span className="text-foreground text-sm">Lợi nhuận gộp</span>
                                        <span className={profit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"}>{formatCurrency(profit)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="legal">
                    <div className="bg-card p-2 md:p-6 rounded-xl shadow-sm border border-border min-h-[500px]">
                        <ProjectLegalTab project={project} docs={legalDocs} />
                    </div>
                </TabsContent>

                <TabsContent value="execution">
                    <div className="bg-card p-2 md:p-6 rounded-xl shadow-sm border border-border min-h-[500px]">
                        <ProjectTabs
                            projectId={id} project={project} members={members} documents={documents}
                            financeStats={{ totalRevenue, totalCost, actualReceived, remainingDebt, overdueCount: project.overdue_count || 0, profit, profitMargin: 0 }}
                            milestones={milestones} tasks={tasks} dictionaries={dictionaries} surveys={surveys}
                            // 🔴 Đã đổi prop sang surveyTypes
                            surveyTypes={surveyTypes}
                            surveyTaskTemplates={surveyTaskTemplates}
                            allEmployees={allEmployees} roles={roles} isManager={permissions.canAddMember}
                            currentUserId={session.entityId || ""} taskFeed={taskFeedOutput}
                            membersCount={members.length} documentsCount={documents.length} logs={constructionLogs}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="cost_management">
                    <ProjectEstimationTab projectId={id} />
                </TabsContent>

                <TabsContent value="material_request">
                    <div className="bg-card p-2 md:p-6 rounded-xl shadow-sm border border-border min-h-[500px]">
                        <MaterialRequestManager
                            projectId={id}
                            requests={Array.isArray(materialRequestsRes) ? materialRequestsRes : []}
                            projectStatus={project.status_data?.code || "INITIAL"}
                        />
                    </div>
                </TabsContent>

                <TabsContent value="quotation">
                    <div className="bg-card p-6 rounded-xl shadow-sm border border-border min-h-[500px]">
                        <QuotationPageClient projectId={id} project={project} quotations={quotations} contracts={contracts} />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}