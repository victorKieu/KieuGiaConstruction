// components/tasks/TaskCommentWrapper.tsx
import { getCurrentUser } from "@/lib/action/authActions";
import TaskCommentSection from "./TaskCommentSection";
import { MemberData } from "@/types/project";

// Giả định MemberDisplayData mà Client Component TaskCommentSection mong đợi
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
            // ✅ FIX: Colors for dark mode
            <div className="p-4 bg-muted border border-border text-muted-foreground rounded-xl text-sm font-medium text-center">
                Vui lòng đăng nhập để bình luận.
            </div>
        );
    }

    const currentUserId = currentUser.id;

    // ✅ FIX LỖI TS18048: Thêm dấu chấm than (!) sau member.employee
    const membersForSection: MemberDisplayData[] = members
        .filter(member => member.employee) // Bước này đã đảm bảo employee tồn tại
        .map((member) => ({
            id: member.employee!.id, // Thêm ! để khẳng định không undefined
            name: member.employee!.name || "Unknown Member", // Thêm !
            avatar_url: member.employee!.avatar_url || undefined, // Thêm !
        }));

    return (
        <TaskCommentSection
            taskId={taskId}
            projectId={projectId}
            currentUserId={currentUserId}
            members={membersForSection}
        />
    );
}