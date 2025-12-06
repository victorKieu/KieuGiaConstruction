import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/utils";
import { MemberData } from "@/types/project";

// --- PHẦN FIX: Hàm Logic Chuyển Ngữ (UUID -> Name -> Vietnamese Label) ---
function getDisplayRole(member: MemberData) {
    // 1. Ưu tiên lấy tên role từ bảng liên kết (project_role)
    // 2. Nếu không có, fallback về cột 'role' cũ
    const rawRoleName = member.project_role?.name || member.role || "";

    // 3. Chuẩn hóa chuỗi để so sánh (lowercase)
    const normalized = rawRoleName.toLowerCase().trim();

    // 4. Logic chuyển ngữ (Mapping)
    if (normalized.includes("manager") || normalized.includes("quản lý")) {
        return "Quản lý dự án";
    }
    if (normalized.includes("supervisor") || normalized.includes("giám sát")) {
        return "Giám sát";
    }
    if (normalized.includes("admin") || normalized.includes("quản trị")) {
        return "Quản trị viên";
    }
    if (normalized.includes("worker") || normalized.includes("nhân viên")) {
        return "Nhân viên";
    }
    if (normalized.includes("member") || normalized.includes("thành viên")) {
        return "Thành viên";
    }

    // 5. Nếu không khớp từ khóa nào, trả về tên gốc (Viết hoa chữ cái đầu)
    return rawRoleName.charAt(0).toUpperCase() + rawRoleName.slice(1) || "Thành viên";
}
// --- KẾT THÚC FIX ---

export default function ProjectMembersTab({ members }: { members: MemberData[] }) {
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mt-4">
                        {validMembers.map((m) => {
                            const e = m.employee!;
                            return (
                                <div
                                    key={m.project_id + e.id} // Key duy nhất
                                    className="bg-white border border-gray-200 rounded-xl shadow-md overflow-hidden transition-all hover:shadow-lg hover:border-indigo-400"
                                >
                                    <div className="flex items-start border-b p-4 space-x-4">
                                        <div className="flex-shrink-0 w-1/3">
                                            <Avatar className="h-20 w-20 mx-auto">
                                                <AvatarImage src={e.avatar_url || ""} />
                                                <AvatarFallback className="bg-indigo-500 text-white font-bold text-3xl">
                                                    {e.name?.[0]?.toUpperCase() || "?"}
                                                </AvatarFallback>
                                            </Avatar>
                                        </div>

                                        <div className="w-2/3 pt-3">
                                            <p className="font-extrabold text-gray-900 text-lg leading-snug truncate" title={e.name}>
                                                {e.name || "Không rõ"}
                                            </p>
                                            {/* --- Dùng hàm hiển thị mới --- */}
                                            <p className="text-sm text-indigo-700 font-semibold mt-1">
                                                {getDisplayRole(m)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 text-sm text-gray-700 p-4">
                                        <p className="flex justify-between items-center">
                                            <span className="font-medium text-gray-500">Chức vụ:</span>
                                            <span className="font-semibold text-right truncate max-w-[120px]" title={e.position}>{e.position || "—"}</span>
                                        </p>
                                        <p className="flex justify-between items-center">
                                            <span className="font-medium text-gray-500">Email:</span>
                                            <span className="font-semibold text-right truncate max-w-[120px]" title={e.email}>{e.email || "—"}</span>
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