// PHẢI LÀ SERVER COMPONENT
import TaskCommentWrapper from "./TaskCommentWrapper";
import TaskEditModal from "@/components/tasks/TaskEditModal";
import { TaskData, MemberData } from "@/types/project";
import { formatDate } from "@/lib/utils/utils";

interface TaskItemServerWrapperProps {
    task: TaskData;
    members: MemberData[];
    projectId: string;
    currentUserId: string;
}

function getStatusLabel(status: string) {
    switch (status) {
        case "completed": return "Hoàn thành";
        case "in_progress": return "Đang thực hiện";
        case "pending": return "Chưa bắt đầu";
        case "todo": return "Cần làm";
        case "done": return "Hoàn thành";
        default: return "Không xác định";
    }
}

export default async function TaskItemServerWrapper({ task, members }: TaskItemServerWrapperProps) {
    const projectId = task.project_id;

    return (
        <div
            key={task.id}
            // ✅ FIX: bg-white -> bg-card, border colors
            className="p-5 border border-border rounded-xl shadow-sm bg-card text-card-foreground grid gap-4 hover:shadow-md transition duration-200"
        >
            {/* Header */}
            <header className="flex justify-between items-start mb-2">
                {/* ✅ FIX: text-gray-900 -> text-foreground */}
                <h2 className="text-xl font-bold text-foreground">{task.name}</h2>
                <TaskEditModal task={task} members={members} />
            </header>

            {/* Thông tin ngày */}
            {/* ✅ FIX: text-gray-500 -> text-muted-foreground */}
            <div className="flex justify-start text-xs text-muted-foreground space-x-4">
                {task.start_date && <span>Bắt đầu: {formatDate(task.start_date)}</span>}
                {/* ✅ FIX: text-red-500 -> dark:text-red-400 */}
                {task.due_date && <span className="text-red-500 dark:text-red-400 font-medium">Hạn chót: {formatDate(task.due_date)}</span>}
            </div>

            {/* Mô tả */}
            {/* ✅ FIX: text-gray-700 -> text-muted-foreground */}
            <p className="text-sm text-muted-foreground">
                {task.description || "Chưa có mô tả chi tiết."}
            </p>

            {/* Status & Assignment */}
            {/* ✅ FIX: border-b color */}
            <div className="flex items-center justify-between border-b border-border pb-3 text-sm">
                <div className="flex items-center space-x-4">
                    {/* ✅ FIX: text-gray-600 -> text-muted-foreground */}
                    <span className="text-muted-foreground">
                        {/* ✅ FIX: text-gray-800 -> text-foreground */}
                        Phân công: <span className="font-medium text-foreground">{task.assigned_to?.name || "Chưa phân công"}</span>
                    </span>

                    {/* ✅ FIX: Badge colors for dark mode */}
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                        ${task.status === "completed" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                            task.status === "in_progress" ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                "bg-gray-100 text-gray-700 dark:bg-muted dark:text-muted-foreground"}`}
                    >
                        {getStatusLabel(task.status)}
                    </span>
                </div>
                {/* ✅ FIX: text-blue-600 -> dark:text-blue-400 */}
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">Tiến độ: {task.progress || 0}%</span>
            </div>

            {/* ✅ PHẦN BÌNH LUẬN */}
            <section className="mt-2">
                <TaskCommentWrapper
                    taskId={task.id}
                    projectId={projectId}
                    members={members}
                />
            </section>
        </div>
    );
}