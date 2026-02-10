"use client";

import { useState, useTransition } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils/utils";
import { Trash2, Loader2, User, ShieldCheck, Briefcase } from "lucide-react";
import { removeProjectMember } from "@/lib/action/projectActions";
import { toast } from "sonner";
import AddMemberDialog from "@/components/projects/dialogs/AddMemberDialog";
import { MemberData } from "@/types/project";

interface ProjectMembersTabProps {
    members: MemberData[];
    projectId: string;
    allEmployees?: any[];
    roles?: any[];
    isManager?: boolean;
    currentUserId?: string;
}

function getPositionName(position: any) {
    if (!position) return "—";
    if (typeof position === 'object' && position.name) return position.name;
    return position;
}

// ✅ FIX: Cập nhật màu Badge cho Dark Mode
function getRoleBadgeColor(code: string = "") {
    switch (code?.toUpperCase()) {
        case 'MANAGER': return "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
        case 'SUPERVISOR': return "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800";
        case 'ADMIN': return "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800";
        default: return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
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
    const [isPending, startTransition] = useTransition();

    const validMembers = members.filter((m) => m.employee);
    const existingMemberIds = validMembers.map(m => m.employee_id);

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
        // ✅ FIX: bg-white -> bg-card, border-slate-200 -> border-border
        <Card className="shadow-sm border border-border rounded-xl bg-card">
            {/* ✅ FIX: bg-slate-50/50 -> bg-muted/50 */}
            <CardHeader className="border-b border-border px-6 py-4 flex flex-row items-center justify-between bg-muted/50 rounded-t-xl">
                <div>
                    {/* ✅ FIX: text-gray-800 -> text-foreground */}
                    <CardTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                        <Briefcase className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                        Nhân sự tham gia
                        {/* ✅ FIX: Badge counter colors */}
                        <span className="ml-2 inline-flex items-center justify-center bg-muted text-muted-foreground text-xs font-bold px-2 py-0.5 rounded-full min-w-[24px]">
                            {validMembers.length}
                        </span>
                    </CardTitle>
                    {/* ✅ FIX: text-gray-500 -> text-muted-foreground */}
                    <p className="text-sm text-muted-foreground mt-1">Quản lý danh sách nhân viên và phân quyền trong dự án.</p>
                </div>

                {isManager && (
                    <AddMemberDialog
                        projectId={projectId}
                        employees={allEmployees}
                        roles={roles}
                        existingMemberIds={existingMemberIds}
                    />
                )}
            </CardHeader>

            {/* ✅ FIX: bg-slate-50/30 -> bg-muted/20 */}
            <CardContent className="p-6 bg-muted/20 min-h-[300px]">
                {validMembers.length === 0 ? (
                    // ✅ FIX: Empty state colors
                    <div className="flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed border-border rounded-xl bg-card">
                        <User className="w-12 h-12 mb-3 opacity-20" />
                        <p>Chưa có nhân sự nào được phân công.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-4">
                        {validMembers.map((m) => {
                            const e = m.employee!;
                            const avatarSrc = (e as any).user_profiles?.avatar_url || e.avatar_url || "";
                            const roleName = m.role_name || "Thành viên";
                            const roleCode = m.role_code || "MEMBER";
                            const positionName = getPositionName(e.position);

                            const isMe = e.id === currentUserId;
                            const isProjectManagerTarget = roleCode === 'MANAGER';
                            const canDelete = isManager && !isMe && !isProjectManagerTarget;

                            return (
                                <div
                                    key={m.project_id + "-" + m.employee_id}
                                    // ✅ FIX: Card item style (bg-card, border-border, hover colors)
                                    className="group relative bg-card border border-border rounded-xl p-4 shadow-sm hover:shadow-md hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-200"
                                >
                                    {canDelete && (
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                // ✅ FIX: Button hover colors
                                                className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full"
                                                onClick={() => handleRemove(m.employee_id, e.name)}
                                                disabled={isPending}
                                                title="Xóa khỏi dự án"
                                            >
                                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 size={16} />}
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex items-center gap-4">
                                        {/* Avatar - ✅ FIX: border colors */}
                                        <Avatar className="h-14 w-14 border-2 border-background shadow-sm ring-1 ring-border">
                                            <AvatarImage src={avatarSrc} className="object-cover" />
                                            <AvatarFallback className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-lg">
                                                {e.name?.[0]?.toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>

                                        <div className="flex-1 min-w-0">
                                            {/* ✅ FIX: text-gray-800 -> text-foreground */}
                                            <h4 className="font-bold text-foreground truncate" title={e.name}>
                                                {e.name}
                                            </h4>
                                            <div className="flex items-center gap-2 mt-1">
                                                {/* ✅ FIX: Badge colors using helper function */}
                                                <Badge variant="outline" className={`px-2 py-0 h-5 text-[10px] uppercase tracking-wider font-semibold border ${getRoleBadgeColor(roleCode)}`}>
                                                    {roleName}
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    {/* ✅ FIX: Border colors & Text colors */}
                                    <div className="mt-4 pt-3 border-t border-dashed border-border space-y-2">
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground text-xs font-medium uppercase">Chức vụ</span>
                                            <span className="text-foreground font-medium truncate max-w-[120px]" title={positionName}>
                                                {positionName}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground text-xs font-medium uppercase">Tham gia</span>
                                            <span className="text-foreground/80">{formatDate(m.joined_at)}</span>
                                        </div>
                                        <div className="flex justify-between items-center text-sm">
                                            <span className="text-muted-foreground text-xs font-medium uppercase">Email</span>
                                            <span className="text-muted-foreground text-xs truncate max-w-[140px]" title={e.email}>
                                                {e.email || "—"}
                                            </span>
                                        </div>
                                    </div>

                                    {roleCode === 'MANAGER' && (
                                        // ✅ FIX: Icon chìm opacity thấp hơn ở dark mode
                                        <ShieldCheck className="absolute bottom-2 right-2 text-red-50 dark:text-red-900/10 w-12 h-12 -z-0 pointer-events-none" />
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