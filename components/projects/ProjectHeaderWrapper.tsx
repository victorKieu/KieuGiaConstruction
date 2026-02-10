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
                    // ✅ FIX: Dark mode hover colors
                    className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:text-red-400 dark:focus:bg-red-900/30 cursor-pointer"
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
                        Bạn có chắc chắn muốn xóa dự án
                        {/* ✅ FIX: text-black -> text-foreground */}
                        <span className="font-bold text-foreground mx-1">"{project.name}"</span>?
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
                        className="bg-red-600 hover:bg-red-700 text-white dark:bg-red-700 dark:hover:bg-red-800"
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
            // ✅ FIX: Dark mode colors
            className="text-orange-700 focus:text-orange-800 focus:bg-orange-50 dark:text-orange-400 dark:focus:bg-orange-900/30 cursor-pointer"
        >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCcw className="w-4 h-4 mr-2" />}
            Hủy lệnh khởi công (Undo)
        </DropdownMenuItem>
    );
}

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
            // ✅ FIX: Dark mode colors
            className="text-blue-700 focus:text-blue-800 focus:bg-blue-50 dark:text-blue-400 dark:focus:bg-blue-900/30 cursor-pointer"
        >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RotateCcw className="w-4 h-4 mr-2" />}
            Hủy nghiệm thu (Quay lại thi công)
        </DropdownMenuItem>
    );
}

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
            // ✅ FIX: Dark mode colors
            className="text-green-700 focus:text-green-800 focus:bg-green-50 dark:text-green-400 dark:focus:bg-green-900/30 cursor-pointer"
        >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <ArchiveRestore className="w-4 h-4 mr-2" />}
            Phục hồi dự án (Undo)
        </DropdownMenuItem>
    );
}

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
            className="bg-green-600 hover:bg-green-700 text-white shadow-md animate-pulse font-bold dark:bg-green-700 dark:hover:bg-green-800"
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
    const currentStatusCode = project.status_data?.code?.toLowerCase() || '';

    const canStartConstruction = ['initial', 'planning', 'design'].includes(currentStatusCode);
    const canUndoConstruction = currentStatusCode === 'in_progress' || currentStatusCode === 'execution';
    const canFinishProject = ['in_progress', 'execution', 'construction'].includes(currentStatusCode);
    const canUndoFinish = ['completed', 'finished', 'handed_over'].includes(currentStatusCode);
    const canCancel = !['completed', 'finished', 'cancelled'].includes(currentStatusCode);
    const isCancelled = currentStatusCode === 'cancelled';
    const isRunning = ['in_progress', 'execution', 'construction'].includes(currentStatusCode);
    const isPaused = ['paused', 'suspended', 'on_hold'].includes(currentStatusCode);

    return (
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
                <Link href="/projects">
                    {/* ✅ FIX: bg-white -> bg-background, border-slate-200 -> border-input */}
                    <Button variant="outline" size="icon" className="h-9 w-9 bg-background hover:bg-accent border-input">
                        <ArrowLeft className="h-4 w-4 text-muted-foreground" />
                    </Button>
                </Link>

                <div>
                    <div className="flex items-center gap-3">
                        {/* ✅ FIX: text-slate-800 -> text-foreground */}
                        <h1 className="text-xl font-bold text-foreground line-clamp-1">{project.name}</h1>
                        {/* ✅ FIX: bg-slate-50 -> bg-muted, text-slate-600 -> text-muted-foreground */}
                        <Badge variant="outline" className="font-mono text-xs bg-muted text-muted-foreground border-border hidden sm:inline-flex">
                            {project.code}
                        </Badge>
                    </div>
                </div>
            </div>

            {/* Actions Buttons */}
            <div className="flex items-center gap-2">

                {permissions.canEdit && canStartConstruction && (
                    <StartConstructionDialog
                        project={{
                            id: project.id,
                            is_permit_required: project.is_permit_required,
                            construction_permit_code: project.construction_permit_code,
                            start_date: project.start_date
                        }}
                    />
                )}

                {permissions.canEdit && isRunning && (
                    <>
                        <PauseProjectDialog project={{ id: project.id, name: project.name }} />
                        <FinishProjectDialog
                            project={{ id: project.id, name: project.name, end_date: project.end_date }}
                        />
                    </>
                )}

                {permissions.canEdit && isPaused && (
                    <div className="flex items-center gap-2">
                        {/* ✅ FIX: Dark mode colors */}
                        <Badge variant="outline" className="bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800 h-9 px-3">
                            <PauseCircle className="w-3 h-3 mr-1" /> ĐANG TẠM DỪNG
                        </Badge>
                        <ResumeProjectButton projectId={project.id} />
                    </div>
                )}

                {/* ✅ FIX: bg-white -> bg-background */}
                {permissions.canEdit && (
                    <Link href={`/projects/${project.id}/edit`}>
                        <Button variant="outline" size="sm" className="hidden sm:flex bg-background hover:bg-accent border-input">
                            <Edit className="w-4 h-4 mr-2 text-muted-foreground" />
                            Chỉnh sửa
                        </Button>
                    </Link>
                )}

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-9 w-9">
                            <MoreVertical className="w-4 h-4 text-muted-foreground" />
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

                        {permissions.canEdit && canUndoConstruction && (
                            <>
                                <DropdownMenuSeparator />
                                <UndoConstructionItem projectId={project.id} />
                            </>
                        )}

                        {permissions.canEdit && canUndoFinish && (
                            <>
                                <DropdownMenuSeparator />
                                <UndoFinishItem projectId={project.id} />
                            </>
                        )}

                        {permissions.canEdit && isCancelled && (
                            <>
                                <DropdownMenuSeparator />
                                <UndoCancelItem projectId={project.id} />
                            </>
                        )}

                        <DropdownMenuSeparator />

                        {permissions.canEdit && canCancel && (
                            <CancelProjectDialog
                                project={project}
                                trigger={
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="text-red-600 focus:text-red-700 dark:text-red-400 dark:focus:text-red-300 dark:focus:bg-red-900/20 cursor-pointer">
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