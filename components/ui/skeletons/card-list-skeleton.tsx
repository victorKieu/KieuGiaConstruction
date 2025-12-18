import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";

interface CardListSkeletonProps {
    count?: number;
    headerHeight?: string;
    contentHeight?: string;
}

export function CardListSkeleton({
    count = 3,
    headerHeight = "h-16",
    contentHeight = "h-24"
}: CardListSkeletonProps) {
    return (
        <div className="space-y-4">
            {Array(count).fill(0).map((_, i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader className={`${headerHeight} bg-muted/20`} />
                    <CardContent className={`${contentHeight} bg-muted/10`} />
                    <CardFooter className="h-12 bg-muted/20" />
                </Card>
            ))}
        </div>
    );
}