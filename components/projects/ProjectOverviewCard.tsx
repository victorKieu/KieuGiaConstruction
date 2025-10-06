import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils/utils";

interface ProjectOverviewCardProps {
    project: {
        name: string;
        code: string;
        address: string | null;
        start_date: string;
        end_date: string;
        budget: number | null;
        project_type: string | null;
        construction_type: string | null;
        manager?: { name: string } | null;
        customers?: { name: string } | null;
        description: string | null;
        status: string | null;
    };
}

export default function ProjectOverviewCard({ project }: ProjectOverviewCardProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Thông tin tổng quan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
                <div className="space-y-2">
                    <p><strong>Tên dự án:</strong> {project.name}</p>
                    <p><strong>Mã dự án:</strong> {project.code}</p>
                    <p><strong>Thời gian:</strong> {formatDate(project.start_date)} → {formatDate(project.end_date)}</p>
                    <p><strong>Ngân sách:</strong> {formatCurrency(project.budget)}</p>
                    <p><strong>Trạng thái:</strong> <Badge variant="outline">{getStatusLabel(project.status)}</Badge></p>
                </div>
                <div className="space-y-2">
                    <p><strong>Địa điểm:</strong> {project.address || "Chưa có thông tin"}</p>
                    <p><strong>Loại công trình:</strong> {getProjectTypeLabel(project.project_type)}</p>
                    <p><strong>Hình thức xây dựng:</strong> {getConstructionTypeLabel(project.construction_type)}</p>
                    <p><strong>Quản lý dự án:</strong> {project.manager?.name || "Chưa phân công"}</p>
                    <p><strong>Chủ đầu tư:</strong> {project.customers?.name || "Chưa có thông tin"}</p>
                </div>
                <div className="md:col-span-2 pt-2">
                    <p><strong>Mô tả:</strong> {project.description || "Không có mô tả"}</p>
                </div>
            </CardContent>
        </Card>
    );
}

// Các hàm chuyển mã sang nhãn tiếng Việt
function getStatusLabel(status: string | null) {
    switch (status) {
        case "planning": return "Kế hoạch";
        case "in_progress": return "Đang thực hiện";
        case "paused": return "Tạm dừng";
        case "completed": return "Hoàn thành";
        default: return "Không xác định";
    }
}

function getProjectTypeLabel(type: string | null) {
    switch (type) {
        case "building": return "Công trình dân dụng";
        case "industrial": return "Công trình công nghiệp";
        case "infrastructure": return "Hạ tầng kỹ thuật";
        case "transport": return "Giao thông";
        case "urban": return "Đô thị";
        case "agriculture": return "Nông nghiệp/Nông thôn";
        case "other": return "Khác";
        default: return "Không xác định";
    }
}

function getConstructionTypeLabel(type: string | null) {
    switch (type) {
        case "new": return "Xây mới";
        case "repair": return "Sửa chữa";
        case "renovation": return "Cải tiến";
        case "expansion": return "Mở rộng";
        default: return "Không xác định";
    }
}