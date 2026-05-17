"use client";

import { useState, useRef, useEffect } from "react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Save, X, Briefcase, Calculator, AlignLeft, Activity } from "lucide-react";
import { createTask, updateTask } from "@/lib/action/taskActions";
import { formatCurrency } from "@/lib/utils/utils";

export default function TaskCreateModal({
    projectId,
    members,
    dictionaries,
    open,
    onOpenChange,
    task,
    parentId,
    tasks = []
}: any) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const formRef = useRef<HTMLFormElement>(null);

    // --- STATE CHO TÍNH TOÁN EVM & TIẾN ĐỘ ---
    const [qty, setQty] = useState<number>(task?.planned_quantity || 0);
    const [priceDisplay, setPriceDisplay] = useState<string>(
        task?.planned_price ? formatCurrency(task.planned_price) : ""
    );
    // ✅ Bổ sung State riêng cho Thanh tiến độ để nó nhảy số mượt mà
    const [progress, setProgress] = useState<number>(task?.progress || 0);

    // Reset form khi mở lên (Tạo mới hoặc Sửa)
    useEffect(() => {
        if (open) {
            setQty(task?.planned_quantity || 0);
            setPriceDisplay(task?.planned_price ? formatCurrency(task.planned_price) : "");
            setProgress(task?.progress || 0);
        }
    }, [open, task]);

    // Tính toán Tự động Ngân sách Kế hoạch (PV)
    const price = Number(priceDisplay.replace(/[^0-9]/g, "")) || 0;
    const plannedCost = qty * price;

    const handleCurrencyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const rawValue = e.target.value.replace(/[^0-9]/g, "");
        if (!rawValue) { setPriceDisplay(""); return; }
        setPriceDisplay(formatCurrency(Number(rawValue)));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formRef.current) return;

        setIsSubmitting(true);
        const formData = new FormData(formRef.current);

        // Bổ sung các trường tính toán ngầm
        formData.append("planned_cost", plannedCost.toString());
        formData.append("planned_price", price.toString());

        try {
            const res = task
                ? await updateTask(task.id, projectId, formData)
                : await createTask(projectId, formData);

            if (res.success) {
                toast.success(res.message);
                onOpenChange(false);
            } else {
                toast.error(res.error);
            }
        } catch (error) {
            toast.error("Lỗi hệ thống khi lưu công việc");
        }
        setIsSubmitting(false);
    };

    const parentTask = parentId ? tasks.find((t: any) => t.id === parentId) : null;
    const inputClass = "bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-3xl p-0 overflow-hidden border-0 shadow-2xl bg-white dark:bg-slate-900">
                <div className="bg-blue-600 dark:bg-blue-900 p-6 text-white">
                    <DialogTitle className="text-xl font-bold flex items-center gap-2">
                        <Briefcase className="w-5 h-5" />
                        {task ? "Cập nhật Hạng mục / Công việc" : (parentId ? `Thêm việc con cho: ${parentTask?.name}` : "Tạo Hạng mục mới")}
                    </DialogTitle>
                    <DialogDescription className="text-blue-100 mt-1">
                        Thiết lập Kế hoạch thi công và Ngân sách cơ sở (Baseline) cho hạng mục này.
                    </DialogDescription>
                </div>

                <form ref={formRef} onSubmit={handleSubmit} className="p-6 max-h-[75vh] overflow-y-auto custom-scrollbar">
                    {/* Giữ lại ID của Cha nếu đang tạo Sub-task */}
                    <input type="hidden" name="parent_id" value={parentId || task?.parent_id || ""} />

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* ================= PHẦN 1: THÔNG TIN CHUNG ================= */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-2 flex items-center gap-2">
                                <AlignLeft className="w-4 h-4 text-blue-500" /> Thông tin cơ bản
                            </h3>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="col-span-1 space-y-1">
                                    <Label>Mã WBS</Label>
                                    <Input name="wbs_code" defaultValue={task?.wbs_code} className={inputClass} placeholder="VD: 1.1" />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <Label>Tên công việc <span className="text-red-500">*</span></Label>
                                    <Input name="name" defaultValue={task?.name} required className={inputClass} placeholder="Nhập tên hạng mục..." />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Ngày bắt đầu (Kế hoạch)</Label>
                                    <Input type="date" name="start_date" defaultValue={task?.start_date?.split('T')[0]} className={inputClass} />
                                </div>
                                <div className="space-y-1">
                                    <Label>Hạn hoàn thành</Label>
                                    <Input type="date" name="due_date" defaultValue={task?.due_date?.split('T')[0]} className={inputClass} />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label>Phụ trách</Label>
                                    <select name="assigned_to" defaultValue={task?.assignee?.id || ""} className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${inputClass}`}>
                                        <option value="">-- Chọn người phụ trách --</option>
                                        {members?.map((m: any) => (
                                            <option key={m.employee.id} value={m.employee.id}>{m.employee.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <Label>Trạng thái</Label>
                                    <select name="status_id" defaultValue={task?.status?.id || dictionaries?.statuses?.[0]?.id} className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm ${inputClass}`}>
                                        {dictionaries?.statuses?.map((s: any) => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* ================= PHẦN 2: NGÂN SÁCH (PV) & TIẾN ĐỘ ================= */}
                        <div className="space-y-4">
                            <h3 className="font-bold text-slate-800 dark:text-slate-200 border-b pb-2 flex items-center gap-2">
                                <Calculator className="w-4 h-4 text-emerald-500" /> Khối lượng & Ngân sách (PV)
                            </h3>

                            <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                                <div className="space-y-1">
                                    <Label>Đơn vị tính</Label>
                                    <Input name="unit" defaultValue={task?.unit} className="bg-white dark:bg-slate-950" placeholder="m2, m3..." />
                                </div>
                                <div className="space-y-1 col-span-2">
                                    <Label>Khối lượng Kế hoạch</Label>
                                    <Input
                                        type="number"
                                        name="planned_quantity"
                                        value={qty || ""}
                                        onChange={(e) => setQty(Number(e.target.value))}
                                        className="bg-white dark:bg-slate-950 font-mono font-bold text-blue-600"
                                    />
                                </div>

                                <div className="space-y-1 col-span-3 mt-2">
                                    <Label>Đơn giá Kế hoạch (VNĐ)</Label>
                                    <Input
                                        value={priceDisplay}
                                        onChange={handleCurrencyChange}
                                        className="bg-white dark:bg-slate-950 font-mono text-right"
                                        placeholder="0"
                                    />
                                </div>

                                <div className="space-y-1 col-span-3 mt-4 p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-100 dark:border-emerald-800/50">
                                    <Label className="text-emerald-800 dark:text-emerald-300 font-bold">Thành tiền / Ngân sách kế hoạch (PV)</Label>
                                    <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 text-right mt-1">
                                        {formatCurrency(plannedCost)} <span className="text-sm">VNĐ</span>
                                    </div>
                                </div>
                            </div>

                            {/* ✅ COMPONENT THƯỚC ĐO TIẾN ĐỘ LIVE */}
                            {task && (
                                <div className="space-y-3 mt-5 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/50 rounded-xl relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10 pointer-events-none">
                                        <Activity className="w-16 h-16 text-blue-600" />
                                    </div>
                                    <Label className="flex justify-between items-center text-slate-700 dark:text-slate-300 relative z-10">
                                        <span className="font-bold">Cập nhật Tiến độ thi công:</span>
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="number"
                                                name="progress"
                                                value={progress}
                                                onChange={(e) => setProgress(Math.min(100, Math.max(0, Number(e.target.value))))}
                                                className="w-16 h-8 text-center font-bold text-lg text-blue-600 border-blue-200 dark:border-blue-800 p-0"
                                            />
                                            <span className="font-bold text-slate-500">%</span>
                                        </div>
                                    </Label>

                                    <div className="relative pt-2 pb-2 z-10">
                                        <input
                                            type="range"
                                            min="0" max="100" step="1"
                                            value={progress}
                                            onChange={(e) => setProgress(Number(e.target.value))}
                                            className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                        />

                                        {/* Thước chia 4 mốc */}
                                        <div className="flex justify-between text-[11px] font-bold text-slate-400 mt-2 px-1">
                                            <span className="cursor-pointer hover:text-blue-600 hover:scale-110 transition-transform" onClick={() => setProgress(0)}>0</span>
                                            <span className="cursor-pointer hover:text-blue-600 hover:scale-110 transition-transform" onClick={() => setProgress(25)}>25</span>
                                            <span className="cursor-pointer hover:text-blue-600 hover:scale-110 transition-transform" onClick={() => setProgress(50)}>50</span>
                                            <span className="cursor-pointer hover:text-blue-600 hover:scale-110 transition-transform" onClick={() => setProgress(75)}>75</span>
                                            <span className="cursor-pointer hover:text-blue-600 hover:scale-110 transition-transform" onClick={() => setProgress(100)}>100</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-6 space-y-1">
                        <Label>Ghi chú / Mô tả công việc</Label>
                        <Textarea name="description" defaultValue={task?.description} className={`min-h-[80px] ${inputClass}`} placeholder="Mô tả kỹ thuật hoặc ghi chú vật tư..." />
                    </div>

                    {/* NÚT LƯU */}
                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            <X className="w-4 h-4 mr-2" /> Hủy bỏ
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white shadow-md">
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                            {task ? "Lưu thay đổi & Cập nhật tiến độ" : "Tạo công việc"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}