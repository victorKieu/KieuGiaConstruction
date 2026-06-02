"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Briefcase, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalProjectShortcut() {
    const [shortcut, setShortcut] = useState<{ id: string, name: string } | null>(null);
    const router = useRouter();

    const loadShortcut = () => {
        const stored = localStorage.getItem("project_shortcut");
        if (stored) setShortcut(JSON.parse(stored));
        else setShortcut(null);
    };

    useEffect(() => {
        // Load ngay lần đầu tiên
        loadShortcut();
        // Lắng nghe sự kiện bật/tắt từ các trang khác
        window.addEventListener("project_shortcut_changed", loadShortcut);
        return () => window.removeEventListener("project_shortcut_changed", loadShortcut);
    }, []);

    if (!shortcut) return null;

    return (
        <div className="fixed bottom-8 right-8 z-[9999] flex flex-col items-center gap-2 group animate-in slide-in-from-bottom-5">
            <Button
                onClick={() => router.push(`/projects/${shortcut.id}`)}
                className="h-14 w-14 rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-2xl shadow-blue-500/50 flex items-center justify-center p-0 transition-transform hover:scale-110 border-4 border-white dark:border-slate-800"
                title={`Quay lại: ${shortcut.name}`}
            >
                <Briefcase className="h-6 w-6" />
            </Button>
            <span className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded whitespace-nowrap shadow-lg">
                Dự án: {shortcut.name}
            </span>
        </div>
    );
}