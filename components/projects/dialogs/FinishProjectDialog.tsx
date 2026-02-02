"use client";

import { useState } from "react";
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Medal, CalendarCheck } from "lucide-react";
import { finishConstructionPhase } from "@/lib/action/workflowActions";
import { toast } from "sonner";

interface Props {
    project: {
        id: string;
        name: string;
        end_date: string; // Ngày kết thúc kế hoạch
    };
}

export default function FinishProjectDialog({ project }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (formData: FormData) => {
        setLoading(true);
        formData.append("project_id", project.id);

        const result = await finishConstructionPhase(formData);

        setLoading(false);
        if (result.success) {
            toast.success(result.message);
            setOpen(false);
        } else {
            toast.error(result.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-green-600 hover:bg-green-700 text-white font-bold shadow-md">
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Nghiệm thu & Bàn giao
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl text-slate-800">
                        <Medal className="w-6 h-6 text-green-600" />
                        Xác nhận Hoàn thành Dự án
                    </DialogTitle>
                    <DialogDescription>
                        Thao tác này sẽ chốt sổ dự án, cập nhật tiến độ 100% và chuyển sang giai đoạn <b>Bảo hành</b>.
                    </DialogDescription>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-5 py-2">
                    <div className="bg-green-50 p-3 rounded-md border border-green-200 text-sm text-green-800">
                        Bạn đang thực hiện bàn giao dự án: <span className="font-bold">{project.name}</span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="end_date" className="font-semibold text-slate-700">Ngày Nghiệm thu / Bàn giao thực tế</Label>
                        <div className="relative">
                            <CalendarCheck className="absolute left-3 top-2.5 h-4 w-4 text-gray-500" />
                            <Input
                                type="date"
                                id="end_date"
                                name="end_date"
                                required
                                defaultValue={new Date().toISOString().split('T')[0]}
                                className="pl-9 font-medium"
                            />
                        </div>
                        <p className="text-xs text-slate-500">Ngày này sẽ được dùng để tính toán thời gian bảo hành.</p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="doc_code">Số Biên bản Nghiệm thu</Label>
                        <Input
                            id="doc_code"
                            name="doc_code"
                            placeholder={`BBNT-${project.id.substring(0, 4).toUpperCase()}`}
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700 text-white">
                            {loading ? "Đang xử lý..." : "Xác nhận Bàn giao"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}