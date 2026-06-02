"use client";

import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Pin } from "lucide-react";
import { toast } from "sonner";

export default function ProjectShortcutToggle({ projectId, projectName }: { projectId: string, projectName: string }) {
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem("project_shortcut");
        if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed.id === projectId) setIsActive(true);
        }
    }, [projectId]);

    const handleToggle = (checked: boolean) => {
        setIsActive(checked);
        if (checked) {
            localStorage.setItem("project_shortcut", JSON.stringify({ id: projectId, name: projectName }));
            toast.success("Đã ghim phím tắt! Bạn có thể truy cập nhanh dự án từ mọi nơi.");
        } else {
            localStorage.removeItem("project_shortcut");
            toast.info("Đã tắt phím tắt ảo.");
        }
        window.dispatchEvent(new Event("project_shortcut_changed"));
    };

    return (
        <div className="flex items-center gap-1.5 px-3 h-9 rounded-md border border-slate-200 dark:border-slate-800 bg-[#0f172a] text-slate-300 shadow-sm transition-colors">
            <Pin className={`w-3.5 h-3.5 ${isActive ? "text-blue-400" : "text-slate-500"}`} />
            <span className="text-xs font-semibold select-none">
                Phím tắt ảo (Shortcut)
            </span>
            <Switch
                checked={isActive}
                onCheckedChange={handleToggle}
                className="ml-1 scale-[0.7] data-[state=checked]:bg-blue-600"
            />
        </div>
    );
}