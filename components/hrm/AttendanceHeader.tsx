"use client";

import { useState } from "react";
import { Camera, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import FaceIDCheckIn from "./FaceIDCheckIn";

interface AttendanceHeaderProps {
    projectId: string;
    supervisorId?: string;
}

export default function AttendanceHeader({ projectId, supervisorId }: AttendanceHeaderProps) {
    const [open, setOpen] = useState(false);

    return (
        <div className="flex items-center justify-between">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-800">Quản lý Chấm công</h2>
                <p className="text-muted-foreground">Theo dõi và ghi nhận công nhật cho nhân sự tại công trường.</p>
            </div>

            <div className="flex gap-3">
                {/* NÚT KÍCH HOẠT QUÉT FACE ID */}
                <Dialog open={open} onOpenChange={setOpen}>
                    <DialogTrigger asChild>
                        <Button className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md">
                            <Camera className="mr-2 h-4 w-4" />
                            Chấm công Face ID
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[480px] p-0 overflow-hidden bg-slate-900 border-slate-800">
                        <DialogHeader className="p-6 pb-0">
                            <DialogTitle className="text-white flex items-center gap-2 text-xl">
                                <Camera className="h-5 w-5 text-indigo-400" />
                                Quét khuôn mặt nhân công
                            </DialogTitle>
                            <p className="text-slate-400 text-sm">
                                Đưa khuôn mặt vào khung hình để tự động nhận diện và chấm công.
                            </p>
                        </DialogHeader>

                        <div className="p-6">
                            {/* GỌI COMPONENT AI ĐÃ VIẾT Ở BƯỚC TRƯỚC */}
                            <FaceIDCheckIn
                                projectId={projectId}
                                supervisorId={supervisorId}
                            />
                        </div>
                    </DialogContent>
                </Dialog>

                <Button variant="outline">
                    <Users className="mr-2 h-4 w-4" />
                    Xuất báo cáo
                </Button>
            </div>
        </div>
    );
}