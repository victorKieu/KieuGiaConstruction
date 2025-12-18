// components/projects/ProjectHeaderWrapper.tsx
"use client";

import ProjectHeader from "./ProjectHeader";
import { ProjectData } from "@/types/project";
import { deleteProject } from "@/lib/action/projectActions";
import { useRouter } from "next/navigation";
import React from 'react';
interface ProjectHeaderWrapperProps {
    project: ProjectData;
    permissions: {
        canEdit: boolean;
        canDelete: boolean;
        canAddMember: boolean;
    };
}

export default function ProjectHeaderWrapper({ project, permissions }: ProjectHeaderWrapperProps) {
    const router = useRouter();

    const handleEditClick = () => {
        // Chuyển hướng đến trang chỉnh sửa (ví dụ: /projects/[id]/edit)
        router.push(`/projects/${project.id}/edit`);
    };

    const handleTaskClick = () => {
        // Chuyển hướng hoặc thay đổi tab (nếu bạn có tab công việc)
        // Hiện tại, bạn không có tab "Công việc", nên có thể chuyển hướng hoặc mở modal.
        console.log("Mở trang quản lý công việc");
        // router.push(`/tasks?project=${project.id}`); 
    };

    const handleDeleteClick = async () => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa dự án "${project.name}" không?`)) {
            return;
        }

        // Gọi Server Action
        const result = await deleteProject(project.id);

        if (result.success) {
            alert(result.message);
            router.push('/projects'); // Quay về trang danh sách dự án
        } else {
            alert(`Lỗi khi xóa dự án: ${result.error}`);
        }
    };

    return (
        <ProjectHeader
            project={project}
            permissions={permissions}
        />
    );
}