import { ReactNode } from 'react';

interface StatCardProps {
    icon: ReactNode;
    title: string;
    value: string | ReactNode;
}

export default function StatCard({ icon, title, value }: StatCardProps) {
    return (
        <div className="bg-white p-4 rounded-lg shadow flex items-start gap-4">
            <div className="bg-gray-100 p-3 rounded-lg text-gray-600">
                {icon}
            </div>
            <div>
                <div className="text-sm text-gray-500">{title}</div>
                <div className="text-base font-semibold text-gray-800">{value}</div>
            </div>
        </div>
    );
}