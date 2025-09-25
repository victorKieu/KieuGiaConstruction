import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/utils";

interface Milestone {
    id: string;
    name: string;
    due_date: string;
    status: string;
    delay_percent?: number;
}

export default function ProjectMilestoneTab({ milestones }: { milestones: Milestone[] }) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Các mốc tiến độ</CardTitle>
            </CardHeader>
            <CardContent>
                {milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có mốc tiến độ nào được thiết lập.</p>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                            <thead>
                                <tr className="bg-muted text-left">
                                    <th className="p-2">Tên mốc</th>
                                    <th className="p-2">Ngày hoàn thành</th>
                                    <th className="p-2">Trạng thái</th>
                                    <th className="p-2">Chậm tiến độ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {milestones.map((m) => (
                                    <tr key={m.id} className="border-b">
                                        <td className="p-2">{m.name}</td>
                                        <td className="p-2">{formatDate(m.due_date)}</td>
                                        <td className="p-2">
                                            <span
                                                className={`px-2 py-1 rounded text-xs font-medium ${m.status === "completed"
                                                        ? "bg-green-100 text-green-700"
                                                        : m.status === "in_progress"
                                                            ? "bg-yellow-100 text-yellow-700"
                                                            : "bg-gray-100 text-gray-700"
                                                    }`}
                                            >
                                                {getStatusLabel(m.status)}
                                            </span>
                                        </td>
                                        <td className="p-2">
                                            {m.delay_percent !== undefined ? `${m.delay_percent > 0 ? "+" : ""}${m.delay_percent}%` : "—"}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

function getStatusLabel(status: string) {
    switch (status) {
        case "completed":
            return "Hoàn thành";
        case "in_progress":
            return "Đang thực hiện";
        case "pending":
            return "Chưa bắt đầu";
        default:
            return "Không xác định";
    }
}