// components/tasks/TaskCommentWrapper.tsx
import { getCurrentUser } from "@/lib/action/authActions";
import TaskCommentSection from "./TaskCommentSection";
import { MemberData } from "@/types/project";

// Giả định MemberDisplayData mà Client Component TaskCommentSection mong đợi
// (Cấu trúc này phải khớp với props của TaskCommentSection)
interface MemberDisplayData {
    id: string;
    name: string;
    avatar_url?: string;
}

interface TaskCommentWrapperProps {
    taskId: string;
    projectId: string;
    members: MemberData[];
}

export default async function TaskCommentWrapper({ taskId, projectId, members }: TaskCommentWrapperProps) {
    // Lấy thông tin người dùng an toàn trên Server
    const currentUser = await getCurrentUser();
    
    // Xử lý trường hợp không tìm thấy người dùng
    if (!currentUser || !currentUser.id) {
        return (
            <div className="p-4 bg-gray-100 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium text-center">
                Vui lòng đăng nhập để bình luận.
            </div>
        );
    }

    const currentUserId = currentUser.id;
    const membersForSection: MemberDisplayData[] = members
        .filter(member => member.employee) // Lọc bỏ member không có employee data
        .map((member) => ({
            id: member.employee.id, // Lấy từ object lồng nhau
            name: member.employee.name || "Unknown Member", // Lấy từ object lồng nhau
            avatar_url: member.employee.avatar_url || undefined, // Lấy từ object lồng nhau
        }));

    return (
        <TaskCommentSection
            taskId={taskId}
            projectId={projectId}
            currentUserId={currentUserId} // Truyền ID đã lấy được xuống client
            members={membersForSection} // Truyền mảng đã map đúng
        />
    );
}
