import React from "react";
import { Button } from "@/components/ui/button";

type ProjectMember = {
    employee_id: string;
    name: string;
    email: string;
    role: string;
};

type ProjectMembersProps = {
    members: ProjectMember[];
    currentUserId: string;
    onAdd: () => void;
    onRemove: (employeeId: string) => void;
    onChangeRole: (employeeId: string, role: string) => void;
    canManage: boolean;
};

export default function ProjectMembers({
    members = [],
    currentUserId,
    onAdd,
    onRemove,
    onChangeRole,
    canManage
}: ProjectMembersProps) {
    if (!Array.isArray(members)) return null;

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Thành viên dự án</h2>
                {canManage && (
                    <Button onClick={onAdd}>Thêm thành viên</Button>
                )}
            </div>
            <table className="min-w-full bg-white border">
                <thead>
                    <tr>
                        <th className="border px-2 py-1">Tên</th>
                        <th className="border px-2 py-1">Email</th>
                        <th className="border px-2 py-1">Vai trò</th>
                        {canManage && <th className="border px-2 py-1">Hành động</th>}
                    </tr>
                </thead>
                <tbody>
                    {members.map((member) => (
                        <tr key={member.employee_id}>
                            <td className="border px-2 py-1">{member.name}</td>
                            <td className="border px-2 py-1">{member.email}</td>
                            <td className="border px-2 py-1">
                                {canManage ? (
                                    <select
                                        value={member.role}
                                        onChange={e => onChangeRole(member.employee_id, e.target.value)}
                                    >
                                        <option value="member">Thành viên</option>
                                        <option value="manager">Quản lý</option>
                                    </select>
                                ) : (
                                    member.role === "manager" ? "Quản lý" : "Thành viên"
                                )}
                            </td>
                            {canManage &&
                                <td className="border px-2 py-1">
                                    {member.employee_id !== currentUserId && (
                                        <Button
                                            variant="destructive"
                                            onClick={() => onRemove(member.employee_id)}
                                        >
                                            Xoá
                                        </Button>
                                    )}
                                </td>
                            }
                        </tr>
                    ))}
                </tbody>
            </table>
            {members.length === 0 && (
                <div className="p-4 text-center text-gray-500">Chưa có thành viên</div>
            )}
        </div>
    );
}