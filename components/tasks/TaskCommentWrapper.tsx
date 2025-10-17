// components/tasks/TaskCommentWrapper.tsx
// PHẢI LÀ SERVER COMPONENT
import { getCurrentUser } from "@/lib/action/authActions";
import TaskCommentSection from "./TaskCommentSection";
import { MemberData } from "@/types/project";

// Giả định MemberDisplayData mà Client Component TaskCommentSection mong đợi
// (Cấu trúc này phải khớp với props của TaskCommentSection)
interface MemberDisplayData {
    id: string; // Tên thuộc tính phải là 'id'
    name: string; // Tên thuộc tính phải là 'name'
    avatar_url?: string;
}

interface TaskCommentWrapperProps {
    taskId: string;
    projectId: string;
    members: MemberData[];
    currentUserId: string;
}

export default async function TaskCommentWrapper({ taskId, projectId, members }: TaskCommentWrapperProps) {
    // Lấy thông tin người dùng an toàn trên Server
    const currentUser = await getCurrentUser();
    
    // Xử lý trường hợp không tìm thấy người dùng
    if (!currentUser || !currentUser.id) {
        // ✅ CẬP NHẬT: Hiển thị thông báo "Vui lòng đăng nhập để bình luận."
        return (
            <div className="p-4 bg-gray-100 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium text-center">
                Vui lòng đăng nhập để bình luận.
            </div>
        );
    }

    const currentUserId = currentUser.id;

    // ✅ KHẮC PHỤC LỖI TS2322: Ánh xạ MemberData sang MemberDisplayData
    // (Giả định MemberData có các trường user_id và full_name)
    const membersForSection: MemberDisplayData[] = members.map((member: any) => ({
        // Lấy ID thật của thành viên
        id: member.user_id || member.id,
        // Lấy tên hiển thị
        name: member.name || member.name || "Unknown Member",
        // Lấy avatar (nếu có)
        avatar_url: member.profile_avatar_url || undefined,
    }));

    return (
        // ✅ TRUYỀN currentUserId và membersForSection đã được ánh xạ xuống Client Component
        <TaskCommentSection
            taskId={taskId}
            projectId={projectId}
            currentUserId={currentUserId}
            members={membersForSection}
        />
    );
}
