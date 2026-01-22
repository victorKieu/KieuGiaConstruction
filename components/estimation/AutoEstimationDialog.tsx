"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Cần cài checkbox của shadcn
import { Label } from "@/components/ui/label";
import { Wand2, Loader2, CheckCircle2 } from "lucide-react"; // Icon cây đũa thần
import { toast } from "sonner";
import { CONSTRUCTION_MACROS } from "@/lib/constants/estimation-macros";
import { createEstimationFromMacro } from "@/lib/action/estimationActions";

export default function AutoEstimationDialog({ projectId }: { projectId: string }) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [selectedMacroId, setSelectedMacroId] = useState<string>("");

    // Tìm Macro đang chọn
    const selectedMacro = CONSTRUCTION_MACROS.find(m => m.id === selectedMacroId);

    const handleExecute = async () => {
        if (!selectedMacro) return;
        setLoading(true);

        const res = await createEstimationFromMacro(projectId, selectedMacro.work_items);

        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            setOpen(false);
            setSelectedMacroId(""); // Reset
        } else {
            toast.error("Lỗi: " + res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="gap-2 bg-purple-600 hover:bg-purple-700 text-white">
                    <Wand2 className="w-4 h-4" /> Lập dự toán tự động
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Wand2 className="w-5 h-5 text-purple-600" /> Tự động chọn công tác
                    </DialogTitle>
                    <DialogDescription>
                        Chọn hạng mục thi công lớn, phần mềm sẽ tự động đề xuất các đầu việc cần thiết theo quy chuẩn.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-2">
                        <Label>Chọn hạng mục / Cấu kiện mẫu</Label>
                        <Select value={selectedMacroId} onValueChange={setSelectedMacroId}>
                            <SelectTrigger>
                                <SelectValue placeholder="-- Chọn hạng mục (VD: Móng, Cột...) --" />
                            </SelectTrigger>
                            <SelectContent>
                                {CONSTRUCTION_MACROS.map(macro => (
                                    <SelectItem key={macro.id} value={macro.id}>
                                        {macro.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Hiển thị danh sách công việc con sẽ được thêm */}
                    {selectedMacro && (
                        <div className="bg-slate-50 p-4 rounded-md border border-slate-200">
                            <h4 className="text-sm font-semibold mb-2 text-slate-700">Các công tác sẽ được thêm:</h4>
                            <ul className="space-y-2">
                                {selectedMacro.work_items.map((item, idx) => (
                                    <li key={idx} className="text-sm flex items-start gap-2 text-slate-600">
                                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                                        <span>
                                            <span className="font-medium text-slate-900">{item.code}</span> - {item.name}
                                            <span className="text-xs text-slate-400 ml-1">({item.unit})</span>
                                        </span>
                                    </li>
                                ))}
                            </ul>
                            <p className="text-xs text-slate-500 mt-3 italic">
                                * Khối lượng sẽ để trống (0) để bạn nhập chi tiết sau.
                            </p>
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)}>Hủy</Button>
                    <Button
                        onClick={handleExecute}
                        disabled={loading || !selectedMacro}
                        className="bg-purple-600 hover:bg-purple-700"
                    >
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Thêm vào Dự toán
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}