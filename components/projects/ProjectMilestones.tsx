import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils/utils";

interface Milestone {
    date: string;
    title: string;
    description: string;
}

interface ProjectMilestonesProps {
    milestones: Milestone[];
}

export default function ProjectMilestones({ milestones }: ProjectMilestonesProps) {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="text-lg font-semibold">Các mốc quan trọng</CardTitle>
            </CardHeader>
            <CardContent>
                {milestones.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Chưa có mốc thời gian nào được thiết lập.</p>
                ) : (
                    <ul className="space-y-4">
                        {milestones.map((m, index) => (
                            <li key={index} className="border-l-2 border-primary pl-4 relative">
                                <div className="absolute top-0 left-[-6px] w-3 h-3 bg-primary rounded-full" />
                                <p className="text-sm font-medium">{formatDate(m.date)} — {m.title}</p>
                                <p className="text-xs text-muted-foreground">{m.description}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </CardContent>
        </Card>
    );
}