"use client"; // Bắt buộc

import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { deleteRFQAction } from "@/lib/action/procurement";
import { useRouter } from "next/navigation";

export function DeleteRfqButton({ rfqId }: { rfqId: string }) {
    const router = useRouter();

    const handleDelete = async () => {
        if (!confirm("CẢNH BÁO: Bạn chắc chắn muốn hủy gói thầu này?")) return;

        const res = await deleteRFQAction(rfqId);
        if (res.success) {
            toast.success(res.message);
            router.push('/procurement/rfq');
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    return (
        <Button variant="destructive" size="sm" onClick={handleDelete}>
            Hủy gói thầu
        </Button>
    );
}