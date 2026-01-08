"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, MoreVertical, Edit, Trash2, Loader2, Settings
} from "lucide-react";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader,
    AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { deleteProject } from "@/lib/action/projectActions";
import { ProjectData } from "@/types/project";

// Component con: Xử lý logic xóa dự án (Copy từ ProjectList để tái sử dụng)
function DeleteActionItem({ project }: { project: any }) {
    const router = useRouter();
    const [isDeleting, startDeleteTransition] = useTransition();
    const [isAlertOpen, setIsAlertOpen] = useState(false);

    const handleDeleteConfirm = async () => {
        startDeleteTransition(async () => {
            const result = await deleteProject(project.id);
            if (result.success) {
                alert(result.message || "Xóa dự án thành công!");
                setIsAlertOpen(false);
                router.push("/projects"); // Xóa xong về trang danh sách
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
                        Hành động này sẽ xóa vĩnh viễn dự án và tất cả dữ liệu liên quan.
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

interface ProjectHeaderWrapperProps {
    project: any; // Sử dụng any hoặc ProjectDataWithExtras để linh hoạt
    permissions: {
        canEdit: boolean;
        canDelete: boolean;
        canAddMember: boolean;
        canDeleteTask: boolean;
    };
}

export default function ProjectHeaderWrapper({ project, permissions }: ProjectHeaderWrapperProps) {
    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                {/* ✅ FIX: Luôn quay về trang danh sách /projects */}
                <Link href="/projects">
                    <Button variant="outline" size="icon" className="h-9 w-9 bg-white hover:bg-slate-100 border-slate-200">
                        <ArrowLeft className="h-4 w-4 text-slate-600" />
                    </Button>
                </Link>

                <div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-xl font-bold text-slate-800 line-clamp-1">{project.name}</h1>
                        <Badge variant="outline" className="font-mono text-xs bg-slate-50 text-slate-600 border-slate-200 hidden sm:inline-flex">
                            {project.code}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Actions Buttons */}
            <div className="flex items-center gap-2">
                {/* Nút Edit (Desktop) */}
                {permissions.canEdit && (
                    <Link href={`/projects/${project.id}/edit`}>
                        <Button variant="outline" size="sm" className="hidden sm:flex bg-white hover:bg-slate-50">
                            <Edit className="w-4 h-4 mr-2 text-slate-500" />
                            Chỉnh sửa
                        </Button>
                    </Link>
                )}

                {/* Dropdown Menu (Mobile + Extra Actions) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreVertical className="w-4 h-4 text-slate-500" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {permissions.canEdit && (
                            <DropdownMenuItem asChild>
                                <Link href={`/projects/${project.id}/edit`}>
                                    <Edit className="w-4 h-4 mr-2" />
                                    Chỉnh sửa thông tin
                                </Link>
                            </DropdownMenuItem>
                        )}

                        {/* Các menu mở rộng khác nếu cần */}
                        <DropdownMenuItem disabled>
                            <Settings className="w-4 h-4 mr-2" />
                            Cấu hình dự án (Coming soon)
                        </DropdownMenuItem>

                        {permissions.canDelete && (
                            <>
                                <DropdownMenuSeparator />
                                <DeleteActionItem project={project} />
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
    );
}