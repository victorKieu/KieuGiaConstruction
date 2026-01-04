"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Nếu chưa có badge, có thể dùng div class
import { formatDate } from "@/lib/utils/utils";
import { Trash2, Loader2, User, ShieldCheck, Briefcase } from "lucide-react";
import { removeProjectMember } from "@/lib/action/projectActions";
import { toast } from "sonner";
import AddMemberDialog from "@/components/projects/dialogs/AddMemberDialog";
import { MemberData } from "@/types/project";

interface ProjectMembersTabProps {
    members: MemberData[];
    projectId: string;

    // Props hỗ trợ chức năng Add
    allEmployees?: any[];
    roles?: any[];

    // Phân quyền
    isManager?: boolean;
    currentUserId?: string; // Để tránh tự xóa chính mình
}

// --- Helper Functions ---
function getPositionName(position: any) {
    if (!position) return "—";
    if (typeof position === 'object' && position.name) return position.name;
    return position;
}

// Hàm lấy màu badge dựa trên role code
function getRoleBadgeColor(code: string = "") {
    switch (code?.toUpperCase()) {
        case 'MANAGER': return "bg-red-100 text-red-700 border-red-200";
        case 'SUPERVISOR': return "bg-orange-100 text-orange-700 border-orange-200";
        case 'ADMIN': return "bg-purple-100 text-purple-700 border-purple-200";
        default: return "bg-blue-50 text-blue-700 border-blue-200";
    }
}

export default function ProjectMembersTab({
    members,
    projectId,
    allEmployees = [],
    roles = [],
    isManager = true,
    currentUserId = ""
}: ProjectMembersTabProps) {
    console.log("Check Quyền:", isManager)
    const [isPending, startTransition] = useTransition();

    // Lọc data rác (null)
    const validMembers = members.filter((m) => m.employee);

    // Lấy danh sách ID đã có để truyền vào Dialog (disable những người đã add)
    const existingMemberIds = validMembers.map(m => m.employee_id);

    // Xử lý xóa thành viên
    const handleRemove = (employeeId: string, memberName: string) => {
        if (!confirm(`Xác nhận xóa "${memberName}" khỏi dự án này?`)) return;

        startTransition(async () => {
            const res = await removeProjectMember(projectId, employeeId);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error);
            }
        });
    };

    return (
        <Card className="shadow-sm border border-slate-200 rounded-xl bg-white">
            <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between bg-slate-50/50 rounded-t-xl">
                <div>
                    <CardTitle className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-600" />
                        Nhân sự tham gia
                        <span className="ml-2 inline-flex items-center justify-center bg-gray-200 text-gray-700 text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px]">
                            {validMembers.length}
                        </span>
                    </CardTitle>
                    <p className="text-sm text-gray-500 mt-1">Quản lý danh sách nhân viên và phân quyền trong dự án.</p>
                </div>

                {/* Nút Thêm Thành Viên (Chỉ Manager thấy) */}
                {isManager && (
                    <AddMemberDialog
                        projectId={projectId}
                        employees={allEmployees}
                        roles={roles}
                        existingMemberIds={existingMemberIds}
                    />
                )}
            </CardHeader>

            <CardContent className="p-6 bg-slate-50/30 min-h-[300px]">
                {validMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl bg-white">
                        <User className="w-12 h-12 mb-3 opacity-20" />
                        <p>Chưa có nhân sự nào được phân công.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {validMembers.map((m) => {
                            const e = m.employee!;
                            // Fallback Avatar an toàn
                            const avatarSrc = (e as any).user_profiles?.avatar_url || e.avatar_url || "";

                            const roleName = m.role_name || "Thành viên";
                            const roleCode = m.role_code || "MEMBER";
                            const positionName = getPositionName(e.position);

                            // Logic ẩn nút xóa:
                            // 1. Không được xóa chính mình
                            // 2. Không được xóa người có role MANAGER (trừ khi Admin hệ thống - logic xử lý sau, tạm thời ẩn cho an toàn)
                            const isMe = e.id === currentUserId;
                            const isProjectManagerTarget = roleCode === 'MANAGER';
                            const canDelete = isManager && !isMe && !isProjectManagerTarget;

                            return (
                                <div
                                    key={m.project_id + "-" + m.employee_id}
                                    className="group relative bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all duration-200"
                                >
                                    {/* Nút Xóa (Absolute) */}
                                    {canDelete && (
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full"
                                                onClick={() => handleRemove(m.employee_id, e.name)}
                                                disabled={isPending}
                                                title="Xóa khỏi dự án"
                                            >
                                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <Avatar className="h-14 w-14 border-2 border-white shadow-sm ring-1 ring-gray-100">
                                            <AvatarImage
                                                src={avatarSrc}
                                                className="object-cover"
                                            />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                                                {e.name?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        {/* Thông tin chính */}
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-bold text-gray-800 truncate" title={e.name}>
                                                {e.name}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="outline" className={`px-2 py-0 h-5 text-[10px] uppercase tracking-wider font-semibold border ${getRoleBadgeColor(roleCode)}`}>
                                                    {roleName}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Thông tin chi tiết bên dưới */}
                                    <div className="mt-4 pt-3 border-t border-dashed border-gray-100 space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 text-xs font-medium uppercase">Chức vụ</span>
                                            <span className="text-gray-700 font-medium truncate max-w-[120px]" title={positionName}>
                                                {positionName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 text-xs font-medium uppercase">Tham gia</span>
                                            <span className="text-gray-600">{formatDate(m.joined_at)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-gray-400 text-xs font-medium uppercase">Email</span>
                                            <span className="text-gray-500 text-xs truncate max-w-[140px]" title={e.email}>
                                                {e.email || "—"}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Icon Role nền chìm (Optional decoration) */}
                                    {roleCode === 'MANAGER' && (
                                        <ShieldCheck className="absolute bottom-2 right-2 text-red-50 w-12 h-12 -z-0 pointer-events-none" />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}