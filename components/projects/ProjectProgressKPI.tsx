import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface ProjectProgressKPIProps {
    project: {
        progress: number | null;
        planned_progress?: number | null;
        risk_level: string | null;
    };
}

export default function ProjectProgressKPI({ project }: ProjectProgressKPIProps) {
    const actual = project.progress || 0;
    const planned = project.planned_progress || 0;
    const deviation = actual - planned;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Tiến độ & KPI</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <p className="text-sm font-medium">Tiến độ thực tế</p>
                    <Progress value={actual} />
                    <p className="text-xs text-muted-foreground">{actual}% hoàn thành</p>
                </div>

                <div>
                    <p className="text-sm font-medium">Tiến độ kế hoạch</p>
                    <Progress value={planned} color="secondary" />
                    <p className="text-xs text-muted-foreground">{planned}% theo kế hoạch</p>
                </div>

                <div className="flex items-center gap-4">
                    <div>
                        <p className="text-sm font-medium">KPI chênh lệch</p>
                        <Badge variant={deviation < 0 ? "destructive" : "outline"}>
                            {deviation >= 0 ? `+${deviation}%` : `${deviation}%`}
                        </Badge>
                    </div>
                    <div>
                        <p className="text-sm font-medium">Rủi ro</p>
                        {getRiskBadge(project.risk_level)}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

function getRiskBadge(risk: string | null) {
    switch (risk) {
        case "low":
            return <Badge className="bg-blue-500">Thấp</Badge>;
        case "medium":
            return <Badge className="bg-yellow-500">Trung bình</Badge>;
        case "high":
            return <Badge className="bg-orange-500">Cao</Badge>;
        case "critical":
            return <Badge className="bg-red-500">Nguy cấp</Badge>;
        default:
            return <Badge className="bg-gray-500">Không xác định</Badge>;
    }
}