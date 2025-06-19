"use client";
import { useState } from "react";
import ProjectMembers from "./ProjectMembers";
import AddMemberDialog from "./AddMemberDialog";
import supabase from '@/lib/supabase/client';

type ProjectMember = {
    employee_id: string;
    name: string;
    email: string;
    role: string;
};

type Employee = {
    id: string;
    name: string;
    email: string;
};

type ProjectMembersClientProps = {
    members?: ProjectMember[]; // Có thể bỏ nếu không dùng
    projectId: string;
    initialMembers: ProjectMember[];
    employees: Employee[];      // Đổi từ users => employees
    currentUserId: string;
    isManager: boolean;
};

export default function ProjectMembersClient({
    projectId,
    initialMembers,
    users,
    currentUserId,
    isManager
}: ProjectMembersClientProps) {
    const [memberList, setMemberList] = useState<ProjectMember[]>(initialMembers);
    const [showAdd, setShowAdd] = useState(false);

    // Lấy lại danh sách thành viên
    const fetchMembers = async () => {
        const { data } = await supabase
            .from("project_members")
            .select("employee_id, role, employees(name, email)")
            .eq("project_id", projectId);

        setMemberList(
            (data || []).map((m: any) => ({
                employee_id: m.employee_id,
                name: m.employees?.name ?? "",
                email: m.employees?.email ?? "",
                role: m.role,
            }))
        );
    };

    // Thêm thành viên
    const handleAdd = async (employeeId: string, role: string) => {
        await supabase.from("project_members").insert({ project_id: projectId, employee_id: employeeId, role });
        setShowAdd(false);
        fetchMembers();
    };

    // Xoá thành viên
    const handleRemove = async (employeeId: string) => {
        await supabase.from("project_members").delete().eq("project_id", projectId).eq("employee_id", employeeId);
        fetchMembers();
    };

    // Đổi vai trò
    const handleChangeRole = async (employeeId: string, role: string) => {
        await supabase
            .from("project_members")
            .update({ role })
            .eq("project_id", projectId)
            .eq("employee_id", employeeId);
        fetchMembers();
    };

    return (
        <>
            <ProjectMembers
                members={memberList}
                currentUserId={currentUserId}
                onAdd={() => setShowAdd(true)}
                onRemove={handleRemove}
                onChangeRole={handleChangeRole}
                canManage={isManager}
            />
            {showAdd && (
                <AddMemberDialog
                    users={users.filter((u) => !memberList.find((m) => m.employee_id === u.id))}
                    onAdd={handleAdd}
                    onClose={() => setShowAdd(false)}
                />
            )}
        </>
    );
}