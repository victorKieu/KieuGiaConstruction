import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/utils";
import { MemberData } from "@/types/project";

// Hàm tiện ích để chuyển đổi vai trò thành nhãn hiển thị
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

// Component hiển thị danh sách nhân sự tham gia dự án
export default function ProjectMembersTab({ members }: { members: MemberData[] }) {
    // Chỉ lấy những thành viên có dữ liệu nhân viên hợp lệ
    const validMembers = members.filter((m) => m.employee);

    return (
        <Card className="shadow-lg border-2 border-slate-100 rounded-xl">
            <CardHeader className="bg-slate-50 border-b rounded-t-xl p-4">
                <CardTitle className="text-xl font-bold text-gray-800">Nhân sự tham gia dự án</CardTitle>
            </CardHeader>
            <CardContent className="p-6">
                {validMembers.length === 0 ? (
                    <p className="text-sm text-gray-500">Chưa có nhân sự nào được phân công.</p>
                ) : (
                    // Sử dụng Grid layout để hiển thị các thẻ thành viên
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
                        {validMembers.map((m) => {
                            const e = m.employee!;
                            return (
                                <div
                                    key={m.project_id}
                                    className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-indigo-400"
                                >
                                    {/* Khối thông tin cơ bản: Sử dụng Flexbox để chia 1/3 Avatar, 2/3 Tên/Vai trò */}
                                    <div className="flex items-start border-b p-4 space-x-4">
                                        {/* Avatar (Chiếm khoảng 1/3) */}
                                        <div className="flex-shrink-0 w-1/3">
                                            <Avatar className="h-20 w-20 mx-auto">
                                                <AvatarImage src={e.avatar_url || ""} />
                                                <AvatarFallback className="bg-indigo-500 text-white font-bold text-3xl">
                                                    {e.name?.[0]?.toUpperCase() || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>

                                        {/* Tên và Vai trò (Chiếm khoảng 2/3) */}
                                        <div className="w-2/3 pt-3">
                                            <p className="font-extrabold text-gray-900 text-lg leading-snug">
                                                {e.name || "Không rõ"}
                                            </p>
                                            <p className="text-sm text-indigo-700 font-semibold mt-1">
                                                {getRoleLabel(m.role)}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Chi tiết khác */}
                                    <div className="space-y-3 text-sm text-gray-700 p-4">
                                        <p className="flex justify-between items-center">
                                            <span className="font-medium text-gray-500">Chức vụ:</span>
                                            <span className="font-semibold text-right">{e.position || "—"}</span>
                                        </p>
                                        <p className="flex justify-between items-center">
                                            <span className="font-medium text-gray-500">Email:</span>
                                            <span className="font-semibold text-right truncate">{e.email || "—"}</span>
                                        </p>
                                        <p className="flex justify-between items-center">
                                            <span className="font-medium text-gray-500">Điện thoại:</span>
                                            <span className="font-semibold text-right truncate">{e.phone || "—"}</span>
                                        </p>
                                        <p className="flex justify-between items-center">
                                            <span className="font-medium text-gray-500">Tham gia:</span>
                                            <span className="font-semibold text-right">{formatDate(m.joined_at)}</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
