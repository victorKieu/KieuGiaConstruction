"use client";

import { useState } from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea"; // Nhớ import Textarea
import { Label } from "@/components/ui/label";
import { XCircle, AlertOctagon } from "lucide-react"; // Icon hủy
import { cancelProject } from "@/lib/action/workflowActions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Props {
    project: {
        id: string;
        name: string;
    };
    trigger?: React.ReactNode; // Để tùy biến nút kích hoạt (nằm trong dropdown hay ở ngoài)
}

export default function CancelProjectDialog({ project, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        formData.append("project_id", project.id);

        const result = await cancelProject(formData);

        setLoading(false);
        if (result.success) {
            toast.success(result.message);
            setOpen(false);
            router.refresh();
        } else {
            toast.error(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="destructive">
                        <XCircle className="w-4 h-4 mr-2" /> Hủy Dự Án
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-red-600">
                        <AlertOctagon className="w-6 h-6" />
                        Xác nhận Hủy Dự Án
                    </DialogTitle>
                    <DialogDescription>
                        Bạn đang thao tác hủy dự án <b>"{project.name}"</b>.
                        Hành động này sẽ dừng mọi tiến trình và chuyển dự án sang trạng thái "Đã hủy".
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label htmlFor="reason">Lý do hủy bỏ (Bắt buộc)</Label>
                        <Textarea
                            id="reason"
                            name="reason"
                            placeholder="VD: Chủ đầu tư dừng vốn, Không thống nhất được báo giá..."
                            required
                            className="min-h-[100px]"
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Quay lại</Button>
                        <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                            {loading ? "Đang xử lý..." : "Xác nhận Hủy"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}