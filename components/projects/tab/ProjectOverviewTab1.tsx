import { formatDate, formatCurrency } from "@/lib/utils/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ProgressBar from "@/components/ui/ProgressBar";
import {
    CircleCheck, CalendarDays, AlertCircle, Home, DollarSign, Users, FileText, MapPin, User, Tag,
    Clock, Phone, Mail, MessageCircle
} from 'lucide-react';
import { ProjectData, MilestoneData } from "@/types/project";
import React from 'react';
import { Button } from "@/components/ui/button";
import Link from "next/link";

// === HELPER FUNCTIONS (LOCAL) ===
function getStatusLabel(status: string | null) {
    switch (status) {
        case "in_progress": return "Đang tiến hành";
        case "completed": return "Hoàn thành";
        case "on_hold": return "Tạm dừng";
        case "planning": return "Kế hoạch";
        default: return "Khởi tạo";
    }
}
function getBadgeClass(status: string | null) {
    switch (status) {
        case "completed": return "bg-green-100 text-green-700 border-green-300 hover:bg-green-200";
        case "in_progress": return "bg-blue-100 text-blue-700 border-blue-300 hover:bg-blue-200";
        case "on_hold": return "bg-yellow-100 text-yellow-700 border-yellow-300 hover:bg-yellow-200";
        default: return "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200";
    }
}
function getProjectTypeLabel(type: string | null) {
    switch (type) {
        case "residential": return "Dân dụng";
        case "commercial": return "Thương mại";
        case "infrastructure": return "Hạ tầng";
        case "industrial": return "Công nghiệp";
        case "building": return "Tòa nhà";
        default: return "Khác";
    }
}
function getConstructionTypeLabel(type: string | null | undefined) {
    switch (type) {
        case "new": return "Xây mới";
        case "repair": return "Sửa chữa";
        case "renovation": return "Cải tạo";
        case "expansion": return "Mở rộng";
        case "shophouse": return "Nhà phố TM";
        default: return "Không xác định";
    }
}

interface Props {
    project: ProjectData;
    milestones: MilestoneData[];
}

const InfoRow = ({ label, value, children, Icon }: { label: string; value?: string | number; children?: React.ReactNode; Icon: React.ElementType }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100/70 last:border-b-0">
        <span className="text-gray-500 flex items-center gap-2">
            <Icon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            {label}
        </span>
        <span className="font-semibold text-gray-800 text-right text-sm">{children || value}</span>
    </div>
);

const StatBox = ({ title, value, icon: Icon, colorClass, subtext }: { title: string; value: string | number; icon: React.ElementType; colorClass: string; subtext?: string }) => (
    <div className={`p-4 bg-white rounded-xl shadow-md border-t-4 ${colorClass} transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl`}>
        <div className="flex items-start justify-between">
            <div className="flex flex-col">
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="font-extrabold text-xl mt-1 text-gray-900 leading-tight">{value}</p>
                {subtext && <p className="text-xs text-gray-400 mt-1">{subtext}</p>}
            </div>
            <div className={`p-2 rounded-full bg-opacity-20 ${colorClass.replace('border', 'bg').replace('4', '1')}`}>
                <Icon className={`h-6 w-6 ${colorClass.replace('border', 'text')}`} />
            </div>
        </div>
    </div>
);

export default function ProjectOverviewTab({ project, milestones }: Props) {
    // 1. Tính toán KPI & Tiến độ
    const plannedProgress = 30; // Mockup
    const actualProgress = project.progress_percent || 0;
    const kpiProgress = actualProgress - plannedProgress;
    const kpiDeadline = -34; // Mockup

    const kpiProgressStatus = kpiProgress >= 0 ? "Vượt/Đúng tiến độ" : "Chậm tiến độ";
    const kpiProgressColor = kpiProgress >= 0 ? "text-green-600" : "text-red-600";
    const kpiDeadlineColor = kpiDeadline < 0 ? "text-green-600" : "text-red-600";

    const gmapsQuery = project.geocode || (project.address ? encodeURIComponent(project.address) : null);
    const googleMapsUrl = gmapsQuery ? `http://maps.google.com/?q=${gmapsQuery}` : null;

    const membersCount = project.member_count || 0;
    const documentsCount = project.document_count || 0;

    // 2. Tính ngày còn lại
    const today = new Date();
    const endDate = project.end_date ? new Date(project.end_date) : null;
    const daysRemaining = endDate ? Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : 0;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* ====== 1. THÔNG TIN CHUNG & LIÊN HỆ ====== */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Cột trái: Thông tin chính */}
                <Card className="lg:col-span-2 shadow-md rounded-xl border border-gray-100">
                    <CardHeader className="bg-slate-50/50 border-b p-4 flex flex-row justify-between items-center">
                        <CardTitle className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <Home className="w-5 h-5 text-blue-600" />
                            Thông tin chung
                        </CardTitle>
                        <Badge className={getBadgeClass(project.status)}>{getStatusLabel(project.status)}</Badge>
                    </CardHeader>
                    <CardContent className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4 text-sm">
                            <div className="space-y-2">
                                <InfoRow label="Khách hàng" Icon={User}>
                                    <div className="flex flex-col items-end">
                                        <span>{project.customer?.name || "Chưa có thông tin"}</span>
                                        {/* Nút liên hệ nhanh */}
                                        {project.customer?.phone && (
                                            <div className="flex gap-2 mt-1">
                                                <a href={`tel:${project.customer.phone}`} title="Gọi điện" className="text-green-600 hover:text-green-800"><Phone className="w-3 h-3" /></a>
                                                <a href={`mailto:${project.customer.email}`} title="Gửi mail" className="text-blue-600 hover:text-blue-800"><Mail className="w-3 h-3" /></a>
                                            </div>
                                        )}
                                    </div>
                                </InfoRow>
                                <InfoRow label="Quản lý dự án" value={project.manager?.name || "Chưa phân công"} Icon={User} />
                                <InfoRow label="Loại hình" value={`${getProjectTypeLabel(project.project_type)} - ${getConstructionTypeLabel(project.construction_type)}`} Icon={Tag} />
                            </div>
                            <div className="space-y-2">
                                <InfoRow label="Địa chỉ" Icon={MapPin}>
                                    {googleMapsUrl ? (
                                        <a href={googleMapsUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-right block truncate max-w-[200px]">
                                            {project.address || "Xem bản đồ"}
                                        </a>
                                    ) : "Chưa có địa chỉ"}
                                </InfoRow>
                                <InfoRow label="Thời gian" Icon={CalendarDays}>
                                    <div className="text-right">
                                        <div>{formatDate(project.start_date)} - {formatDate(project.end_date)}</div>
                                        <div className={`text-xs ${daysRemaining > 0 ? 'text-blue-600' : 'text-red-500'} font-semibold`}>
                                            {daysRemaining > 0 ? `Còn ${daysRemaining} ngày` : `Đã quá hạn ${Math.abs(daysRemaining)} ngày`}
                                        </div>
                                    </div>
                                </InfoRow>
                            </div>
                        </div>
                        <div className="mt-6 pt-4 border-t border-gray-100">
                            <h4 className="font-bold text-gray-700 mb-2 text-sm flex items-center gap-2">
                                <FileText className="h-4 w-4 text-slate-400" />
                                Mô tả / Ghi chú
                            </h4>
                            <p className="text-sm text-gray-600 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                                {project.description || "Không có mô tả chi tiết."}
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Cột phải: KPI nhanh */}
                <div className="space-y-6">
                    <Card className="shadow-md rounded-xl border border-gray-100 h-full">
                        <CardHeader className="bg-slate-50/50 border-b p-4">
                            <CardTitle className="text-lg font-bold text-slate-800">Sức khỏe dự án</CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 space-y-6">
                            {/* KPI Tiến độ */}
                            <div>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="text-gray-600">Tiến độ thực tế</span>
                                    <span className={`font-bold ${kpiProgressColor}`}>{actualProgress}%</span>
                                </div>
                                <ProgressBar value={actualProgress} colorClass={kpiProgress >= 0 ? "bg-green-500" : "bg-red-500"} />
                                <div className="mt-2 text-xs text-right">
                                    So với kế hoạch ({plannedProgress}%): <span className={`font-bold ${kpiProgressColor}`}>{kpiProgress > 0 ? `+${kpiProgress}%` : `${kpiProgress}%`}</span>
                                </div>
                            </div>

                            <hr className="border-gray-100" />

                            {/* KPI Ngân sách (Giản lược) */}
                            <div>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                    <span className="text-gray-600">Giải ngân</span>
                                    <span className="font-bold text-slate-700">65%</span>
                                </div>
                                <ProgressBar value={65} colorClass="bg-blue-500" />
                                <div className="mt-2 text-xs text-right">
                                    Còn lại: <span className="font-bold text-blue-600">{formatCurrency((project.budget || 0) * 0.35)}</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ====== 2. SỐ LIỆU TỔNG QUAN (STATS ROW) ====== */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatBox
                    title="Tổng Ngân sách"
                    value={formatCurrency(project.budget)}
                    icon={DollarSign}
                    colorClass="border-blue-500"
                    subtext="Theo hợp đồng gốc"
                />
                <StatBox
                    title="Thực chi"
                    value={formatCurrency(project.actual_cost || 0)}
                    icon={DollarSign}
                    colorClass="border-red-500" // Chi là màu đỏ cảnh báo
                    subtext="Vật tư & Nhân công"
                />
                <StatBox
                    title="Nhân sự"
                    value={membersCount}
                    icon={Users}
                    colorClass="border-indigo-500"
                    subtext="Thành viên tham gia"
                />
                <StatBox
                    title="Tài liệu"
                    value={documentsCount}
                    icon={FileText}
                    colorClass="border-purple-500"
                    subtext="Hồ sơ lưu trữ"
                />
            </div>

            {/* ====== 3. MỐC QUAN TRỌNG (Gọn hơn) ====== */}
            <Card className="shadow-md rounded-xl border border-gray-100">
                <CardHeader className="p-4 border-b flex flex-row justify-between items-center">
                    <CardTitle className="text-lg font-bold text-slate-800">Các mốc quan trọng sắp tới</CardTitle>
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/projects/${project.id}?tab=tasks`}>Xem chi tiết tiến độ</Link>
                    </Button>
                </CardHeader>
                <CardContent className="p-6">
                    {milestones?.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 italic">Chưa có mốc quan trọng nào.</div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {milestones.slice(0, 3).map((milestone, index) => (
                                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-blue-200 transition-colors">
                                    <div className="p-2 bg-white rounded-full shadow-sm text-blue-600 mt-1">
                                        <Clock className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-800 text-sm line-clamp-1" title={milestone.milestone}>
                                            {milestone.milestone}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1 flex gap-2">
                                            <span>KH: {formatDate(milestone.planned_end_date)}</span>
                                            {milestone.status === 'completed' && <span className="text-green-600 font-bold">✓ Đã xong</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}