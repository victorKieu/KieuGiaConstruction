// File: components/crm/activities/activity-actions.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { completeActivityAction } from "@/lib/action/activity"; // Import hàm từ file .ts

export function CompleteActivityButton({ id }: { id: string }) {
    const [loading, setLoading] = useState(false);

    const handleComplete = async () => {
        setLoading(true);
        try {
            const result = await completeActivityAction(id);
            if (result.success) {
                toast.success("Thành công", { description: result.message });
            } else {
                toast.error("Lỗi", { description: result.error });
            }
        } catch (e) {
            toast.error("Lỗi kết nối");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1 hover:bg-green-50 hover:text-green-700 hover:border-green-200 transition-all"
            onClick={handleComplete}
            disabled={loading}
        >
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
            {loading ? "Đang xử lý..." : "Hoàn thành"}
        </Button>
    );
}