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
import { getQuotations } from "@/lib/action/quotationActions";
import { getContracts } from "@/lib/action/contractActions";

// --- Import Action cho Vật tư & Chi phí ---
import { getProjectQTO, getMaterialBudget } from "@/lib/action/qtoActions";
import { getNorms } from "@/lib/action/normActions";
import { getEstimationItems, getCostTemplates } from "@/lib/action/estimationActions";

// --- Import Action cho Yêu cầu Vật tư ---
import { getProjectRequests } from "@/lib/action/requestActions";

// --- Import Action cho Pháp lý (MỚI) ---
import { getProjectLegalDocs } from "@/lib/action/legal-actions";

import { formatDate, formatCurrency } from "@/lib/utils/utils";
import { getCurrentSession } from "@/lib/supabase/session";
import { createClient } from "@supabase/supabase-js";

// --- Components ---
import ProjectTabs from "@/components/projects/ProjectTabs";
import ProjectHeaderWrapper from "@/components/projects/ProjectHeaderWrapper";
import StatCard from "@/components/projects/StatCard";
import TaskItemServerWrapper from '@/components/tasks/TaskItemServerWrapper';
import DebtWidget from "@/components/projects/finance/DebtWidget";
import ProgressBar from "@/components/ui/ProgressBar";
import { Badge } from "@/components/ui/badge";
import MaterialRequestManager from "@/components/projects/requests/MaterialRequestManager";
import QuotationPageClient from "./quotation/page-client";
import BOQMapper from "@/components/estimation/BOQMapper";
import ProjectLegalTab from "@/components/projects/tab/ProjectLegalTab"; // (MỚI)
import { getConstructionLogs } from "@/lib/action/log-actions";

import {
    Clock, Banknote, TrendingUp, Briefcase, FileText, Activity, Wallet,
    MapPin, Coins, Package, Scale
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProjectData } from "@/types/project";

// --- Helper Functions ---
function getStatusLabel(status: string | null) {
    switch (status) {
        case "in_progress": return "Đang tiến hành";
        case "completed": return "Hoàn thành";
        case "on_hold": return "Tạm dừng";
        case "planning": return "Kế hoạch";
        case "cancelled": return "Đã hủy";
        default: return "Khởi tạo";
    }
}

function getBadgeClass(status: string | null) {
    switch (status) {
        case "completed": return "bg-green-100 text-green-700 border-green-300 hover:bg-green-200";
        case "in_progress": return "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200";
        case "on_hold": return "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200";
        case "cancelled": return "bg-red-100 text-red-700 border-red-300 hover:bg-red-200";
        default: return "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200";
    }
}

// --- Types Mở rộng ---
type ProjectWithExtras = ProjectData & {
    risk_data?: { name: string; color: string; code?: string } | null;
    status_data?: { name: string; color: string; code?: string } | null;
    priority_data?: { name: string; color: string; code?: string } | null;
    type_data?: { name: string; code?: string } | null;
    construction_type_data?: { name: string; code?: string } | null;
    customer?: { name: string; phone?: string; email?: string; avatar_url?: string } | null;
    manager?: { id: string; name: string; email?: string; avatar_url?: string } | null;
    employees?: { name: string; email?: string; avatar_url?: string } | null;
    total_contract_value?: number;
    geocode?: string | null;

    // Bổ sung các trường pháp lý nếu ProjectData gốc chưa có (đề phòng)
    land_lot_number?: string | null;
    land_parcel_number?: string | null;
    construction_permit_code?: string | null;
    permit_issue_date?: string | null;
    total_floor_area?: number | null;
    num_floors?: number | null;
};

interface FinanceStats {
    totalRevenue: number;
    totalCost: number;
    actualReceived: number;
    remainingDebt: number;
    overdueCount: number;
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
        canEditEstimate: ["MANAGER"].includes(projectRoleCode || "") || session.role === "admin",
    };

    // Load Data Parallel
    const [
        projectRes, membersRes, docsRes, financeRes, milestonesRes,
        tasksRes, surveysRes, surveyTemplatesRes, surveyTaskTemplatesRes,
        rolesRes, employeesRes, quotationsRes, contractsRes,
        qtoItems, norms, estimateRes, costTemplatesRes,
        budgetRes,
        materialRequestsRes,
        legalDocsRes,
        constructionLogsRes
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
        getProjectLegalDocs(id), // Gọi hàm này
        getConstructionLogs(id)
    ]);

    let project = (projectRes as any)?.data as ProjectWithExtras;

    // --- Logic Admin Fallback ---
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
                priority_data:sys_dictionaries!priority_id ( name, color, code ),
                risk_data:sys_dictionaries!risk_level_id ( name, color, code ),
                type_data:sys_dictionaries!type_id ( name, code ),
                construction_type_data:sys_dictionaries!construction_type_id ( name, code ),
                customer:customers!customer_id ( name, phone, email, avatar_url ),
                employees!project_manager ( id, name, email, avatar_url ),
                contracts(value, status)
            `)
            .eq("id", id)
            .single();

        if (adminProject) {
            const raw = adminProject as any;
            const totalContractValue = raw.contracts?.reduce((sum: number, c: any) => {
                return c.status !== 'cancelled' ? sum + (c.value || 0) : sum;
            }, 0) || 0;

            project = {
                ...raw,
                total_contract_value: totalContractValue,
                manager: raw.employees ? {
                    id: raw.employees.id,
                    name: raw.employees.name,
                    email: raw.employees.email,
                    avatar_url: raw.employees.avatar_url
                } : null
            } as ProjectWithExtras;
        }
    }

    if (!project) {
        return <div className="p-20 text-center">Dự án không tồn tại hoặc bạn không có quyền truy cập.</div>;
    }

    // --- Normalize Data ---
    const financeStats = (financeRes as unknown as FinanceStats) || {
        totalRevenue: 0, totalCost: 0, actualReceived: 0, remainingDebt: 0, overdueCount: 0, profit: 0, profitMargin: 0
    };
    const members = (membersRes as any)?.data || [];
    const documents = (docsRes as any)?.data || [];
    const milestones = (milestonesRes as any)?.data || [];
    const tasks = (tasksRes as any)?.data || [];
    const quotations = (quotationsRes as any)?.success ? (quotationsRes as any).data : [];
    const contracts = (contractsRes as any)?.success ? (contractsRes as any).data : [];
    const surveys = (surveysRes as any)?.data || [];
    const surveyTemplates = (surveyTemplatesRes as any)?.data || [];
    const surveyTaskTemplates = (surveyTaskTemplatesRes as any)?.data || [];
    const roles = Array.isArray(rolesRes) ? rolesRes : ((rolesRes as any)?.data || []);
    const allEmployees = (employeesRes as any)?.employees || [];
    const estimates = (estimateRes as any)?.data || [];
    const costTemplates = (costTemplatesRes as any)?.data || [];
    const legalDocs = Array.isArray(legalDocsRes) ? legalDocsRes : []; // Data pháp lý
    const constructionLogs = Array.isArray(constructionLogsRes) ? constructionLogsRes : [];

    // --- Calculations ---
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
    const kpiProgressColor = kpiProgress >= 0 ? "text-green-600" : "text-red-600";
    const daysRemaining = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    const gmapsQuery = project.geocode || (project.address ? encodeURIComponent(project.address) : null);
    const googleMapsUrl = gmapsQuery ? `http://googleusercontent.com/maps.google.com/maps?q=${gmapsQuery}` : null;

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

            {/* --- Stats Cards --- */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 animate-in fade-in duration-500">
                <StatCard
                    icon={<Clock size={18} className="text-blue-500" />}
                    title="Thời gian"
                    value={
                        <div className="flex flex-col">
                            <span>{formatDate(project.end_date)}</span>
                            <span className={`text-[10px] ${daysRemaining >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {daysRemaining >= 0 ? `Còn ${daysRemaining} ngày` : `Trễ ${Math.abs(daysRemaining)} ngày`}
                            </span>
                        </div>
                    }
                />
                <StatCard
                    icon={<Banknote size={18} className="text-emerald-500" />}
                    title="Giá trị Hợp đồng"
                    value={formatCurrency(project.total_contract_value || 0)}
                />
                <StatCard icon={<Wallet size={18} className="text-blue-600" />} title="Thực thu (Tiền mặt)" value={formatCurrency(financeStats.actualReceived)} />
                <StatCard icon={<TrendingUp size={18} className="text-orange-500" />} title="Thực chi" value={formatCurrency(financeStats.totalCost)} />
            </div>

            {/* --- Main Tabs --- */}
            <Tabs defaultValue="overview" className="space-y-4">
                <TabsList className="bg-white p-1 border rounded-lg w-full md:w-auto flex justify-start overflow-x-auto">
                    <TabsTrigger value="overview"><Activity className="w-4 h-4 mr-2" />Tổng quan</TabsTrigger>

                    {/* --- TAB PHÁP LÝ (MỚI) --- */}
                    <TabsTrigger value="legal"><Scale className="w-4 h-4 mr-2 text-purple-600" />Hồ sơ Pháp lý</TabsTrigger>

                    <TabsTrigger value="execution"><Briefcase className="w-4 h-4 mr-2" />Thi công & Nhiệm vụ</TabsTrigger>
                    <TabsTrigger value="cost_management"><Coins className="w-4 h-4 mr-2 text-yellow-600" />Chi phí & Vật tư</TabsTrigger>
                    <TabsTrigger value="material_request"><Package className="w-4 h-4 mr-2" />Yêu cầu Vật tư</TabsTrigger>
                    <TabsTrigger value="quotation"><FileText className="w-4 h-4 mr-2" />Báo giá & Hợp đồng</TabsTrigger>
                </TabsList>

                {/* --- 1. TAB TỔNG QUAN --- */}
                <TabsContent value="overview" className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-6">
                            <Card className="shadow-sm border-none">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2">
                                        <Briefcase className="w-4 h-4 text-blue-600" /> Thông tin dự án
                                    </CardTitle>
                                    <Badge className={getBadgeClass(project.status_data?.code || project.status)}>
                                        {project.status_data?.name || getStatusLabel(project.status)}
                                    </Badge>
                                </CardHeader>
                                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                                    <div className="space-y-3">
                                        <div><span className="text-slate-400 block uppercase text-[10px] font-bold">Khách hàng</span><span className="font-semibold text-slate-700">{project.customer?.name || 'Chưa xác định'}</span></div>
                                        <div><span className="text-slate-400 block uppercase text-[10px] font-bold">Quản lý (PM)</span><span className="font-semibold text-slate-700">{project.manager?.name || 'Chưa phân công'}</span></div>
                                    </div>
                                    <div className="space-y-3">
                                        <div><span className="text-slate-400 block uppercase text-[10px] font-bold">Loại hình</span><span className="font-semibold text-slate-700">{project.construction_type_data?.name || 'Không xác định'}</span></div>
                                        <div>
                                            <span className="text-slate-400 block uppercase text-[10px] font-bold flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> Địa điểm
                                            </span>
                                            {googleMapsUrl ? (
                                                <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="font-medium text-blue-600 hover:underline truncate block">
                                                    {project.address || "Xem bản đồ"}
                                                </a>
                                            ) : <span className="text-slate-500">Chưa có địa chỉ</span>}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-sm border-none">
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base font-bold text-slate-800 flex items-center gap-2"><Activity className="w-4 h-4 text-orange-500" /> Tiến độ & KPI</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <div className="flex justify-between mb-1 text-sm"><span className="text-gray-600">Kế hoạch</span><span className="font-bold text-blue-600">{plannedProgress}%</span></div>
                                            <ProgressBar value={plannedProgress} colorClass="bg-blue-500" />
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1 text-sm"><span className="text-gray-600">Thực tế</span><span className="font-bold text-green-600">{actualProgress}%</span></div>
                                            <ProgressBar value={actualProgress} colorClass="bg-green-500" />
                                        </div>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg flex justify-between items-center">
                                        <span className="text-sm font-semibold text-slate-700">Đánh giá KPI:</span>
                                        <span className={`text-sm font-bold ${kpiProgressColor}`}>{kpiProgress > 0 ? `+${kpiProgress}%` : `${kpiProgress}%`} ({kpiProgressStatus})</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="space-y-6">
                            <DebtWidget debtData={{ remaining_debt: financeStats.remainingDebt, overdue_count: financeStats.overdueCount }} />
                            <Card className="shadow-sm border-none">
                                <CardHeader><CardTitle className="text-base">Tài chính dự án</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex flex-col items-end">
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-100 rounded-lg text-green-800 shadow-sm">
                                            <Banknote className="w-4 h-4" />
                                            <span className="text-sm font-medium">Giá trị HĐ:</span>
                                            <span className="text-lg font-bold">{formatCurrency(project.total_contract_value || 0)}</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Thực thu</span><span className="font-bold text-emerald-600">{formatCurrency(financeStats.actualReceived)}</span></div>
                                    <div className="flex justify-between items-center text-sm"><span className="text-slate-500">Thực chi</span><span className="font-bold text-red-500">-{formatCurrency(financeStats.totalCost)}</span></div>
                                    <div className="flex justify-between items-center mt-2 font-bold pt-2 border-t-2 border-double">
                                        <span className="text-slate-800 text-sm">Lợi nhuận gộp</span>
                                        <span className={financeStats.profit >= 0 ? "text-blue-600" : "text-red-600"}>{formatCurrency(financeStats.profit)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* --- 2. TAB PHÁP LÝ (MỚI) --- */}
                <TabsContent value="legal">
                    <div className="bg-white p-2 md:p-6 rounded-xl shadow-sm border border-slate-100 min-h-[500px]">
                        <ProjectLegalTab
                            project={project}
                            docs={legalDocs}
                        />
                    </div>
                </TabsContent>

                {/* --- 3. TAB THI CÔNG --- */}
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
                            allEmployees={allEmployees}
                            roles={roles}
                            isManager={permissions.canAddMember}
                            currentUserId={session.entityId || ""}
                            taskFeed={taskFeedOutput}
                            membersCount={members.length}
                            documentsCount={documents.length}
                            logs={constructionLogs}
                        />
                    </div>
                </TabsContent>

                {/* --- 4. TAB CHI PHÍ & VẬT TƯ --- */}
                <TabsContent value="cost_management">
                    <BOQMapper
                        projectId={id}
                        items={estimates}
                    />
                </TabsContent>

                {/* --- 5. TAB YÊU CẦU VẬT TƯ --- */}
                <TabsContent value="material_request">
                    <div className="bg-white p-2 md:p-6 rounded-xl shadow-sm border border-slate-100 min-h-[500px]">
                        <MaterialRequestManager
                            projectId={id}
                            requests={Array.isArray(materialRequestsRes) ? materialRequestsRes : []}
                        />
                    </div>
                </TabsContent>

                {/* --- 6. TAB BÁO GIÁ & HỢP ĐỒNG --- */}
                <TabsContent value="quotation">
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100 min-h-[500px]">
                        <QuotationPageClient
                            projectId={id}
                            project={project}
                            quotations={quotations}
                            contracts={contracts}
                        />
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
}