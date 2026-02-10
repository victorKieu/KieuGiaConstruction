import { ReactNode } from 'react';

interface StatCardProps {
    icon: ReactNode;
    title: string;
    value: string | ReactNode;
}

export default function StatCard({ icon, title, value }: StatCardProps) {
    return (
        // ✅ FIX: bg-white -> bg-card, text colors
        <div className="bg-card text-card-foreground p-4 rounded-lg shadow flex items-start gap-4 border border-border">
            {/* ✅ FIX: bg-gray-100 -> bg-muted */}
            <div className="bg-muted p-3 rounded-lg text-muted-foreground">
                {icon}
            </div>
            <div>
                {/* ✅ FIX: text colors */}
                <div className="text-sm text-muted-foreground">{title}</div>
                <div className="text-base font-semibold text-foreground">{value}</div>
            </div>
        </div>
    );
}