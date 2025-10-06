"use client";
import { useState } from "react";
import ProjectMembers from "./ProjectMembers";
import AddMemberDialog from "./AddMemberDialog";
import supabase from '@/lib/supabase/client';
import { MemberData } from "@/types/project";
import { Employee } from "@/types/hrm";


type ProjectMembersClientProps = {
    members?: MemberData[];
    projectId: string;
    initialMembers: MemberData[];
    employees: Employee[];
    currentUserId: string;
    isManager: boolean;
};

export default function ProjectMembersClient({
    projectId,
    initialMembers,
    members,
    currentUserId,
    isManager
}: ProjectMembersClientProps) {
    const [memberList, setMemberList] = useState<MemberData[]>(initialMembers);
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
                    members={members.filter((u) => !memberList.find((m) => m.employee_id === u.id))}
                    onAdd={handleAdd}
                    onClose={() => setShowAdd(false)}
                />
            )}
        </>
    );
}