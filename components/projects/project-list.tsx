"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import {
    MoreVertical, Calendar, Briefcase, DollarSign, ArrowUpRight, ArrowDownRight,
    AlertTriangle, Eye, Edit, Trash2, ListMinus, ScrollText, ReceiptText, Plus, Loader2,
    Banknote // ✅ Đã import Banknote
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
import type { ProjectData as Project } from "@/types/project"

interface ProjectListProps {
    projects: Project[];
    currentUserRole?: string;
}

// Component con: Menu xóa dự án
function DeleteActionItem({ project }: { project: Project }) {
    const router = useRouter();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const handleDeleteConfirm = async () => {
        startDeleteTransition(async () => {
            const result = await deleteProject(project.id);
            if (result.success) {
                alert(result.message || "Xóa dự án thành công!");
                setIsAlertOpen(false);
                router.refresh();
            } else {
                alert(`Lỗi khi xóa: ${result.error}`);
                setIsAlertOpen(false);
            }
        });
    };

    return (
        <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
            <AlertDialogTrigger asChild>
                <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                    onSelect={(e) => e.preventDefault()}
                >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Xóa dự án
                </DropdownMenuItem>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Xác nhận Xóa Dự án?</AlertDialogTitle>
                    <AlertDialogDescription>
                        Bạn có chắc chắn muốn xóa dự án <span className="font-bold text-black">"{project.name}"</span>?
                        <br /><br />
                        Hành động này sẽ xóa vĩnh viễn dự án và tất cả dữ liệu liên quan (thành viên, công việc, tài liệu...).
                        Không thể hoàn tác.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
                    <AlertDialogAction
                        onClick={handleDeleteConfirm}
                        disabled={isDeleting}
                        className="bg-red-600 hover:bg-red-700 text-white"
                    >
                        {isDeleting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                        Xác nhận Xóa
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}

export default function ProjectList({ projects, currentUserRole }: ProjectListProps) {
    const canDelete = currentUserRole === "admin";

    const getStatusBadge = (status: string | null) => {
        switch (status) {
            case "planning": return <Badge className="bg-blue-500 hover:bg-blue-600">Kế hoạch</Badge>;
            case "in_progress": return <Badge className="bg-green-500 hover:bg-green-600">Đang làm</Badge>;
            case "paused": return <Badge className="bg-yellow-500 hover:bg-yellow-600">Tạm dừng</Badge>;
            case "completed": return <Badge className="bg-purple-500 hover:bg-purple-600">Hoàn thành</Badge>;
            case "cancelled": return <Badge className="bg-red-500 hover:bg-red-600">Đã hủy</Badge>;
            default: return <Badge className="bg-gray-500">Không rõ</Badge>;
        }
    }

    const getRiskBadge = (risk: string | null) => {
        switch (risk) {
            case "normal": return <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">Bình thường</Badge>;
            case "accelerated": return <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">Tăng tốc</Badge>;
            case "delayed": return <Badge variant="outline" className="text-yellow-600 border-yellow-200 bg-yellow-50">Trì hoãn</Badge>;
            case "at_risk": return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">Rủi ro</Badge>;
            case "behind": return <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">Chậm tiến độ</Badge>;
            default: return <Badge variant="outline" className="text-gray-500 border-gray-200">Không rõ</Badge>;
        }
    }

    return (
        <div className="space-y-6">
            {(currentUserRole === 'admin' || currentUserRole === 'manager') && (
                <div className="flex justify-end mb-4 animate-in fade-in slide-in-from-right duration-500">
                    <Link href="/projects/new">
                        <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Thêm dự án
                        </Button>
                    </Link>
                </div>
            )}

            {projects.map((projectItem) => {
                // ✅ Ép kiểu any để truy cập các trường mở rộng (tránh lỗi TS nếu Type chưa update)
                const project = projectItem as any;

                const planProgress = project.progress || 0
                const actualProgress = (project.progress || 0) * 0.8 // Giả lập logic
                const kpiProgress = Math.min(100, Math.max(0, planProgress))
                const kpiDeviation = Math.min(100, Math.max(0, Math.abs(planProgress - actualProgress)))
                const kpiActualForecast = Math.min(100, Math.max(0, actualProgress * 1.2))
                const kpiPlanForecast = Math.min(100, Math.max(0, planProgress * 1.1))

                return (
                    <Card key={project.id} className="overflow-hidden hover:shadow-md transition-shadow duration-300 border-slate-200">
                        {/* HEADER */}
                        <div className="p-4 border-b bg-slate-50/30">
                            <div className="flex items-start justify-between">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-lg font-bold text-slate-800 hover:text-blue-600 transition-colors">
                                            <Link href={`/projects/${project.id}`}>{project.name}</Link>
                                        </h3>
                                        {project.status && getStatusBadge(project.status)}
                                    </div>
                                    <div className="text-sm text-slate-500 mt-1.5 flex flex-wrap gap-2 items-center">
                                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">#{project.code}</span>
                                        <span className="text-slate-300">•</span>
                                        {/* ✅ Fix hiển thị người tạo: Ưu tiên manager -> creator -> employees (legacy) */}
                                        <span>Quản lý: <span className="font-medium text-slate-700">{project.manager?.name || project.employees?.name || '---'}</span></span>

                                        {project.customers?.name && (
                                            <>
                                                <span className="text-slate-300">•</span>
                                                <span>Khách hàng: <span className="font-medium text-slate-700">{project.customers.name}</span></span>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreVertical className="h-4 w-4 text-slate-500" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-56">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/projects/${project.id}`}>
                                                <Eye className="h-4 w-4 mr-2 text-slate-500" />
                                                Xem chi tiết
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/projects/${project.id}/edit`}>
                                                <Edit className="h-4 w-4 mr-2 text-slate-500" />
                                                Chỉnh sửa thông tin
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        <DropdownMenuItem asChild>
                                            <Link href={`/projects/${project.id}?tab=survey`}>
                                                <ListMinus className="h-4 w-4 mr-2 text-slate-500" />
                                                Khảo sát công trình
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild>
                                            <Link href={`/projects/${project.id}?tab=qto`}>
                                                <ListMinus className="h-4 w-4 mr-2 text-slate-500" />
                                                Bóc tách khối lượng
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild>
                                            <Link href={`/projects/${project.id}?tab=estimation`}>
                                                <ScrollText className="h-4 w-4 mr-2 text-slate-500" />
                                                Dự toán
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild>
                                            <Link href={`/projects/${project.id}/quotation`}>
                                                <ReceiptText className="h-4 w-4 mr-2 text-slate-500" />
                                                Báo giá
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuItem asChild>
                                            <Link href={`/projects/${project.id}/logs`}>
                                                <ReceiptText className="h-4 w-4 mr-2 text-slate-500" />
                                                Nhật ký công trình
                                            </Link>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        {canDelete && <DeleteActionItem project={project} />}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* BODY */}
                        <div className="p-5">
                            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                                {/* CỘT TRÁI: TIẾN ĐỘ & KPI */}
                                <div className="xl:col-span-2 space-y-6">
                                    {/* Ngày tháng & Rủi ro */}
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-full shadow-sm"><Calendar className="h-4 w-4 text-blue-500" /></div>
                                            <div>
                                                <div className="text-xs text-slate-500">Ngày bắt đầu</div>
                                                <div className="font-medium text-sm text-slate-700">{formatDate(project.start_date || "")}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-full shadow-sm"><Calendar className="h-4 w-4 text-purple-500" /></div>
                                            <div>
                                                <div className="text-xs text-slate-500">Ngày kết thúc</div>
                                                <div className="font-medium text-sm text-slate-700">{formatDate(project.end_date || "")}</div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-white rounded-full shadow-sm"><AlertTriangle className="h-4 w-4 text-orange-500" /></div>
                                            <div>
                                                <div className="text-xs text-slate-500">Rủi ro</div>
                                                <div>{getRiskBadge(project.risk_level)}</div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Progress Bars */}
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex justify-between mb-1.5">
                                                <span className="text-sm font-medium text-slate-700">Tiến độ kế hoạch</span>
                                                <span className="text-sm font-bold text-blue-600">{planProgress.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div className="bg-blue-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${planProgress}%` }}></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-1.5">
                                                <span className="text-sm font-medium text-slate-700">Tiến độ thực tế</span>
                                                <span className="text-sm font-bold text-emerald-600">{actualProgress.toFixed(0)}%</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                                                <div className="bg-emerald-500 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${actualProgress}%` }}></div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* KPI Grid (Giữ nguyên UI) */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <div className="bg-white border border-slate-100 rounded p-3">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs text-slate-500 uppercase font-semibold">KPI Tiến độ</span>
                                                <span className="text-xs font-bold text-amber-600">+43% Chậm</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                <div className="bg-amber-500 h-1.5 rounded-full" style={{ width: `${kpiProgress}%` }}></div>
                                            </div>
                                        </div>
                                        <div className="bg-white border border-slate-100 rounded p-3">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-xs text-slate-500 uppercase font-semibold">KPI Chênh lệch</span>
                                                <span className="text-xs font-bold text-red-600">-34% Giảm</span>
                                            </div>
                                            <div className="w-full bg-slate-100 rounded-full h-1.5">
                                                <div className="bg-red-500 h-1.5 rounded-full" style={{ width: `${kpiDeviation}%` }}></div>
                                            </div>
                                        </div>
                                        {/* ... Thêm các KPI khác nếu cần ... */}
                                    </div>
                                </div>

                                {/* CỘT PHẢI: TÀI CHÍNH & TỔNG QUAN */}
                                <div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-100 flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-white rounded-full text-blue-600"><Briefcase className="h-5 w-5" /></div>
                                                <div>
                                                    <div className="text-xs text-slate-500">Tổng công việc</div>
                                                    <div className="font-bold text-lg text-slate-800">{project.total_tasks ?? "0"}</div>
                                                </div>
                                            </div>
                                            {/* Mini Pie Chart Placeholder */}
                                            <div className="relative w-12 h-12">
                                                <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#e2e8f0" strokeWidth="12" />
                                                    <circle cx="50" cy="50" r="40" fill="none" stroke="#3b82f6" strokeWidth="12" strokeDasharray="251" strokeDashoffset="100" />
                                                </svg>
                                            </div>
                                        </div>

                                        <div className="col-span-2 p-3 border border-slate-100 rounded-lg">
                                            <div className="flex items-center gap-2 mb-1">
                                                <DollarSign className="h-4 w-4 text-slate-400" />
                                                <span className="text-xs text-slate-500">Ngân sách dự án</span>
                                            </div>
                                            <div className="font-bold text-lg text-slate-800">{formatCurrency(project.budget || 0)}</div>
                                        </div>

                                        <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ScrollText className="h-3.5 w-3.5 text-purple-500" />
                                                <span className="text-[10px] uppercase text-slate-500 font-semibold">Dự toán</span>
                                            </div>
                                            <div className="font-semibold text-sm">{formatCurrency(project.estimated_cost_total || 0)}</div>
                                        </div>

                                        <div className="p-3 border border-slate-100 rounded-lg bg-slate-50/50">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ReceiptText className="h-3.5 w-3.5 text-teal-500" />
                                                <span className="text-[10px] uppercase text-slate-500 font-semibold">Báo giá</span>
                                            </div>
                                            <div className="font-semibold text-sm">{formatCurrency(project.quoted_amount_total || 0)}</div>
                                        </div>

                                        <div className="p-3 border border-slate-100 rounded-lg bg-emerald-50/50 border-emerald-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
                                                <span className="text-[10px] uppercase text-emerald-700 font-semibold">Thực thu</span>
                                            </div>
                                            <div className="font-bold text-sm text-emerald-700">{formatCurrency(project.total_income || 0)}</div>
                                        </div>

                                        <div className="p-3 border border-slate-100 rounded-lg bg-red-50/50 border-red-100">
                                            <div className="flex items-center gap-2 mb-1">
                                                <ArrowDownRight className="h-3.5 w-3.5 text-red-600" />
                                                <span className="text-[10px] uppercase text-red-700 font-semibold">Thực chi</span>
                                            </div>
                                            <div className="font-bold text-sm text-red-700">{formatCurrency(project.total_expenses || 0)}</div>
                                        </div>
                                    </div>

                                    {/* ✅ PHẦN HIỂN THỊ HỢP ĐỒNG (MỚI THÊM) */}
                                    <div className="mt-4 pt-4 border-t border-slate-100">
                                        <div className="flex items-center gap-2 mt-2 text-sm text-slate-600">
                                            <Banknote className="w-4 h-4 text-green-600" />
                                            <span>Hợp đồng:</span>
                                            <span className="font-bold text-green-700">
                                                {formatCurrency(project.total_contract_value || 0)}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                )
            })}
        </div>
    )
}