// PHẢI LÀ SERVER COMPONENT
import TaskCommentWrapper from "./TaskCommentWrapper";
import TaskEditModal from "@/components/tasks/TaskEditModal";
import { TaskData, MemberData } from "@/types/project";
import { formatDate } from "@/lib/utils/utils";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/action/authActions"; // ✅ Import hàm lấy user

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

    // ✅ Lấy user hiện tại từ server
    const currentUser = await getCurrentUser();
    const currentUserId = currentUser?.id ?? "";

    return (
        <div
            key={task.id}
            className="p-5 border rounded-xl shadow-md bg-white grid gap-4 hover:shadow-lg transition duration-200"
        >
            {/* HEADER CỦA TASK (Thông tin chính, nút chỉnh sửa/xóa) */}
            <header className="flex justify-between items-start mb-2">
                <h2 className="text-xl font-bold text-gray-900">{task.name}</h2>
                <TaskEditModal task={task} members={members} />
            </header>

            {/* Thông tin ngày */}
            <div className="flex justify-start text-xs text-gray-500 space-x-4">
                {task.start_date && <span>Bắt đầu: {formatDate(task.start_date)}</span>}
                {task.due_date && <span className="text-red-500 font-medium">Hạn chót: {formatDate(task.due_date)}</span>}
            </div>

            {/* Mô tả */}
            <p className="text-sm text-gray-700">
                {task.description || "Chưa có mô tả chi tiết."}
            </p>

            {/* Status & Assignment */}
            <div className="flex items-center justify-between border-b pb-3 text-sm">
                <div className="flex items-center space-x-4">
                    <span className="text-gray-600">
                        Phân công: <span className="font-medium text-gray-800">{task.assigned_to?.name || "Chưa phân công"}</span>
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                        ${task.status === "completed" ? "bg-green-100 text-green-700" :
                            task.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                                "bg-gray-100 text-gray-700"}`}
                    >
                        {getStatusLabel(task.status)}
                    </span>
                </div>
                <span className="text-sm font-semibold text-blue-600">Tiến độ: {task.progress || 0}%</span>
            </div>

            {/* ✅ PHẦN BÌNH LUẬN: GỌI SERVER WRAPPER ĐỂ LẤY USER ID VÀ TASK ID ĐỘNG */}
            <section className="mt-2">
                <TaskCommentWrapper
                    taskId={task.id}
                    projectId={projectId}
                    members={members}
                    currentUserId={currentUserId} // ✅ Truyền đúng user id!
                />
            </section>
        </div>
    );
}