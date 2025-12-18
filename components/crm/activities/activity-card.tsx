import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Calendar, Clock, Phone, Users, FileText } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { CompleteActivityButton } from "@/components/crm/activities/activity-actions";
import { Activity } from "@/types/crm";

// Mapping icons & colors constants
const ACTIVITY_CONFIG: Record<string, { icon: any; label: string }> = {
    call: { icon: Phone, label: "Cuộc gọi" },
    meeting: { icon: Users, label: "Cuộc họp" },
    task: { icon: Calendar, label: "Công việc" },
    email: { icon: FileText, label: "Email" },
};

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
    pending: { color: "bg-yellow-100 text-yellow-800", label: "Chờ xử lý" },
    completed: { color: "bg-green-100 text-green-800", label: "Hoàn thành" },
    cancelled: { color: "bg-red-100 text-red-800", label: "Đã hủy" },
};

export function ActivityCard({ activity }: { activity: Activity }) {
    const config = ACTIVITY_CONFIG[activity.activity_type] || { icon: Calendar, label: "Khác" };
    const ActivityIcon = config.icon;

    const status = STATUS_CONFIG[activity.status] || { color: "bg-gray-100", label: activity.status };
    const isPast = new Date(activity.scheduled_at) < new Date();

    // Xử lý an toàn dữ liệu khách hàng
    const customerName = activity.customers?.name || "Khách hàng ẩn";
    const initials = customerName.split(" ").map((n) => n[0]).join("").toUpperCase().substring(0, 2);

    return (
        <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base line-clamp-1" title={activity.title}>
                            {activity.title}
                        </CardTitle>
                    </div>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium uppercase ${status.color}`}>
                        {status.label}
                    </span>
                </div>
                <CardDescription className="text-xs flex items-center gap-1">
                    {isPast ? <Clock className="h-3 w-3 text-red-400" /> : <Calendar className="h-3 w-3" />}
                    {format(new Date(activity.scheduled_at), "p, dd/MM", { locale: vi })}
                </CardDescription>
            </CardHeader>

            <CardContent className="pb-2 flex-1">
                <div className="flex items-center gap-3 mb-3 p-2 bg-muted/20 rounded-lg">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="overflow-hidden">
                        <p className="text-sm font-medium truncate">{customerName}</p>
                        {activity.customers && (
                            <Link
                                href={`/crm/customers/${activity.customers.id}`}
                                className="text-xs text-blue-600 hover:underline block truncate"
                            >
                                Xem hồ sơ
                            </Link>
                        )}
                    </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">
                    {activity.description || "Không có mô tả chi tiết"}
                </p>
            </CardContent>

            <CardFooter className="pt-2 border-t flex justify-between items-center mt-auto">
                <span className="text-[10px] text-muted-foreground">
                    Tạo: {format(new Date(activity.created_at), "dd/MM/yy", { locale: vi })}
                </span>
                {activity.status === "pending" && <CompleteActivityButton id={activity.id} />}
            </CardFooter>
        </Card>
    );
}