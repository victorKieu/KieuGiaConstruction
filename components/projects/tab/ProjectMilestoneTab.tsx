"use client"

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/utils"; // ✅ Khôi phục import
import { MilestoneData, TaskData, MemberData, TaskStatus } from "@/types/project";
import TaskCreateModal from "@/components/tasks/TaskCreateModal";
import TaskEditModal from "@/components/tasks/TaskEditModal";
import { Button } from "@/components/ui/button";
// ✅ IMPORT TaskCommentWrapper (Server Component) để dùng cho cơ chế Fallback
import TaskCommentWrapper from "@/components/tasks/TaskCommentWrapper";

// ✅ Bổ sung taskFeed vào props để nhận JSX đã được Server render
interface ProjectMilestoneTabProps {
    projectId: string;
    milestones: MilestoneData[];
    tasks: TaskData[]; // Vẫn nhận để hiển thị tổng số lượng task
    members: MemberData[];
    taskFeed?: React.ReactNode; // ✅ Làm cho nó OPTIONAL
}

// Hàm phụ trợ cho Client-side rendering (cần cho Fallback)
function getStatusLabel(status: TaskStatus) {
    switch (status) {
        case "completed":
        case "done":
            return "Hoàn thành";
        case "in_progress":
            return "Đang thực hiện";
        case "pending":
        case "todo":
            return "Cần làm";
        case "on_hold":
            return "Tạm dừng";
        case "cancelled":
            return "Đã hủy";
        default:
            return "Không xác định";
    }
}


// ✅ Cập nhật destructuring để nhận taskFeed (optional)
export default function ProjectMilestoneTab({ projectId, tasks, members, taskFeed }: ProjectMilestoneTabProps) {

    // --- LOGIC HIỂN THỊ TASK ---
    let taskContent;

    // 1. ƯU TIÊN: SỬ DỤNG TASK FEED ĐÃ ĐƯỢC SERVER RENDER (Có bình luận)
    if (taskFeed) {
        taskContent = taskFeed;
    } else {
        // 2. FALLBACK: TỰ RENDER LẠI TRÊN CLIENT (Không có bình luận tích hợp)

        // === RENDER FALLBACK (KHÔNG BÌNH LUẬN) ===
        taskContent = tasks.map((task) => (
            <div
                key={task.id}
                className="p-5 border rounded-xl shadow-sm bg-white" // ✅ Thiết kế kiểu post
            >
                {/* HEADER CỦA TASK (Thông tin chính, nút chỉnh sửa/xóa) */}
                <div className="flex justify-between items-start mb-3 border-b pb-3">
                    <div className="flex flex-col">
                        <p className="font-bold text-lg text-gray-800">{task.name}</p>
                        <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1">
                            <span>Bắt đầu: {task.start_date ? formatDate(task.start_date) : "N/A"}</span>
                            <span>|</span>
                            <span>Hạn chót: {task.due_date ? formatDate(task.due_date) : "N/A"}</span>
                        </div>
                    </div>

                    {/* Nút Chỉnh sửa/Xóa Task */}
                    <div className="flex items-center space-x-2 flex-shrink-0">
                        <TaskEditModal task={task} members={members} />
                    </div>
                </div>

                {/* BODY CỦA TASK (Mô tả, Trạng thái, Người được giao) */}
                <p className="text-sm text-gray-600 whitespace-pre-wrap mb-4">
                    {task.description || "Không có mô tả chi tiết."}
                </p>

                <div className="flex items-center justify-between border-b pb-3 mb-3 text-sm">
                    <div className="flex items-center space-x-4">
                        <span className="text-gray-600">
                            Phân công: <span className="font-medium text-gray-800">{task.assigned_to?.name || "Chưa phân công"}</span>
                        </span>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium 
                            ${task.status === "completed" ? "bg-green-100 text-green-700" :
                                task.status === "in_progress" ? "bg-blue-100 text-blue-700" :
                                    "bg-gray-100 text-gray-700"
                            }`}
                        >
                            {getStatusLabel(task.status)}
                        </span>
                    </div>
                    <span className="text-sm font-semibold text-blue-600">Tiến độ: {task.progress || 0}%</span>
                </div>

                {/* FOOTER - Phần Tương tác và Bình luận (Chỉ giữ lại placeholder) */}
                <div className="flex items-center space-x-4 text-gray-500 text-sm mb-3">
                    <Button variant="ghost" className="flex items-center px-2 text-sm text-blue-600 hover:bg-blue-50">
                        👍 Thích (0)
                    </Button>
                    <Button variant="ghost" className="flex items-center px-2 text-sm text-gray-600 hover:bg-gray-100">
                        💬 Bình luận
                    </Button>
                </div>

                {/* LƯU Ý: Phần Bình luận SẼ BỊ MẤT trong chế độ Fallback này */}
                <section className="mt-6 pt-4 border-t">
                    <p className="text-sm text-red-500">
                        ⚠️ Không thể tải hệ thống bình luận (Lỗi truyền prop `taskFeed`).
                    </p>
                </section>
            </div>
        ));
    }
    // --- KẾT THÚC LOGIC HIỂN THỊ TASK ---


    return (
        <div className="space-y-6">

            {/* 1. Danh sách Công việc (Tasks) VÀ Nút Tạo Công việc */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    {/* Sử dụng tasks.length để hiển thị tổng số lượng task */}
                    <CardTitle className="text-lg font-semibold">Danh sách Công việc ({tasks.length})</CardTitle>
                    <TaskCreateModal projectId={projectId} members={members} />
                </CardHeader>

                <CardContent>
                    {tasks.length === 0 ? (
                        <p className="text-sm text-muted-foreground">Chưa có công việc nào được tạo. Hãy nhấn nút để tạo công việc đầu tiên.</p>
                    ) : (
                        <div className="grid gap-6">
                            {/* Hiển thị nội dung đã được xác định ở trên (taskFeed hoặc Fallback) */}
                            {taskContent}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
