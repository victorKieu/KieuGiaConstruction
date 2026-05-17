"use client"

import { useState, useMemo, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import {
    MoreHorizontal, Trash2, Layers3, AlertCircle,
    MessageSquare, Calendar, Heart, Plus
} from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { deleteTask } from "@/lib/action/taskActions"
import TaskCommentSection from "@/components/tasks/TaskCommentSection";
import { formatDate } from "@/lib/utils/utils";
import TaskCreateModal from "./TaskCreateModal";

export function ProjectTaskList({ tasks: initialTasks, projectId, members, currentUserId }: any) {
    const [taskList, setTaskList] = useState<any[]>(initialTasks);
    const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

    // ✅ ĐỒNG BỘ DỮ LIỆU: Khi Server cập nhật (revalidate), Client phải cập nhật theo ngay
    useEffect(() => {
        setTaskList(initialTasks);
    }, [initialTasks]);

    // ✅ TÌM TASK ĐANG ĐƯỢC CHỌN TỪ DANH SÁCH MỚI NHẤT
    const activeTask = useMemo(() => {
        return taskList.find(t => t.id === selectedTaskId) || null;
    }, [selectedTaskId, taskList]);

    const displayTasks = useMemo(() => {
        // Chỉ lấy các Task "Lá" (Task không phải là Cha của ai) để đưa lên Kanban
        const parentIds = new Set(taskList.map(t => t.parent_id).filter(Boolean));
        let leaves = taskList.filter(t => !parentIds.has(t.id));

        // ✅ THUẬT TOÁN SORT WBS THÔNG MINH
        leaves.sort((a, b) => {
            // Tách mã thành các mảng số (VD: "1.10" -> [1, 10])
            const partsA = (a.wbs_code || "").split('.').map(Number);
            const partsB = (b.wbs_code || "").split('.').map(Number);

            // So sánh từng cấp độ từ trái sang phải
            for (let i = 0; i < Math.max(partsA.length, partsB.length); i++) {
                const numA = partsA[i] || 0;
                const numB = partsB[i] || 0;
                if (numA !== numB) {
                    return numA - numB; // Nếu khác nhau thì xếp số nhỏ lên trước
                }
            }
            return 0;
        });

        return leaves;
    }, [taskList]);

    const handleDelete = async (taskId: string) => {
        if (!confirm("Xóa công việc này?")) return;
        const res = await deleteTask(taskId, projectId);
        if (res.success) {
            toast.success("Đã xóa");
            if (selectedTaskId === taskId) setSelectedTaskId(null);
        }
    }

    const formattedMembers = members.map((m: any) => ({
        id: m.employee?.id, name: m.employee?.name, avatar_url: m.employee?.user_profiles?.avatar_url || m.employee?.avatar_url
    }));

    const evaluateProgress = (task: any) => {
        if (task.progress >= 100) return null;
        if (!task.start_date || !task.due_date) return null;
        const today = new Date().getTime();
        const start = new Date(task.start_date).getTime();
        const end = new Date(task.due_date).getTime();
        if (today > end) return { label: "Trễ hạn", style: "bg-red-100 text-red-700 border-red-300 animate-pulse" };
        const totalDuration = end - start;
        const elapsed = today - start;
        let plannedProgress = totalDuration > 0 ? Math.round((elapsed / totalDuration) * 100) : 0;
        plannedProgress = Math.max(0, Math.min(100, Math.min(100, plannedProgress)));
        if (task.progress < plannedProgress && today >= start) return { label: `Chậm tiến độ`, style: "bg-orange-100 text-orange-700 border-orange-300" };
        return null;
    }

    const columns = Array.from(new Set(displayTasks.map(t => t.status?.name || "Chưa xác định")));

    const renderTaskCard = (task: any) => {
        const warning = evaluateProgress(task);
        const isLikedByMe = Array.isArray(task.task_likes) && task.task_likes.some((l: any) => l.user_id === currentUserId);

        return (
            <div key={task.id} className={`bg-white dark:bg-slate-950 border ${warning?.label === "Trễ hạn" ? "border-red-400 shadow-sm" : "border-slate-200 dark:border-slate-800"} rounded-xl p-3 shadow-sm hover:shadow-md transition-all flex flex-col`}>
                <div className="flex justify-between items-start mb-2">
                    <h4
                        className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-tight line-clamp-2 pr-2 cursor-pointer hover:text-blue-600"
                        onClick={() => setSelectedTaskId(task.id)}
                    >
                        {/* ✅ HIỂN THỊ MÃ WBS BẰNG FONT MONO ĐỂ DỄ NHÌN THỨ TỰ */}
                        <span className="text-indigo-600 dark:text-indigo-400 mr-1.5 font-mono text-xs">
                            {task.wbs_code ? `[${task.wbs_code}]` : ''}
                        </span>
                        {task.name}
                    </h4>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0"><MoreHorizontal className="w-4 h-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end"><DropdownMenuItem className="text-red-600" onClick={() => handleDelete(task.id)}><Trash2 className="w-4 h-4 mr-2" /> Xóa</DropdownMenuItem></DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="flex items-center gap-2 mb-3">
                    {task.assignee ? (
                        <div className="flex items-center gap-2 text-[11px] font-medium bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                            <img src={task.assignee.avatar_url || '/placeholder-user.jpg'} className="w-4 h-4 rounded-full object-cover" alt="" />
                            <span className="truncate max-w-[120px]">{task.assignee.name}</span>
                        </div>
                    ) : <span className="text-[11px] text-slate-400 italic">Chưa phân công</span>}
                </div>

                <Progress value={task.progress || 0} className="h-1.5 mb-1" />
                <div className="flex justify-between items-center text-[10px] text-slate-500 mb-2">
                    <span className="font-bold text-slate-700 dark:text-slate-300">{task.progress}%</span>
                    {warning && <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${warning.style}`}>{warning.label}</span>}
                </div>

                <div className="flex items-center gap-3 mt-1 mb-2 px-1">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <Heart className={`w-3 h-3 ${isLikedByMe ? "fill-red-500 text-red-500" : ""}`} />
                        <span>{task.likes_count || 0}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 font-medium">
                        <MessageSquare className="w-3 h-3" />
                        <span>{task.comments_count || 0}</span>
                    </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800 pt-2 mt-auto">
                    <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-slate-500 hover:text-blue-600" onClick={() => setSelectedTaskId(task.id)}>
                        Chi tiết & Thảo luận
                    </Button>
                </div>
            </div>
        );
    };

    return (
        <div className="w-full">
            {/* ✅ THANH HEADER MỚI BỔ SUNG NÚT TẠO TASK */}
            <div className="flex justify-between items-center mb-4 px-1">
                <Button
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md"
                    onClick={() => setIsCreateModalOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-1.5" /> Tạo Hạng mục mới
                </Button>
            </div>
            <div className="flex gap-4 overflow-x-auto pb-4 items-start snap-x custom-scrollbar">
                {columns.map(statusName => {
                    const colTasks = displayTasks.filter(t => (t.status?.name || "Chưa xác định") === statusName);
                    return (
                        <div key={statusName} className="min-w-[300px] w-[300px] bg-slate-50/50 dark:bg-slate-900/50 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col max-h-[70vh]">
                            <div className="flex items-center justify-between mb-3 px-1">
                                <h3 className="font-bold text-xs text-slate-600 dark:text-slate-300 uppercase tracking-wider">{statusName}</h3>
                                <Badge variant="secondary" className="text-[10px] h-5">{colTasks.length}</Badge>
                            </div>
                            <div className="space-y-2.5 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                                {colTasks.map(renderTaskCard)}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* MODAL HIỂN THỊ CHI TIẾT */}
            <Dialog open={!!selectedTaskId} onOpenChange={(open) => !open && setSelectedTaskId(null)}>
                <DialogContent className="max-w-2xl bg-slate-50 dark:bg-slate-900 shadow-2xl p-0 overflow-hidden border-0">
                    {activeTask && (
                        <>
                            <div className="bg-white dark:bg-slate-950 p-6 border-b border-slate-200 dark:border-slate-800">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" style={{ borderColor: activeTask.status?.color, color: activeTask.status?.color }}>
                                            {activeTask.status?.name}
                                        </Badge>
                                    </div>
                                </div>
                                <DialogTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-4 leading-tight">{activeTask.name}</DialogTitle>

                                {/* ✅ BẢNG ĐIỀU KHIỂN TIẾN ĐỘ & RÀNG BUỘC (MỚI THÊM VÀO ĐÂY) */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mt-2 shadow-sm">

                                    {/* CỘT 1: THÔNG TIN CƠ BẢN & RÀNG BUỘC */}
                                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/50">
                                        <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Công việc tiền nhiệm (Predecessor)</span>
                                        <div className="grid grid-cols-1 gap-2">
                                            {/* Chọn công việc đi trước */}
                                            <Select
                                                defaultValue={activeTask.predecessor_id || "none"}
                                                onValueChange={async (val) => {
                                                    const predId = val === "none" ? null : val;
                                                    toast.promise(
                                                        import('@/lib/action/taskActions').then(m => m.updateTaskDependency(activeTask.id, projectId, predId)),
                                                        { loading: 'Đang thiết lập liên kết...', success: 'Đã nối dây tiến độ!', error: 'Lỗi' }
                                                    );
                                                }}
                                            >
                                                <SelectTrigger className="h-9 w-full text-xs bg-white dark:bg-slate-950 border-slate-200">
                                                    <SelectValue placeholder="Chọn công việc đi trước..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">-- Không có (Bắt đầu tự do) --</SelectItem>
                                                    {taskList
                                                        .filter(t => t.id !== activeTask.id) // Không được chọn chính nó
                                                        .map(t => (
                                                            <SelectItem key={t.id} value={t.id}>
                                                                <span className="font-mono text-[10px] text-blue-600 mr-1">[{t.wbs_code}]</span> {t.name}
                                                            </SelectItem>
                                                        ))
                                                    }
                                                </SelectContent>
                                            </Select>

                                            {/* Chọn kiểu ràng buộc và Lag */}
                                            <div className="flex items-center gap-2">
                                                <Select defaultValue={activeTask.dependency_type || "FS"}>
                                                    <SelectTrigger className="h-8 w-[70px] text-[10px] font-bold bg-slate-100 dark:bg-slate-800 border-none">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="FS">FS</SelectItem>
                                                        <SelectItem value="SS">SS</SelectItem>
                                                        <SelectItem value="FF">FF</SelectItem>
                                                        <SelectItem value="SF">SF</SelectItem>
                                                    </SelectContent>
                                                </Select>

                                                <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 rounded-md px-2 h-8 flex-1">
                                                    <span className="text-[10px] text-slate-400">Trễ (Lag):</span>
                                                    <input
                                                        type="number"
                                                        defaultValue={activeTask.lag_days || 0}
                                                        className="w-full bg-transparent border-none text-xs font-bold focus:ring-0 text-right outline-none"
                                                    />
                                                    <span className="text-[10px] text-slate-400">ngày</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CỘT 2: ĐIỀU KHIỂN THỜI GIAN & TĂNG CA */}
                                    <div className="space-y-4">
                                        <div className="space-y-1.5">
                                            <span className="text-slate-500 text-[11px] font-bold uppercase tracking-wider">Thời gian thi công</span>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="date"
                                                    defaultValue={activeTask.start_date ? activeTask.start_date.split('T')[0] : ''}
                                                    className="h-8 text-xs font-semibold rounded-md border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 focus:ring-blue-500 w-[120px] outline-none px-2"
                                                    onBlur={async (e) => {
                                                        const newVal = e.target.value;
                                                        if (newVal && newVal !== activeTask.start_date?.split('T')[0]) {
                                                            toast.promise(
                                                                import('@/lib/action/taskActions').then(m => m.updateTaskSchedule(activeTask.id, projectId, { start_date: newVal })),
                                                                { loading: 'Đang tịnh tiến tiến độ...', success: 'Đã cập nhật!', error: 'Lỗi' }
                                                            );
                                                        }
                                                    }}
                                                />
                                                <span className="text-slate-400 text-xs">+</span>
                                                <div className="flex items-center gap-1 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-md px-2 h-8 w-[90px]">
                                                    <input
                                                        type="number"
                                                        defaultValue={activeTask.duration || 1}
                                                        min={1}
                                                        className="w-full bg-transparent border-none text-xs font-semibold focus:ring-0 text-center outline-none"
                                                        onBlur={async (e) => {
                                                            const newDuration = parseInt(e.target.value);
                                                            if (newDuration && newDuration !== activeTask.duration) {
                                                                toast.promise(
                                                                    import('@/lib/action/taskActions').then(m => m.updateTaskSchedule(activeTask.id, projectId, { duration: newDuration })),
                                                                    { loading: 'Đang tính toán lại...', success: 'Tiến độ đã được đồng bộ!', error: 'Lỗi' }
                                                                );
                                                            }
                                                        }}
                                                    />
                                                </div>
                                            </div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                                                <Calendar className="w-3 h-3" /> Dự kiến xong:
                                                <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                    {activeTask.end_date ? formatDate(activeTask.end_date) : '--'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800/50 flex items-center justify-between">
                                            <div>
                                                <span className="text-slate-700 dark:text-slate-300 text-xs font-bold block">Làm xuyên Lễ / Cuối tuần</span>
                                                <span className="text-slate-400 text-[10px]">Tính cả Thứ 7, CN vào tiến độ</span>
                                            </div>
                                            <input
                                                type="checkbox"
                                                defaultChecked={activeTask.allow_weekend_work}
                                                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                                                onChange={async (e) => {
                                                    const isChecked = e.target.checked;
                                                    toast.promise(
                                                        import('@/lib/action/taskActions').then(m => m.updateTaskSchedule(activeTask.id, projectId, { allow_weekend_work: isChecked })),
                                                        { loading: 'Đang cấu hình tăng ca...', success: 'Đã áp dụng lịch làm việc mới!', error: 'Lỗi' }
                                                    );
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-6 max-h-[50vh] overflow-y-auto custom-scrollbar bg-white dark:bg-slate-950">
                                {/* ĐÃ XÓA THẺ <h3> Ở ĐÂY CHỈ CÒN LẠI COMPONENT BÌNH LUẬN */}
                                <TaskCommentSection
                                    taskId={activeTask.id}
                                    projectId={projectId}
                                    members={formattedMembers}
                                    currentUserId={currentUserId}
                                    commentsCount={activeTask.comments_count} // ✅ TRUYỀN SỐ VÀO BÊN TRONG
                                />
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
            {/* GỌI MODAL TẠO CÔNG VIỆC Ở ĐÂY */}
            <TaskCreateModal
                open={isCreateModalOpen}
                onOpenChange={setIsCreateModalOpen}
                projectId={projectId}
                members={formattedMembers}
                tasks={taskList}
            />
        </div>
    )
}