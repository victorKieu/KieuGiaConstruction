"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    MoreVertical,
    Calendar,
    Briefcase,
    DollarSign,
    ArrowUpRight,
    ArrowDownRight,
    AlertTriangle,
    Eye,
    Edit,
    Trash2,
    ListMinus,
    ScrollText,
    ReceiptText,
    Plus
} from "lucide-react"
import { formatCurrency } from "@/lib/utils/utils"
import Link from "next/link"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

// Import Project type (Đã được cập nhật ở bước trước)
import type { ProjectData as Project } from "@/types/project" // Sử dụng alias Project cho gọn

interface ProjectListProps {
    projects: Project[]
}

export default function ProjectList({ projects }: ProjectListProps) {
    const [openNewDialog, setOpenNewDialog] = useState(false)

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "N/A"
        try {
            // Sử dụng toLocaleDateString như code gốc
            return new Date(dateString).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
        } catch (e) {
            console.error("Invalid date string:", dateString, e);
            return "Ngày không hợp lệ";
        }
    }

    const getStatusBadge = (status: string | null) => {
        // (Giữ nguyên logic getStatusBadge gốc)
        switch (status) {
            case "planning": return <Badge className="bg-blue-500">Kế hoạch</Badge>;
            case "in_progress": return <Badge className="bg-green-500">Đang làm</Badge>;
            case "paused": return <Badge className="bg-yellow-500">Tạm dừng</Badge>;
            case "completed": return <Badge className="bg-purple-500">Hoàn thành</Badge>;
            case "cancelled": return <Badge className="bg-red-500">Đã hủy</Badge>;
            default: return <Badge className="bg-gray-500">Không rõ</Badge>;
        }
    }

    const getRiskBadge = (risk: string | null) => {
        // (Giữ nguyên logic getRiskBadge gốc)
        switch (risk) {
            case "normal": return <Badge className="bg-green-500">Bình thường</Badge>;
            case "accelerated": return <Badge className="bg-blue-500">Tăng tốc</Badge>;
            case "delayed": return <Badge className="bg-yellow-500">Trì hoãn</Badge>;
            case "at_risk": return <Badge className="bg-red-500">Rủi ro</Badge>;
            case "behind": return <Badge className="bg-purple-500">Chậm tiến độ</Badge>;
            default: return <Badge className="bg-gray-500">Không rõ</Badge>;
        }
    }

    // (Handler 'handleOpenNewProject' giữ nguyên)

    return (
        <div className="space-y-6">
            {/* Nút thêm mới dự án (Giữ nguyên) */}
            <div className="flex justify-end mb-4">
                <Link href="/projects/new">
                    <Button>
                        <Plus className="w-4 h-4 mr-2" />
                        Thêm dự án
                    </Button>
                </Link>
            </div>

            {projects.map((project) => {
                // (Logic tính toán progress giữ nguyên)
                const planProgress = project.progress || 0
                const actualProgress = (project.progress || 0) * 0.8 // Giữ nguyên logic tính toán của bạn
                // (Các logic KPI giữ nguyên)
                const kpiProgress = Math.min(100, Math.max(0, planProgress))
                const kpiDeviation = Math.min(100, Math.max(0, Math.abs(planProgress - actualProgress)))
                const kpiActualForecast = Math.min(100, Math.max(0, actualProgress * 1.2))
                const kpiPlanForecast = Math.min(100, Math.max(0, planProgress * 1.1))

                return (
                    <Card key={project.id} className="overflow-hidden">
                        <div className="p-4 border-b">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center">
                                        <h3 className="text-lg font-bold">{project.name}</h3>
                                        {project.status && <span className="ml-2">{getStatusBadge(project.status)}</span>}
                                    </div>
                                    {/* --- GIAO DIỆN GỐC ĐÃ ĐƯỢC HOÀN TRẢ --- */}
                                    <div className="text-sm text-gray-500 mt-1">
                                        <span>Mã dự án: {project.code}</span>
                                        <span className="mx-2">•</span>
                                        <span>Ngày tạo: {formatDate(project.created_at)}</span>
                                        <span className="mx-2">•</span>
                                        {/* --- FIX LOGIC: Hiển thị đúng Người quản lý --- */}
                                        <span>Người tạo: {project.employees?.name || 'Chưa gán'}</span>
                                        {/* --- FIX LOGIC: Thêm hiển thị Khách hàng --- */}
                                        {project.customers?.name && (
                                            <>
                                                <span className="mx-2">•</span>
                                                <span>Khách hàng: {project.customers.name}</span>
                                            </>
                                        )}
                                    </div>
                                    {/* --- KẾT THÚC HOÀN TRẢ GIAO DIỆN GỐC --- */}
                                </div>
                                {/* (DropdownMenu giữ nguyên cấu trúc gốc) */}
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon">
                                            <MoreVertical className="h-5 w-5" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        {/* (Tất cả DropdownMenuItem giữ nguyên cấu trúc gốc) */}
                                        <DropdownMenuItem asChild><Link href={`/projects/${project.id}`}><Eye className="h-4 w-4 mr-2" />Xem chi tiết</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href={`/projects/${project.id}/edit`}><Edit className="h-4 w-4 mr-2" />Chỉnh sửa</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href={`/projects/${project.id}/survey`}><ListMinus className="h-4 w-4 mr-2" />Khảo sát công trình</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href={`/projects/${project.id}/qto`}><ListMinus className="h-4 w-4 mr-2" />Bóc tách khối lượng</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href={`/projects/${project.id}/estimation`}><ScrollText className="h-4 w-4 mr-2" />Dự toán</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href={`/projects/${project.id}/quotation`}><ReceiptText className="h-4 w-4 mr-2" />Báo giá</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild><Link href={`/projects/${project.id}/logs`}><ReceiptText className="h-4 w-4 mr-2" />Nhật ký công trình</Link></DropdownMenuItem>
                                        <DropdownMenuItem asChild className="text-red-600"><Link href={`/projects/${project.id}`} /* Thêm onClick handler để kích hoạt xóa */><Trash2 className="h-4 w-4 mr-2" />Xóa dự án</Link></DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>

                        {/* (Toàn bộ phần body của Card (grid, progress bars...) giữ nguyên cấu trúc gốc) */}
                        <div className="p-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="col-span-2">
                                    {/* (Grid Ngày bắt đầu/kết thúc/rủi ro giữ nguyên cấu trúc gốc) */}
                                    <div className="grid grid-cols-3 gap-4 mb-4">
                                        <div className="flex items-center"><Calendar className="h-5 w-5 text-gray-500 mr-2" /><div><div className="text-xs text-gray-500">Ngày bắt đầu</div><div className="font-medium">{formatDate(project.start_date)}</div></div></div>
                                        <div className="flex items-center"><Calendar className="h-5 w-5 text-gray-500 mr-2" /><div><div className="text-xs text-gray-500">Ngày kết thúc</div><div className="font-medium">{formatDate(project.end_date)}</div></div></div>
                                        <div className="flex items-center"><AlertTriangle className="h-5 w-5 text-gray-500 mr-2" /><div><div className="text-xs text-gray-500">Tình trạng rủi ro</div><div className="font-medium">{getRiskBadge(project.risk_level)}</div></div></div>
                                    </div>
                                    {/* (Các thanh progress bar giữ nguyên cấu trúc gốc) */}
                                    <div className="space-y-4">
                                        {/* (Tiến độ kế hoạch) */}
                                        <div><div className="flex justify-between mb-1"><span className="text-sm">Tiến độ kế hoạch</span><span className="text-sm">{planProgress.toFixed(0)}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-blue-500 h-2 rounded-full" style={{ width: `${planProgress}%` }}></div></div></div>
                                        {/* (Tiến độ thực tế) */}
                                        <div><div className="flex justify-between mb-1"><span className="text-sm">Tiến độ thực tế</span><span className="text-sm">{actualProgress.toFixed(0)}%</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{ width: `${actualProgress}%` }}></div></div></div>
                                        {/* (KPI Grid giữ nguyên cấu trúc gốc) */}
                                        <div className="grid grid-cols-2 gap-4">
                                            {/* (KPI tiến độ) */}
                                            <div><div className="flex justify-between mb-1"><span className="text-sm">KPI tiến độ</span><span className="text-sm text-amber-500">+43% Chậm tiến độ</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-amber-500 h-2 rounded-full" style={{ width: `${kpiProgress}%` }}></div></div></div>
                                            {/* (KPI chênh lệch) */}
                                            <div><div className="flex justify-between mb-1"><span className="text-sm">KPI chênh lệch</span><span className="text-sm text-red-500">-34% Giảm quá giới hạn</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-red-500 h-2 rounded-full" style={{ width: `${kpiDeviation}%` }}></div></div></div>
                                            {/* (KPI dự thực tế) */}
                                            <div><div className="flex justify-between mb-1"><span className="text-sm">KPI dự thực tế</span><span className="text-sm text-green-500">+32% Đạt đúng tiến độ</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${kpiActualForecast}%` }}></div></div></div>
                                            {/* (KPI dự kế hoạch) */}
                                            <div><div className="flex justify-between mb-1"><span className="text-sm">KPI dự kế hoạch</span><span className="text-sm text-green-500">+65% Đạt đúng tiến độ</span></div><div className="w-full bg-gray-200 rounded-full h-2"><div className="bg-green-500 h-2 rounded-full" style={{ width: `${kpiPlanForecast}%` }}></div></div></div>
                                        </div>
                                    </div>
                                </div>
                                {/* (Cột bên phải (tài chính, biểu đồ tròn) giữ nguyên cấu trúc gốc) */}
                                <div>
                                    <div className="grid grid-cols-2 gap-4">
                                        {/* (Tổng công việc) */}
                                        <div className="flex items-center"><Briefcase className="h-5 w-5 text-gray-500 mr-2" /><div><div className="text-xs text-gray-500">Tổng công việc</div><div className="font-medium">{project.total_tasks !== null ? project.total_tasks : "N/A"}</div></div></div>
                                        {/* (Ngân sách) */}
                                        <div className="flex items-center"><DollarSign className="h-5 w-5 text-gray-500 mr-2" /><div><div className="text-xs text-gray-500">Ngân sách</div><div className="font-medium">{formatCurrency(project.budget || 0)}</div></div></div>
                                        {/* (Tổng Dự toán) */}
                                        <div className="flex items-center"><ScrollText className="h-5 w-5 text-purple-500 mr-2" /><div><div className="text-xs text-gray-500">Tổng Dự toán</div><div className="font-medium">{formatCurrency(project.estimated_cost_total || 0)}</div></div></div>
                                        {/* (Tổng Báo giá) */}
                                        <div className="flex items-center"><ReceiptText className="h-5 w-5 text-teal-500 mr-2" /><div><div className="text-xs text-gray-500">Tổng Báo giá</div><div className="font-medium">{formatCurrency(project.quoted_amount_total || 0)}</div></div></div>
                                        {/* (Tổng thu thực tế) */}
                                        <div className="flex items-center"><ArrowUpRight className="h-5 w-5 text-green-500 mr-2" /><div><div className="text-xs text-gray-500">Tổng thu thực tế</div><div className="font-medium">{formatCurrency(project.total_income || 0)}</div></div></div>
                                        {/* (Tổng chi thực tế) */}
                                        <div className="flex items-center"><ArrowDownRight className="h-5 w-5 text-red-500 mr-2" /><div><div className="text-xs text-gray-500">Tổng chi thực tế</div><div className="font-medium">{formatCurrency(project.total_expenses || 0)}</div></div></div>
                                        {/* (Giá trị hợp đồng) */}
                                        <div className="flex items-center"><DollarSign className="h-5 w-5 text-blue-500 mr-2" /><div><div className="text-xs text-gray-500">Giá trị hợp đồng</div><div className="font-medium">{formatCurrency(project.contract_value || 0)}</div></div></div>
                                    </div>
                                    {/* (Biểu đồ tròn giữ nguyên cấu trúc gốc) */}
                                    <div className="mt-4 flex items-center justify-center">
                                        <div className="w-24 h-24 relative">
                                            <div className="absolute inset-0 flex items-center justify-center"><div className="text-center"><div className="text-2xl font-bold">{project.total_tasks !== null ? project.total_tasks : "N/A"}</div><div className="text-xs text-gray-500">Công việc</div></div></div>
                                            <svg className="w-full h-full" viewBox="0 0 100 100">
                                                <circle cx="50" cy="50" r="45" fill="none" stroke="#e6e6e6" strokeWidth="10" />
                                                <circle cx="50" cy="50" r="45" fill="none" stroke="#3B82F6" strokeWidth="10" strokeDasharray="283" strokeDashoffset="70" transform="rotate(-90 50 50)" />
                                            </svg>
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