"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    MoreHorizontal, FileText, PiggyBank, Wallet, Coins, X, Trash2, Eye, Edit, Building2
} from "lucide-react"

import { Button } from "@/components/ui/button" // Đảm bảo đã import Button
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteProject } from "@/lib/action/projectActions"
import { formatCurrency, formatDate } from "@/lib/utils/utils"
//import type { ProjectData } from "@/types/project"
import type { ProjectWithExtras } from "@/types/project";

interface ProjectListProps {
    projects: ProjectWithExtras[];
    currentUserRole?: string;
    dictionaries: {
        statuses: { id: string; name: string; code: string; color?: string }[];
        types?: any[];
        constructionTypes?: any[];
    };
}

// --- Component Xóa ---
function DeleteActionItem({ project }: { project: ProjectWithExtras }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        await deleteProject(project.id);
        setOpen(false);
        router.refresh();
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 cursor-pointer">
                    <Trash2 className="w-4 h-4 mr-2" /> Xóa dự án
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
                    <AlertDialogDescription>Dữ liệu của <b>{project.name}</b> sẽ bị xóa vĩnh viễn.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600">Xóa</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// --- Project Row ---
function ProjectRow({ project }: { project: ProjectWithExtras }) {
    const statusColor = project.status_data?.color || "#64748b";
    const statusBg = statusColor + "15";
    const statusName = project.status_data?.name || "Không xác định";

    const actualProgress = project.progress || 0;
    const planProgress = 88; // Hardcode tạm
    const managerName = project.manager?.name || "Chưa chỉ định";

    return (
        <div className="bg-white p-5 rounded-lg shadow-sm border border-slate-200 mb-4 hover:shadow-md transition-all relative group">
            {/* Action Menu */}
            <div className="absolute top-4 right-4 z-20">
                <DropdownMenu>
                    {/* ✅ FIX: Sử dụng asChild và Button để tránh lỗi Hydration ID mismatch */}
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-5 w-5 text-slate-400 hover:text-slate-600" />
                            <span className="sr-only">Mở menu</span>
                        </Button>
                    </DropdownMenuTrigger>

                    <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={`/projects/${project.id}`}><Eye className="w-4 h-4 mr-2" /> Xem chi tiết</Link></DropdownMenuItem>
                        <DropdownMenuItem asChild><Link href={`/projects/${project.id}/settings`}><Edit className="w-4 h-4 mr-2" /> Chỉnh sửa</Link></DropdownMenuItem>
                        <DropdownMenuSeparator /><DeleteActionItem project={project} />
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <div className="flex flex-col lg:flex-row gap-6">
                {/* COL 1: Thông tin */}
                <div className="flex-1 lg:max-w-[40%] space-y-3">
                    <div>
                        <Link href={`/projects/${project.id}`} className="text-xl font-bold text-slate-800 uppercase hover:text-blue-600 block pr-8 leading-tight">
                            {project.name}
                        </Link>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase" style={{ backgroundColor: statusBg, color: statusColor }}>
                                ● {statusName}
                            </span>
                        </div>
                    </div>

                    <div className="text-sm text-slate-500 space-y-1">
                        <div>Mã dự án: <span className="font-medium text-slate-700">{project.project_code || project.code || "---"}</span></div>
                        <div>Người tạo: <span className="text-slate-700">{managerName}</span></div>
                    </div>

                    <div className="flex items-center gap-4 text-xs pt-1">
                        <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded"><span className="font-bold block mb-0.5">BẮT ĐẦU</span>{formatDate(project.start_date)}</div>
                        <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded"><span className="font-bold block mb-0.5">KẾT THÚC</span>{formatDate(project.end_date)}</div>
                    </div>

                    <div className="flex items-center pt-2">
                        <div className="flex -space-x-3">
                            {project.members_list?.slice(0, 5).map((m: any, i: number) => (
                                <Avatar key={i} className="h-8 w-8 border-2 border-white shadow-sm">
                                    <AvatarImage src={m.avatar} /><AvatarFallback className="text-[10px] bg-slate-200">{m.name?.charAt(0)}</AvatarFallback>
                                </Avatar>
                            ))}
                            {(project.members_list?.length || 0) > 5 && (
                                <div className="h-8 w-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs text-slate-500 font-bold">+{project.members_list!.length - 5}</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* COL 2: Chart & Progress */}
                <div className="flex-1 flex items-center justify-center lg:justify-start gap-8 lg:border-l lg:border-r border-slate-100 lg:px-8">
                    <div className="relative w-32 h-32 flex-shrink-0">
                        <div className="w-full h-full rounded-full border-[8px] border-slate-50" style={{ background: `conic-gradient(#3b82f6 ${actualProgress}%, #e2e8f0 0)` }}></div>
                        <div className="absolute inset-2 bg-white rounded-full flex flex-col items-center justify-center shadow-sm">
                            <span className="text-3xl font-bold text-slate-800">{project.task_count || 0}</span>
                            <span className="text-[10px] text-slate-500 font-bold uppercase">Công việc</span>
                        </div>
                    </div>
                    <div className="flex-1 space-y-4 min-w-[140px]">
                        <div>
                            <div className="flex justify-between text-xs mb-1 font-bold text-slate-600"><span>Tiến độ KH</span><span className="text-blue-600">{planProgress}%</span></div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${planProgress}%` }}></div></div>
                        </div>
                        <div>
                            <div className="flex justify-between text-xs mb-1 font-bold text-slate-600"><span>Tiến độ TT</span><span className="text-amber-600">{actualProgress}%</span></div>
                            <div className="h-2 bg-slate-100 rounded-full overflow-hidden"><div className="h-full bg-amber-500 rounded-full" style={{ width: `${actualProgress}%` }}></div></div>
                        </div>
                    </div>
                </div>

                {/* COL 3: KPI Bars */}
                <div className="flex-1 space-y-3 text-[11px] lg:pt-8 pr-4">
                    {[{ label: "KPI tiến độ", val: 43, color: "bg-orange-400", text: "-43% Chậm", txtColor: "text-orange-500" },
                    { label: "KPI chênh lệch", val: 54, color: "bg-red-500", text: "54% Ít vốn", txtColor: "text-red-500" },
                    { label: "KPI dư thực tế", val: 32, color: "bg-green-500", text: "32% OK", txtColor: "text-green-600" },
                    { label: "KPI dự kế hoạch", val: 69, color: "bg-green-500", text: "69% OK", txtColor: "text-green-600" }
                    ].map((kpi, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                            <span className="w-24 text-right text-slate-500 font-bold shrink-0">{kpi.label}</span>
                            <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden"><div className={`h-full ${kpi.color} rounded-full`} style={{ width: `${kpi.val}%` }}></div></div>
                            <span className={`w-20 text-right font-bold ${kpi.txtColor} shrink-0`}>{kpi.text}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* ROW 2: Footer Financials */}
            <div className="mt-5 pt-4 border-t border-slate-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-3">
                    <FileText className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <div><div className="text-[10px] uppercase text-slate-500 font-bold">Công việc</div><div className="font-bold text-slate-800 text-sm">{project.task_count || 0}</div></div>
                </div>
                <div className="flex items-center gap-3">
                    <PiggyBank className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <div><div className="text-[10px] uppercase text-slate-500 font-bold">Ngân sách</div><div className="font-bold text-slate-800 text-sm">{formatCurrency(project.budget || 0)}</div></div>
                </div>
                <div className="flex items-center gap-3">
                    <Wallet className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <div><div className="text-[10px] uppercase text-slate-500 font-bold">Thu</div><div className="font-bold text-emerald-600 text-sm">{formatCurrency(project.total_income || 0)}</div></div>
                </div>
                <div className="flex items-center gap-3">
                    <Coins className="w-8 h-8 text-slate-300 stroke-[1.5]" />
                    <div><div className="text-[10px] uppercase text-slate-500 font-bold">Chi</div><div className="font-bold text-red-600 text-sm">{formatCurrency(project.total_expenses || 0)}</div></div>
                </div>
            </div>
        </div>
    )
}

// --- Summary Dashboard ---
function SummaryDashboard({ projects }: { projects: ProjectWithExtras[] }) {
    const total = projects.length;

    const getCount = (codes: string[]) => projects.filter(p => {
        const code = (p.status_data?.code || p.status || "").toLowerCase();
        return codes.includes(code);
    }).length;

    const planning = getCount(['initial', 'planning', 'concept', 'design', 'bidding', 'pending', 'draft']);
    const inProgress = getCount(['active', 'in_progress', 'execution', 'construction', 'implementation', 'processing']);
    const paused = getCount(['paused', 'on_hold', 'suspended', 'delayed', 'warning', 'problem']);
    const completed = getCount(['completed', 'finished', 'handed_over', 'done', 'closed', 'finalized']);
    const cancelled = getCount(['cancelled', 'terminated', 'rejected']);

    const calcPercent = (val: number) => total > 0 ? Math.round(val / total * 100) : 0;

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="bg-[#009688] text-white p-4 rounded-md shadow flex items-center justify-between">
                <div className="relative w-24 h-24 flex items-center justify-center border-4 border-white/30 rounded-full text-2xl font-bold">{total}</div>
                <div className="flex-1 ml-4 space-y-1 text-sm font-medium">
                    <div className="flex justify-between border-b border-white/10 pb-1"><span>⬜ Kế hoạch</span> <span>{planning} ({calcPercent(planning)}%)</span></div>
                    <div className="flex justify-between border-b border-white/10 pb-1"><span>🟦 Đang làm</span> <span>{inProgress} ({calcPercent(inProgress)}%)</span></div>
                    <div className="flex justify-between border-b border-white/10 pb-1"><span>🟨 Tạm dừng</span> <span>{paused} ({calcPercent(paused)}%)</span></div>
                    <div className="flex justify-between border-b border-white/10 pb-1"><span>🟩 Hoàn thành</span> <span>{completed} ({calcPercent(completed)}%)</span></div>
                    <div className="flex justify-between border-b border-white/10 pb-1"><span>🟩 Hủy</span> <span>{cancelled} ({calcPercent(cancelled)}%)</span></div>
                </div>
            </div>
            <div className="bg-[#009688] text-white p-4 rounded-md shadow flex items-center justify-between">
                <div className="relative w-24 h-24 flex items-center justify-center border-4 border-white/30 rounded-full text-2xl font-bold">{total}</div>
                <div className="flex-1 ml-4 space-y-1 text-sm font-medium">
                    <div className="flex justify-between border-b border-white/10 pb-1"><span>⬜ Bình thường</span> <span>{planning + inProgress + completed}</span></div>
                    <div className="flex justify-between border-b border-white/10 pb-1"><span>🟩 Tăng tốc</span> <span>0</span></div>
                    <div className="flex justify-between border-b border-white/10 pb-1"><span>🟨 Lưu ý</span> <span>{paused}</span></div>
                    <div className="flex justify-between border-b border-white/10 pb-1"><span>🟥 Hủy/Tạm dừng</span> <span>{cancelled}</span></div>
                </div>
            </div>
        </div>
    )
}

// --- Main List ---
export default function ProjectList({ projects, currentUserRole, dictionaries }: ProjectListProps) {
    const currentYear = new Date().getFullYear().toString();
    const [filterStatus, setFilterStatus] = useState<string>("active");
    const [filterYear, setFilterYear] = useState<string>(currentYear);

    const statusOptions = dictionaries?.statuses || [];

    const years = useMemo(() => {
        const uniqueYears = Array.from(new Set(projects.map(p => p.start_date ? new Date(p.start_date).getFullYear() : new Date().getFullYear())));
        if (!uniqueYears.includes(new Date().getFullYear())) uniqueYears.push(new Date().getFullYear());
        return uniqueYears.sort((a, b) => b - a);
    }, [projects]);

    const dashboardProjects = useMemo(() => {
        return projects.filter(project => {
            const projectYear = project.start_date ? new Date(project.start_date).getFullYear().toString() : new Date().getFullYear().toString();
            return filterYear === "all" || projectYear === filterYear;
        });
    }, [projects, filterYear]);

    const filteredProjects = useMemo(() => {
        return dashboardProjects.filter(project => {
            const statusCode = (project.status_data?.code || project.status || "").toLowerCase();
            if (filterStatus === "active") {
                return !["completed", "cancelled", "finished", "done", "handed_over", "closed"].includes(statusCode);
            } else if (filterStatus !== "all") {
                return statusCode === filterStatus;
            }
            return true;
        });
    }, [dashboardProjects, filterStatus]);

    return (
        <div className="space-y-6 bg-slate-50 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center bg-white p-3 rounded shadow-sm gap-4">
                <h1 className="text-xl font-bold text-slate-700">Danh sách dự án</h1>
                <div className="flex flex-wrap gap-2 items-center">
                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="h-9 px-3 text-sm border border-slate-300 rounded bg-white cursor-pointer hover:border-blue-500 min-w-[150px]">
                        <option value="active">⚡ Đang thực hiện</option>
                        <option value="all">Tất cả trạng thái</option>
                        <option disabled>──────</option>
                        {statusOptions.map((s) => (
                            <option key={s.id} value={s.code.toLowerCase()}>{s.name}</option>
                        ))}
                    </select>

                    <select value={filterYear} onChange={(e) => setFilterYear(e.target.value)} className="h-9 px-3 text-sm border border-slate-300 rounded bg-white cursor-pointer hover:border-blue-500">
                        <option value="all">Tất cả năm</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    {(filterStatus !== 'active' || filterYear !== currentYear) && (
                        <Button variant="ghost" size="icon" onClick={() => { setFilterStatus("active"); setFilterYear(currentYear) }} title="Xóa bộ lọc"><X className="w-4 h-4 text-red-500" /></Button>
                    )}
                    <Button className="bg-[#4caf50] hover:bg-[#43a047] text-white ml-2 shadow-sm font-bold" size="sm" asChild>
                        <Link href="/projects/new"><Building2 className="w-4 h-4 mr-1" /> Khởi Tạo Dự Án</Link>
                    </Button>
                </div>
            </div>

            <SummaryDashboard projects={dashboardProjects} />

            <div>
                {filteredProjects.length > 0 ? (
                    filteredProjects.map(project => (<ProjectRow key={project.id} project={project} />))
                ) : (
                    <div className="text-center py-12 text-slate-500 bg-white rounded shadow-sm border border-dashed">
                        Không tìm thấy dự án nào phù hợp với bộ lọc.
                    </div>
                )}
            </div>
        </div>
    )
}