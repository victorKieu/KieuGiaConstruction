"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    ArrowLeft, MoreVertical, Edit, Trash2, Loader2, Settings, RotateCcw, RefreshCcw, XCircle, ArchiveRestore, PlayCircle, PauseCircle
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
import StartConstructionDialog from "@/components/projects/dialogs/StartConstructionDialog";
import { undoConstructionPhase, undoFinishConstructionPhase, undoCancelProject, resumeProject } from "@/lib/action/workflowActions";
import FinishProjectDialog from "@/components/projects/dialogs/FinishProjectDialog";
import CancelProjectDialog from "@/components/projects/dialogs/CancelProjectDialog";
import PauseProjectDialog from "@/components/projects/dialogs/PauseProjectDialog";

// Component con: Xử lý logic xóa dự án
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
                router.push("/projects");
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
function UndoConstructionItem({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleUndo = () => {
        if (!confirm("Bạn chắc chắn muốn hủy lệnh khởi công? Trạng thái sẽ quay về 'Lập kế hoạch' và các lệnh khởi công vừa tạo sẽ bị xóa.")) return;

        startTransition(async () => {
            const res = await undoConstructionPhase(projectId);
            if (res.success) {
                alert(res.message);
                router.refresh();
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            onClick={handleUndo}
            disabled={isPending}
            className="text-orange-700 focus:text-orange-800 focus:bg-orange-50 cursor-pointer"
        >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            Hủy lệnh khởi công (Undo)
        </DropdownMenuItem>
    );
}
// --- COMPONENT MỚI: UNDO NGHIỆM THU (MỚI THÊM) ---
function UndoFinishItem({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleUndo = () => {
        if (!confirm("Xác nhận hủy nghiệm thu? Dự án sẽ quay lại trạng thái 'Đang thi công'.")) return;

        startTransition(async () => {
            const res = await undoFinishConstructionPhase(projectId);
            if (res.success) {
                alert(res.message);
                router.refresh();
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            onClick={handleUndo}
            disabled={isPending}
            className="text-blue-700 focus:text-blue-800 focus:bg-blue-50 cursor-pointer"
        >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Hủy nghiệm thu (Quay lại thi công)
        </DropdownMenuItem>
    );
}

// --- COMPONENT MỚI: UNDO CANCEL (PHỤC HỒI DỰ ÁN) ---
function UndoCancelItem({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleUndo = () => {
        if (!confirm("Bạn muốn phục hồi dự án này? Hệ thống sẽ tự động đưa dự án về trạng thái trước khi hủy.")) return;

        startTransition(async () => {
            const res = await undoCancelProject(projectId);
            if (res.success) {
                alert(res.message);
                router.refresh();
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <DropdownMenuItem
            onSelect={(e) => e.preventDefault()}
            onClick={handleUndo}
            disabled={isPending}
            className="text-green-700 focus:text-green-800 focus:bg-green-50 cursor-pointer"
        >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArchiveRestore className="w-4 h-4 mr-2" />}
            Phục hồi dự án (Undo)
        </DropdownMenuItem>
    );
}

// --- COMPONENT: NÚT RESUME (Start) ---
function ResumeProjectButton({ projectId }: { projectId: string }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleResume = () => {
        if (!confirm("Xác nhận tái khởi động dự án? Trạng thái sẽ chuyển về 'Đang thi công'.")) return;

        startTransition(async () => {
            const res = await resumeProject(projectId);
            if (res.success) {
                alert(res.message);
                router.refresh();
            } else {
                alert(res.error);
            }
        });
    };

    return (
        <Button
            onClick={handleResume}
            disabled={isPending}
            className="bg-green-600 hover:bg-green-700 text-white shadow-md animate-pulse font-bold"
        >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <PlayCircle className="w-4 h-4 mr-2" />}
            Tiếp tục Thi Công (Start)
        </Button>
    );
}
interface ProjectHeaderWrapperProps {
    project: any;
    permissions: {
        canEdit: boolean;
        canDelete: boolean;
        canAddMember: boolean;
        canDeleteTask: boolean;
    };
}

export default function ProjectHeaderWrapper({ project, permissions }: ProjectHeaderWrapperProps) {
    // 1. Kiểm tra trạng thái để hiện nút Khởi công
    const currentStatusCode = project.status_data?.code?.toLowerCase() || '';
    // Chỉ hiện khi trạng thái là Initial, Planning, hoặc Designing
    const canStartConstruction = ['initial', 'planning', 'design'].includes(currentStatusCode);
    const canUndoConstruction = currentStatusCode === 'in_progress' || currentStatusCode === 'execution';
    const canFinishProject = ['in_progress', 'execution', 'construction'].includes(currentStatusCode);
    const canUndoFinish = ['completed', 'finished', 'handed_over'].includes(currentStatusCode);
    const canCancel = !['completed', 'finished', 'cancelled'].includes(currentStatusCode);
    const isCancelled = currentStatusCode === 'cancelled';
    const isRunning = ['in_progress', 'execution', 'construction'].includes(currentStatusCode);
    const isPaused = ['paused', 'suspended', 'on_hold'].includes(currentStatusCode);
    //const canFinishProject = isRunning; // Chỉ hoàn thành khi đang chạy

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
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

                {/* 1. NÚT PHÁT LỆNH KHỞI CÔNG (Chỉ hiện khi đúng trạng thái) */}
                {permissions.canEdit && canStartConstruction && (
                    <StartConstructionDialog
                        project={{
                            id: project.id,
                            is_permit_required: project.is_permit_required,
                            construction_permit_code: project.construction_permit_code, // ✅ Quan trọng: Để check validate
                            start_date: project.start_date
                        }}
                    />
                )}

                {/* 2. NHÓM NÚT ĐANG THI CÔNG */}
                {permissions.canEdit && isRunning && (
                    <>
                        {/* Nút Tạm dừng */}
                        <PauseProjectDialog project={{ id: project.id, name: project.name }} />

                        {/* Nút Hoàn thành */}
                        <FinishProjectDialog
                            project={{ id: project.id, name: project.name, end_date: project.end_date }}
                        />
                    </>
                )}

                {/* 3. NÚT START (Khi đang Pause) */}
                {permissions.canEdit && isPaused && (
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 h-9 px-3">
                            <PauseCircle className="w-3 h-3 mr-1" /> ĐANG TẠM DỪNG
                        </Badge>
                        <ResumeProjectButton projectId={project.id} />
                    </div>
                )}

                {/* 4. NÚT CHỈNH SỬA (Desktop) - ✅ Đã khôi phục lại */}
                {permissions.canEdit && (
                    <Link href={`/projects/${project.id}/edit`}>
                        <Button variant="outline" size="sm" className="hidden sm:flex bg-white hover:bg-slate-50">
                            <Edit className="w-4 h-4 mr-2 text-slate-500" />
                            Chỉnh sửa
                        </Button>
                    </Link>
                )}

                {/* 5. DROPDOWN MENU (Mobile & Actions phụ) */}
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
                        {/* ✅ UNDO 1: HỦY KHỞI CÔNG (Khi đang thi công) */}
                        {permissions.canEdit && canUndoConstruction && (
                            <>
                                <DropdownMenuSeparator />
                                <UndoConstructionItem projectId={project.id} />
                            </>
                        )}

                        {/* ✅ UNDO 2: HỦY NGHIỆM THU (Khi đã hoàn thành) */}
                        {permissions.canEdit && canUndoFinish && (
                            <>
                                <DropdownMenuSeparator />
                                <UndoFinishItem projectId={project.id} />
                            </>
                        )}
                        {/* ✅ UNDO CANCEL: Chỉ hiện khi Đã Hủy */}
                        {permissions.canEdit && isCancelled && (
                            <>
                                <DropdownMenuSeparator />
                                <UndoCancelItem projectId={project.id} />
                            </>
                        )}

                        <DropdownMenuSeparator />

                        {/* ===== KHU VỰC DANGER ZONE (HỦY & XÓA) ===== */}

                        {/* ✅ NÚT HỦY DỰ ÁN (Chỉ hiện khi chưa hủy và chưa hoàn thành) */}
                        {permissions.canEdit && canCancel && (
                            <CancelProjectDialog
                                project={project}
                                trigger={
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-700 cursor-pointer">
                                        <XCircle className="w-4 h-4 mr-2" /> Hủy dự án (Dừng lại)
                                    </DropdownMenuItem>
                                }
                            />
                        )}

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