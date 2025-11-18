import { formatDate, formatCurrency } from "@/lib/utils/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ProgressBar from "@/components/ui/ProgressBar";
import {
    CircleCheck, CalendarDays, AlertCircle, Home, DollarSign, Users, FileText, MapPin, User, Tag
} from 'lucide-react';
import { ProjectData, MilestoneData } from "@/types/project";
import React from 'react';

// === HELPER FUNCTIONS (LOCAL FOR RUNNABILITY) ===
// Giả định các hàm này được định nghĩa ở lib/utils/label.ts
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
    // (Lấy từ Enum project_type của File 271)
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
    // (Lấy từ Enum construction_type của File 271)
    switch (type) {
        case "new": return "Xây mới";
        case "repair": return "Sửa chữa";
        case "renovation": "Cải tạo";
        case "expansion": return "Mở rộng";
        case "shophouse": return "Nhà phố TM";
        default: return "Không xác định";
    }
}

// ✅ CẬP NHẬT: Loại bỏ membersCount và documentsCount khỏi Props
interface Props {
    project: ProjectData;
    milestones: MilestoneData[];
}

// Component nhỏ cho từng dòng thông tin
const InfoRow = ({ label, value, children, Icon }: { label: string; value?: string | number; children?: React.ReactNode; Icon: React.ElementType }) => (
    <div className="flex items-center justify-between py-2 border-b border-gray-100/70 last:border-b-0">
        <span className="text-gray-500 flex items-center gap-2">
            <Icon className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            {label}
        </span>
        <span className="font-semibold text-gray-800 text-right text-sm">{children || value}</span>
    </div>
);

// Component cho khối thông tin nhanh
const StatBox = ({ title, value, icon: Icon, colorClass }: { title: string; value: string | number; icon: React.ElementType; colorClass: string }) => (
    <div className={`p-4 bg-white rounded-xl shadow-md border-t-4 ${colorClass} transition-transform duration-300 hover:scale-[1.02] hover:shadow-xl`}>
        <div className="flex items-start justify-between">
            <div className="flex flex-col">
                <p className="text-sm text-gray-500 font-medium">{title}</p>
                <p className="font-extrabold text-xl mt-1 text-gray-900 leading-tight">{value}</p>
            </div>
            <div className={`p-2 rounded-full bg-opacity-20 ${colorClass.replace('border', 'bg').replace('4', '1').replace('-', '-')}`}>
                <Icon className={`h-6 w-6 ${colorClass.replace('border', 'text')}`} />
            </div>
        </div>
    </div>
);


// ✅ CẬP NHẬT: Loại bỏ membersCount và documentsCount khỏi tham số
export default function ProjectOverviewTab({ project, milestones }: Props) {
    // Dữ liệu giả định cho phần tiến độ, bạn sẽ thay bằng dữ liệu thật
    const plannedProgress = 30; // %
    const actualProgress = project.progress_percent || 0; // %
    const kpiProgress = -5; // % (âm = vượt kế hoạch, dương = chậm)
    const kpiDeadline = -34; // % (âm = tiết kiệm chi phí, dương = vượt ngân sách)

    const kpiProgressStatus = kpiProgress > 0 ? "Chậm" : "Vượt tiến độ";
    const kpiProgressColor = kpiProgress > 0 ? "text-red-600" : "text-green-600";
    const kpiDeadlineStatus = kpiDeadline < 0 ? "Tiết kiệm chi phí" : "Vượt ngân sách";
    const kpiDeadlineColor = kpiDeadline < 0 ? "text-green-600" : "text-red-600";

    const gmapsQuery = project.geocode || (project.address ? encodeURIComponent(project.address) : null);
    const googleMapsUrl = gmapsQuery ? `https://www.google.com/maps?q=${gmapsQuery}` : null;
   
    // ✅ LẤY DỮ LIỆU TỪ PROJECT OBJECT
    const membersCount = project.member_count;
    const documentsCount = project.document_count;


    return (
        <div className="space-y-6">
            {/* ====== 1. KHỐI THÔNG TIN DỰ ÁN ====== */}
            <Card className="shadow-xl rounded-2xl border-2 border-gray-100/70">
                <CardHeader className="bg-indigo-50/50 border-b rounded-t-2xl p-4">
                    <CardTitle className="text-2xl font-extrabold text-indigo-800">Thông tin dự án</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-4 text-sm">
                        {/* Cột 1 - 1/4 */}
                        <div className="space-y-2 lg:col-span-1">
                            <InfoRow label="Khách hàng" value={project.customers?.name || "Chưa có thông tin"} Icon={User} />
                            <InfoRow label="Quản lý dự án" value={project.manager?.name || "Chưa phân công"} Icon={User} />
                            <InfoRow label="Loại công trình" value={getConstructionTypeLabel(project.construction_type)} Icon={Home} />
                        </div>
                        {/* ✅ CHỈNH SỬA: Cột 2 - Rộng hơn (2/4) */}
                        <div className="space-y-2 lg:col-span-2">
                            <InfoRow label="Địa chỉ" Icon={MapPin}>
                                {/* Nếu có link (googleMapsUrl), hiển thị thẻ <a>.
                                    Nếu không, hiển thị "Chưa có thông tin".
                                */}
                                {googleMapsUrl ? (
                                    <a
                                        href={googleMapsUrl}
                                        target="_blank" // Mở tab mới
                                        rel="noopener noreferrer" // Bảo mật cho link ngoài
                                        title="Nhấp để mở Google Maps"
                                        className="font-semibold text-blue-600 hover:underline text-sm text-right"
                                    >
                                        {/* Hiển thị địa chỉ (nếu có) hoặc geocode */}
                                        {project.address || project.geocode}
                                    </a>
                                ) : (
                                    <span className="font-semibold text-gray-800 text-sm text-right">Chưa có thông tin</span>
                                )}
                            </InfoRow>
                            <InfoRow label="Loại dự án" value={getProjectTypeLabel(project.project_type || 'N/A')} Icon={Tag} />
                            <InfoRow label="Ngày bắt đầu" value={formatDate(project.start_date)} Icon={CalendarDays} />
                        </div>
                        {/* ✅ CHỈNH SỬA: Cột 3 - Hẹp nhất (1/4) */}
                        <div className="space-y-2 md:col-span-2 lg:col-span-1 border-t md:border-t-0 pt-4 md:pt-0">
                            <InfoRow label="Tình trạng" Icon={AlertCircle} >
                                <Badge className={getBadgeClass(project.status)}>{getStatusLabel(project.status)}</Badge>
                            </InfoRow>
                        </div>
                    </div>
                    {/* Mô tả - Full width */}
                    <div className="pt-6 mt-4 border-t border-gray-100">
                        <h4 className="font-bold text-gray-700 mb-2 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-indigo-500" />
                            Mô tả dự án
                        </h4>
                        <p className="text-gray-600 leading-relaxed">{project.description || "Không có mô tả chi tiết."}</p>
                    </div>
                </CardContent>
            </Card>

            {/* ====== 2. KHỐI THÔNG TIN NHANH (STATS) ====== */}
            <Card className="shadow-xl rounded-2xl border-2 border-gray-100/70">
                <CardHeader className="p-4 border-b">
                    <CardTitle className="text-xl font-bold text-gray-800">Tổng quan số liệu</CardTitle>
                </CardHeader>
                <CardContent className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    <StatBox
                        title="Ngân sách"
                        value={formatCurrency(project.budget)} // Thay đổi để hiển thị Budget
                        icon={DollarSign}
                        colorClass="border-blue-500"
                    />
                    <StatBox
                        title="Chi phí thực tế"
                        value={formatCurrency(project.actual_cost || 0)}
                        icon={DollarSign}
                        colorClass="border-green-500"
                    />
                    {/* ✅ SỬ DỤNG DỮ LIỆU TỪ PROJECT */}
                    <StatBox
                        title="Nhân sự tham gia"
                        value={`${membersCount} người`}
                        icon={Users}
                        colorClass="border-indigo-500"
                    />
                    {/* ✅ SỬ DỤNG DỮ LIỆU TỪ PROJECT */}
                    <StatBox
                        title="Tài liệu"
                        value={`${documentsCount} tài liệu`}
                        icon={FileText}
                        colorClass="border-purple-500"
                    />
                </CardContent>
            </Card>

            {/* ====== 3. KHỐI TIẾN ĐỘ & KPI ====== */}
            <Card className="shadow-xl rounded-2xl border-2 border-gray-100/70">
                <CardHeader className="p-4 border-b">
                    <CardTitle className="text-xl font-bold text-gray-800">Phân tích Tiến độ & KPI</CardTitle>
                </CardHeader>
                <CardContent className="p-6 space-y-6">

                    {/* Thanh tiến độ */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="font-medium text-gray-600">Tiến độ kế hoạch</span>
                                <span className="font-extrabold text-blue-600">{plannedProgress}%</span>
                            </div>
                            <ProgressBar value={plannedProgress} colorClass="bg-blue-500" />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1 text-sm">
                                <span className="font-medium text-gray-600">Tiến độ thực tế</span>
                                <span className="font-extrabold text-indigo-600">{actualProgress}%</span>
                            </div>
                            <ProgressBar value={actualProgress} colorClass="bg-indigo-500" />
                        </div>
                    </div>

                    {/* KPI Summary */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-dashed border-gray-200">
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-700">KPI Tiến độ</span>
                                <span className={`${kpiProgressColor} font-bold`}>
                                    {kpiProgress > 0 ? `+${kpiProgress}%` : `${kpiProgress}%`} ({kpiProgressStatus})
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                So sánh với tiến độ kế hoạch.
                            </p>
                        </div>
                        <div className="p-4 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-bold text-gray-700">KPI Chi phí</span>
                                <span className={`${kpiDeadlineColor} font-bold`}>
                                    {kpiDeadline < 0 ? `${kpiDeadline}%` : `+${kpiDeadline}%`} ({kpiDeadlineStatus})
                                </span>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                So sánh với ngân sách được duyệt.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ====== 4. KHỐI CÁC MỐC QUAN TRỌNG (TIMELINE) ====== */}
            <Card className="shadow-xl rounded-2xl border-2 border-gray-100/70">
                <CardHeader className="p-4 border-b">
                    <CardTitle className="text-xl font-bold text-gray-800">Dòng thời gian & Các mốc quan trọng</CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                    {milestones?.length === 0 ? (
                        <p className="text-sm text-gray-500">Chưa có mốc quan trọng nào được thiết lập.</p>
                    ) : (
                        <div className="relative pl-6">
                            {/* Đường kẻ timeline */}
                            <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-indigo-200/50"></div>

                            {milestones.map((milestone, index) => {
                                const isCompleted = milestone.status === 'completed';
                                // Giả định có status 'overdue' từ backend hoặc tính toán
                                const isOverdue = milestone.status === 'overdue' && !isCompleted;
                                const iconClass = isCompleted
                                    ? "text-white bg-green-500"
                                    : (isOverdue ? "text-white bg-red-500" : "text-white bg-indigo-500");
                                const icon = isCompleted ? CircleCheck : (isOverdue ? AlertCircle : CalendarDays);

                                return (
                                    <div key={milestone.id || index} className="mb-6 relative">
                                        <div className="absolute -left-3.5 top-0.5 z-10 p-1 rounded-full border-4 border-white">
                                            {React.createElement(icon, { className: `h-4 w-4 ${iconClass}` })}
                                        </div>
                                        <p className="font-extrabold text-gray-900 text-base ml-4">
                                            {milestone.description}
                                        </p>
                                        <p className="text-xs text-gray-500 ml-4 mb-1">
                                            Hoàn thành: <span className="font-semibold text-indigo-700">{formatDate(milestone.actual_end_date)}</span>
                                        </p>
                                        <p className="text-sm text-gray-600 ml-4 leading-relaxed">{milestone.description}</p>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
