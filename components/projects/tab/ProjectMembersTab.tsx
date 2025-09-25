import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/utils";

interface Member {
    id: string;
    employee?: {
        name?: string;
        email?: string;
        position?: string;
        avatar_url?: string;
    };
    role: string;
    joined_at: string;
}

export default function ProjectMembersTab({ members }: { members: Member[] }) {
    const validMembers = members.filter((m) => m.employee);

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Nhân sự tham gia dự án</CardTitle>
            </CardHeader>
            <CardContent>
                {validMembers.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có nhân sự nào được phân công.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-gray-100 text-left">
                                    <th className="p-2">Họ tên</th>
                                    <th className="p-2">Email</th>
                                    <th className="p-2">Chức vụ</th>
                                    <th className="p-2">Vai trò</th>
                                    <th className="p-2">Ngày tham gia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {validMembers.map((m) => {
                                    const e = m.employee!;
                                    return (
                                        <tr key={m.id} className="border-b">
                                            <td className="p-2 flex items-center gap-2">
                                                <Avatar className="h-6 w-6">
                                                    <AvatarImage src={e.avatar_url || ""} />
                                                    <AvatarFallback>{e.name?.[0] || "?"}</AvatarFallback>
                                                </Avatar>
                                                {e.name || "Không rõ"}
                                            </td>
                                            <td className="p-2">{e.email || "—"}</td>
                                            <td className="p-2">{e.position || "—"}</td>
                                            <td className="p-2">{getRoleLabel(m.role)}</td>
                                            <td className="p-2">{formatDate(m.joined_at)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function getRoleLabel(role: string) {
    switch (role) {
        case "manager":
            return "Quản lý dự án";
        case "supervisor":
            return "Giám sát";
        case "worker":
            return "Nhân viên";
        case "admin":
            return "Quản trị";
        default:
            return "Không xác định";
    }
}