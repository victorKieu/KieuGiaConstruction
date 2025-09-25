import { formatDate, formatCurrency } from "@/lib/utils/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    getStatusLabel,
    getProjectTypeLabel,
    getConstructionTypeLabel,
} from "@/lib/utils/label";
import { ProjectData, MilestoneData } from "@/types/project";

interface Props {
    project: ProjectData;
    milestones: MilestoneData[];
}

export default function ProjectOverviewTab({ project, milestones }: Props) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Thông tin tổng quan</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                    <p><strong>Tên dự án:</strong> {project.name}</p>
                    <p><strong>Mã dự án:</strong> {project.code}</p>
                    <p><strong>Thời gian:</strong> {formatDate(project.start_date)} → {formatDate(project.end_date)}</p>
                    <p><strong>Ngân sách:</strong> {formatCurrency(project.budget)}</p>
                    <p><strong>Trạng thái:</strong> <Badge variant="outline">{getStatusLabel(project.status)}</Badge></p>
                </div>
                <div>
                    <p><strong>Địa điểm:</strong> {project.address || "Chưa có thông tin"}</p>
                    <p><strong>Loại công trình:</strong> {getProjectTypeLabel(project.project_type)}</p>
                    <p><strong>Hình thức xây dựng:</strong> {getConstructionTypeLabel(project.construction_type)}</p>
                    <p><strong>Quản lý dự án:</strong> {project.manager?.name || "Chưa phân công"}</p>
                    <p><strong>Chủ đầu tư:</strong> {project.customers?.name || "Chưa có thông tin"}</p>
                </div>
                <div className="md:col-span-2">
                    <p><strong>Mô tả:</strong> {project.description || "Không có mô tả"}</p>
                </div>
            </CardContent>
        </Card>
    );
}