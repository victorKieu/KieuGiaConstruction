"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Calendar,
    MapPin,
    MoreVertical,
    Edit,
    Trash2,
    CheckCircle2,
    Clock,
    AlertTriangle
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ProjectData } from "@/types/project";
import { deleteProject } from "@/lib/action/projectActions";
import { toast } from "sonner"; // Hoặc library toast bạn đang dùng

// ✅ FIX: Định nghĩa Interface nhận thêm permissions
interface ProjectHeaderProps {
    project: ProjectData;
    permissions: {
        canEdit: boolean;
        canDelete: boolean;
        canAddMember: boolean;
    };
}

export default function ProjectHeader({
    project,
    permissions = { canEdit: false, canDelete: false, canAddMember: false } // ✅ FIX: Thêm giá trị mặc định
}: ProjectHeaderProps) {
    const router = useRouter();
    const [isDeleting, setIsDeleting] = useState(false);

    // Hàm xử lý xóa dự án
    const handleDelete = async () => {
        if (!confirm("Bạn có chắc chắn muốn xóa dự án này không? Hành động này không thể hoàn tác.")) return;

        setIsDeleting(true);
        try {
            const result = await deleteProject(project.id);
            if (result.success) {
                toast.success("Đã xóa dự án thành công");
                router.push("/projects");
            } else {
                toast.error(result.error || "Lỗi khi xóa dự án");
            }
        } catch (error) {
            toast.error("Đã xảy ra lỗi không mong muốn");
        } finally {
            setIsDeleting(false);
        }
    };

    // Helper: Màu trạng thái
    const getStatusColor = (status: string) => {
        switch (status) {
            case "active": return "bg-green-100 text-green-800 hover:bg-green-200";
            case "completed": return "bg-blue-100 text-blue-800 hover:bg-blue-200";
            case "delayed": return "bg-red-100 text-red-800 hover:bg-red-200";
            default: return "bg-gray-100 text-gray-800 hover:bg-gray-200";
        }
    };

    // Helper: Icon trạng thái
    const getStatusIcon = (status: string) => {
        switch (status) {
            case "active": return <Clock className="w-3 h-3 mr-1" />;
            case "completed": return <CheckCircle2 className="w-3 h-3 mr-1" />;
            case "delayed": return <AlertTriangle className="w-3 h-3 mr-1" />;
            default: return null;
        }
    };

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            {/* Phần thông tin bên trái */}
            <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                    <h1 className="text-2xl font-bold text-slate-800">{project.name}</h1>
                    <Badge className={`${getStatusColor(project.status)} border-0 px-2 py-1`}>
                        <div className="flex items-center">
                            {getStatusIcon(project.status)}
                            <span className="capitalize">{project.status === 'active' ? 'Đang thực hiện' : project.status}</span>
                        </div>
                    </Badge>
                    <span className="text-sm text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded">
                        {project.code}
                    </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-slate-500">
                    {project.address && (
                        <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-slate-400" />
                            <span>{project.address}</span>
                        </div>
                    )}
                    <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <span>
                            {new Date(project.start_date).toLocaleDateString('vi-VN')}
                            {project.end_date ? ` - ${new Date(project.end_date).toLocaleDateString('vi-VN')}` : ''}
                        </span>
                    </div>
                </div>
            </div>

            {/* Phần nút bấm bên phải */}
            <div className="flex items-center gap-3">
                {/* Các nút chức năng chung (Ai cũng thấy) */}
                <Button variant="outline" size="sm" onClick={() => router.back()}>
                    Quay lại
                </Button>

                {/* ✅ FIX: Chỉ hiện nút Chỉnh sửa nếu có quyền */}
                {permissions.canEdit && (
                    <Button
                        variant="default"
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700"
                        onClick={() => router.push(`/projects/${project.id}/edit`)}
                    >
                        <Edit className="w-4 h-4 mr-2" />
                        Chỉnh sửa
                    </Button>
                )}

                {/* ✅ FIX: Dropdown Menu cho các hành động nguy hiểm */}
                {(permissions.canEdit || permissions.canDelete) && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <MoreVertical className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {permissions.canEdit && (
                                <DropdownMenuItem onClick={() => router.push(`/projects/${project.id}/edit`)}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Chỉnh sửa thông tin
                                </DropdownMenuItem>
                            )}

                            {/* ✅ FIX: Chỉ hiện nút Xóa nếu có quyền */}
                            {permissions.canDelete && (
                                <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                    onClick={handleDelete}
                                    disabled={isDeleting}
                                >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    {isDeleting ? "Đang xóa..." : "Xóa dự án"}
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
        </div>
    );
}