"use client"

import { useState } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Edit, MoreHorizontal, Trash2, Calendar, User } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { deleteTask } from "@/lib/action/taskActions"
// ✅ Import component Bình luận
import TaskCommentSection from "@/components/tasks/TaskCommentSection";

interface Task {
    id: string
    name: string
    description: string
    status?: { name: string; color: string; code: string } | null
    priority?: { name: string; color: string; code: string } | null
    assignee?: { name: string; avatar_url: string } | null
    due_date: string | null
    progress: number
    project_id: string; // Cần project_id để comment
}

interface ProjectTaskListProps {
    tasks: any[]
    projectId: string
    members: any[] // Cần danh sách thành viên để tag/hiển thị trong comment
    currentUserId: string // Cần ID người dùng hiện tại để like/comment
}

export function ProjectTaskList({ tasks: initialTasks, projectId, members, currentUserId }: ProjectTaskListProps) {
    const [taskList, setTaskList] = useState<Task[]>(
        initialTasks.map((t) => ({
            ...t,
            status: Array.isArray(t.status) ? t.status[0] : t.status,
            priority: Array.isArray(t.priority) ? t.priority[0] : t.priority,
            assignee: t.assignee,
        }))
    )

    const handleDelete = async (taskId: string) => {
        if (!confirm("Bạn chắc chắn muốn xóa?")) return;
        const res = await deleteTask(taskId, projectId);
        if (res.success) {
            toast.success("Đã xóa công việc");
            setTaskList(prev => prev.filter(t => t.id !== taskId));
        } else {
            toast.error(res.error);
        }
    }

    const formatDate = (dateString: string | null) => {
        if (!dateString) return "--/--/----";
        return new Date(dateString).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })
    }

    const renderStatusBadge = (status: Task['status']) => {
        if (!status) return <Badge variant="outline" className="bg-gray-100 text-gray-600 border-gray-200">Khởi tạo</Badge>;
        return (
            <Badge variant="outline" style={{ backgroundColor: `${status.color}20`, color: status.color, borderColor: `${status.color}50` }}>
                {status.name}
            </Badge>
        )
    }

    const renderPriorityBadge = (priority: Task['priority']) => {
        if (!priority) return null;
        return <Badge variant="outline" style={{ color: priority.color, borderColor: priority.color }}>{priority.name}</Badge>
    }

    // Chuẩn hóa danh sách thành viên cho Comment Section
    const formattedMembers = members.map(m => ({
        id: m.employee?.id || "",
        name: m.employee?.name || "Unknown",
        avatar_url: m.employee?.avatar_url
    })).filter(m => m.id !== "");

    if (taskList.length === 0) {
        return <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">Chưa có công việc nào</div>
    }

    return (
        <div className="space-y-4">
            {taskList.map((task) => (
                <div key={task.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors bg-white shadow-sm">
                    <div className="flex items-start gap-4">
                        <Checkbox checked={task.progress === 100} className="mt-1" />

                        <div className="flex-1 space-y-2">
                            {/* Header Task */}
                            <div className="flex items-center justify-between">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="font-semibold text-slate-800 text-lg">{task.name}</h3>
                                    {renderStatusBadge(task.status)}
                                    {renderPriorityBadge(task.priority)}
                                </div>

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem asChild>
                                            <Link href={`/projects/${projectId}/tasks?edit=${task.id}`} className="cursor-pointer">
                                                <Edit className="h-4 w-4 mr-2" /> Chỉnh sửa
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem className="text-red-600 cursor-pointer" onClick={() => handleDelete(task.id)}>
                                            <Trash2 className="h-4 w-4 mr-2" /> Xóa
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Description */}
                            {task.description && <p className="text-sm text-slate-600">{task.description}</p>}

                            {/* Meta Info */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-slate-500">
                                <div className="flex items-center gap-2">
                                    <User className="w-4 h-4" />
                                    {task.assignee ? (
                                        <div className="flex items-center gap-1">
                                            {task.assignee.avatar_url && <img src={task.assignee.avatar_url} className="w-5 h-5 rounded-full object-cover" alt="" />}
                                            <span className="font-medium text-slate-700">{task.assignee.name}</span>
                                        </div>
                                    ) : <span>Chưa phân công</span>}
                                </div>

                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4" />
                                    <span className={task.due_date && new Date(task.due_date) < new Date() ? "text-red-500 font-bold" : ""}>
                                        Hạn chót: {formatDate(task.due_date)}
                                    </span>
                                </div>
                            </div>

                            {/* Progress */}
                            <div className="space-y-1 pt-1 max-w-md">
                                <div className="flex justify-between text-xs text-slate-500">
                                    <span>Tiến độ: {task.progress || 0}%</span>
                                </div>
                                <Progress value={task.progress || 0} className="h-2" />
                            </div>

                            {/* ✅ PHẦN BÌNH LUẬN & LIKE (Đã thêm lại) */}
                            <div className="mt-4 border-t pt-2">
                                <TaskCommentSection
                                    taskId={task.id}
                                    projectId={projectId}
                                    members={formattedMembers}
                                    currentUserId={currentUserId}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}