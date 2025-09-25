"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ProjectTabs({ projectId }: { projectId: string }) {
    const pathname = usePathname();
    const tabs = [
        { label: "Thông tin", path: `/projects/${projectId}` },
        { label: "Thành viên", path: `/projects/${projectId}/members` },
        { label: "Nhân sự", path: `/projects/${projectId}/staff` },        // <-- Thêm dòng này
        { label: "Nhật ký", path: `/projects/${projectId}/logs` },
        { label: "Tài liệu", path: `/projects/${projectId}/docs` },
        // ... các tab khác
    ];
    return (
        <div className="flex gap-1 border-b mb-4">
            {tabs.map(tab => (
                <Link
                    key={tab.path}
                    href={tab.path}
                    className={`px-4 py-2 border-b-2 ${pathname === tab.path
                            ? "border-blue-600 font-bold text-blue-600"
                            : "border-transparent text-gray-600 hover:text-blue-600"
                        }`}
                >
                    {tab.label}
                </Link>
            ))}
        </div>
    );
}