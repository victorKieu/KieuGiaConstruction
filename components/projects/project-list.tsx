"use client"

import { useState, useTransition, useMemo } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    MoreVertical, Calendar, Briefcase, ArrowUpRight, ArrowDownRight,
    Eye, Edit, Trash2, Loader2,
    Banknote, ScrollText, Filter, X
} from "lucide-react"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu"
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

import { deleteProject } from "@/lib/action/projectActions"
import { formatCurrency, formatDate } from "@/lib/utils/utils"
import type { ProjectData } from "@/types/project"

// --- 1. MỞ RỘNG INTERFACE ĐỂ TRÁNH LỖI TYPESCRIPT ---
interface ProjectWithExtras extends ProjectData {
    project_code?: string | null;
    total_contract_value?: number;
    total_income?: number;
    total_expenses?: number;
    status_data?: { name: string; color: string; code?: string } | null;
    construction_type_data?: { name: string; code?: string } | null;
}

interface ProjectListProps {
    projects: ProjectWithExtras[];
    currentUserRole?: string;
}

// Component con: Menu xóa dự án (Giữ nguyên gốc)
function DeleteActionItem({ project }: { project: ProjectWithExtras }) {
    const router = useRouter();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [open, setOpen] = useState(false);

    const handleDelete = async () => {
        startDeleteTransition(async () => {
            const result = await deleteProject(project.id);
            if (result.success) {
                setOpen(false);
                router.refresh();
            } else {
                alert(result.error);
            }
        });
    };

    return (
        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-600 cursor-pointer">
                    <Trash2 className="w-4 h-4 mr-2" /> Xóa dự án
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Bạn có chắc chắn muốn xóa?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Hành động này không thể hoàn tác. Toàn bộ dữ liệu liên quan đến dự án <b>{project.name}</b> sẽ bị xóa vĩnh viễn.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Hủy</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700" disabled={isDeleting}>
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Xác nhận xóa
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

// Helper lấy màu Badge (Giữ nguyên logic cũ nếu có, hoặc dùng logic đơn giản)
const getStatusLabel = (status: string | null) => {
    switch (status) {
        case "in_progress": return "Đang thi công";
        case "planning": return "Đang lập kế hoạch";
        case "on_hold": return "Tạm dừng";
        case "completed": return "Hoàn thành";
        case "cancelled": return "Đã hủy";
        default: return "Khởi tạo";
    }
};

export default function ProjectList({ projects, currentUserRole }: ProjectListProps) {
    const currentYear = new Date().getFullYear().toString();

    // --- 2. LOGIC LỌC (FILTER) ---
    // Mặc định: Năm hiện tại & Trạng thái Active
    const [filterStatus, setFilterStatus] = useState<string>("active");
    const [filterYear, setFilterYear] = useState<string>(currentYear);

    // Lấy danh sách năm
    const years = useMemo(() => {
        const uniqueYears = Array.from(new Set(projects.map(p => {
            return p.start_date ? new Date(p.start_date).getFullYear() : new Date().getFullYear();
        })));
        if (!uniqueYears.includes(new Date().getFullYear())) uniqueYears.push(new Date().getFullYear());
        return uniqueYears.sort((a, b) => b - a);
    }, [projects]);

    // Lọc dự án
    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            // Lọc Năm
            const projectYear = project.start_date
                ? new Date(project.start_date).getFullYear().toString()
                : new Date().getFullYear().toString();
            const matchYear = filterYear === "all" || projectYear === filterYear;

            // Lọc Trạng thái
            let matchStatus = true;
            if (filterStatus === "active") {
                // Không lấy Hoàn thành & Đã hủy
                matchStatus = !["completed", "cancelled"].includes(project.status || "");
            } else if (filterStatus !== "all") {
                matchStatus = project.status === filterStatus;
            }

            return matchYear && matchStatus;
        });
    }, [projects, filterStatus, filterYear]);

    const resetFilters = () => {
        setFilterStatus("active");
        setFilterYear(currentYear);
    };

    return (
        <div className="space-y-6">

            {/* --- PHẦN BỘ LỌC (CHÈN THÊM VÀO ĐẦU, KHÔNG SỬA CARD BÊN DƯỚI) --- */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Filter className="w-4 h-4" /> Bộ lọc:
                </div>
                <div className="flex gap-2 items-center">
                    <select
                        value={filterStatus}
                        onChange={(e) => setFilterStatus(e.target.value)}
                        className="text-sm border rounded px-2 py-1 h-9 bg-white min-w-[150px]"
                    >
                        <option value="active">⚡ Đang thực hiện</option>
                        <option value="all">Tất cả trạng thái</option>
                        <option disabled>──────</option>
                        <option value="planning">Lập kế hoạch</option>
                        <option value="in_progress">Đang thi công</option>
                        <option value="on_hold">Tạm dừng</option>
                        <option value="completed">Hoàn thành</option>
                        <option value="cancelled">Đã hủy</option>
                    </select>

                    <select
                        value={filterYear}
                        onChange={(e) => setFilterYear(e.target.value)}
                        className="text-sm border rounded px-2 py-1 h-9 bg-white min-w-[100px]"
                    >
                        <option value="all">Tất cả năm</option>
                        {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>

                    {(filterStatus !== 'active' || filterYear !== currentYear) && (
                        <Button variant="ghost" size="sm" onClick={resetFilters} className="h-9 px-2 text-red-500">
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                </div>
            </div>

            {/* --- DANH SÁCH DỰ ÁN (KHÔI PHỤC UI GỐC CỦA BẠN) --- */}
            <div className="text-sm text-slate-500 italic">
                Hiển thị {filteredProjects.length} / {projects.length} dự án
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredProjects.map((project) => {
                    // Logic màu badge (giữ nguyên hoặc tùy chỉnh nhẹ)
                    let statusColor = "bg-gray-100 text-gray-700 border-gray-200";
                    if (project.status === 'in_progress') statusColor = "bg-blue-50 text-blue-700 border-blue-200";
                    if (project.status === 'completed') statusColor = "bg-green-50 text-green-700 border-green-200";

                    const progress = project.progress || 0;
                    let progressColor = "bg-blue-600";
                    if (progress >= 100) progressColor = "bg-green-500";
                    else if (progress < 30) progressColor = "bg-orange-500";

                    return (
                        <Card key={project.id} className="group overflow-hidden hover:shadow-md transition-all duration-300 border-slate-200 flex flex-col">
                            <div className="p-5 flex flex-col gap-4 flex-1">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <Badge variant="outline" className={`${statusColor} mb-2`}>
                                            {project.status_data?.name || getStatusLabel(project.status)}
                                        </Badge>
                                        <Link href={`/projects/${project.id}`} className="block">
                                            <h3 className="font-bold text-lg text-slate-800 group-hover:text-blue-700 transition-colors line-clamp-1" title={project.name}>
                                                {project.name}
                                            </h3>
                                        </Link>
                                        <div className="text-xs text-slate-500 font-medium line-clamp-1">
                                            {project.project_code || "---"} • {project.construction_type_data?.name || "Công trình dân dụng"}
                                        </div>
                                    </div>

                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-slate-700">
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <DropdownMenuItem asChild>
                                                <Link href={`/projects/${project.id}`} className="cursor-pointer">
                                                    <Eye className="w-4 h-4 mr-2" /> Xem chi tiết
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/projects/${project.id}/settings`} className="cursor-pointer">
                                                    <Edit className="w-4 h-4 mr-2" /> Chỉnh sửa
                                                </Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DeleteActionItem project={project} />
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>

                                <div className="grid grid-cols-2 gap-4 py-2">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase font-semibold">
                                            <Calendar className="w-3.5 h-3.5" /> Khởi công
                                        </div>
                                        <div className="text-sm font-medium text-slate-700">
                                            {formatDate(project.start_date)}
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 uppercase font-semibold">
                                            <Calendar className="w-3.5 h-3.5" /> Hoàn thành
                                        </div>
                                        <div className="text-sm font-medium text-slate-700">
                                            {formatDate(project.end_date)}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-1.5 mt-auto pt-2">
                                    <div className="flex justify-between text-xs font-medium">
                                        <span className="text-slate-500">Tiến độ thi công</span>
                                        <span className={progress >= 100 ? "text-green-600" : "text-blue-600"}>{progress}%</span>
                                    </div>
                                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${progressColor} transition-all duration-500 rounded-full`}
                                            style={{ width: `${progress}%` }}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Footer Card - Giữ nguyên layout gốc của bạn */}
                            <div className="bg-slate-50 px-5 py-3 border-t border-slate-100">
                                <div className="grid grid-cols-2 gap-4 divide-x divide-slate-200">
                                    <div className="pr-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                                            <span className="text-[10px] uppercase text-emerald-700 font-semibold">Thực thu</span>
                                        </div>
                                        <div className="font-bold text-sm text-emerald-700">{formatCurrency(project.total_income || 0)}</div>
                                    </div>
                                    <div className="pl-4">
                                        <div className="flex items-center gap-2 mb-1">
                                            <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                                            <span className="text-[10px] uppercase text-red-700 font-semibold">Thực chi</span>
                                        </div>
                                        <div className="font-bold text-sm text-red-700">{formatCurrency(project.total_expenses || 0)}</div>
                                    </div>
                                </div>

                                <div className="mt-3 pt-3 border-t border-slate-200/60">
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-2 text-slate-600">
                                            <ScrollText className="w-4 h-4 text-blue-600" />
                                            <span>Hợp đồng:</span>
                                        </div>
                                        <span className="font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-slate-200 shadow-sm">
                                            {formatCurrency(project.total_contract_value || 0)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )
                })}

                {filteredProjects.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-500">
                        Không tìm thấy dự án nào trong năm {filterYear} với trạng thái này.
                    </div>
                )}
            </div>
        </div>
    )
}