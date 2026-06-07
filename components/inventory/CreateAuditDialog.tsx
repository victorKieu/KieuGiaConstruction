"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { CirclePlus, Loader2, Users } from "lucide-react";
import { toast } from "sonner";
import { createAuditCycleAction, getEmployeesForAudit } from "@/lib/action/inventory";
import { useRouter } from "next/navigation";

export function CreateAuditDialog({ warehouseId }: { warehouseId: string }) {
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [employees, setEmployees] = useState<any[]>([]);
    const [form, setForm] = useState({ name: "", start_date: "", end_date: "", notes: "" });
    const [selectedEmpIds, setSelectedEmpIds] = useState<string[]>([]);

    // Load danh sách nhân viên khi mở dialog
    useEffect(() => {
        if (open) {
            getEmployeesForAudit().then(data => {
                // Kiểm tra nếu data có cấu trúc lạ thì map lại
                const sanitizedData = Array.isArray(data) ? data : [];
                console.log("Danh sách nhân viên sau xử lý:", sanitizedData);
                setEmployees(sanitizedData);
            });
        }
    }, [open]);

    const handleSubmit = async () => {
        if (!form.name || !form.start_date) return toast.error("Vui lòng nhập tên kỳ và ngày bắt đầu");

        setLoading(true);
        // Map ID sang thông tin chi tiết để lưu vào JSONB
        const participants = employees.filter(e => selectedEmpIds.includes(e.id));

        const res = await createAuditCycleAction({
            ...form,
            warehouse_id: warehouseId,
            participants: participants
        });

        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            setOpen(false);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
                    <CirclePlus className="w-4 h-4 mr-2" /> Tạo kỳ kiểm kê mới
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl" onInteractOutside={(e) => e.preventDefault()}>
                <DialogHeader>
                    <DialogTitle>Khởi tạo Kỳ Kiểm Kê</DialogTitle>
                    <DialogDescription>
                        Thiết lập tên kỳ kiểm kê và phân bổ ban bệ để bắt đầu quy trình đối soát kho.
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2 col-span-2"><Label>Tên kỳ kiểm kê</Label><Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="VD: Kiểm kê quý 2/2026" /></div>
                        <div className="space-y-2"><Label>Ngày bắt đầu</Label><Input type="date" onChange={e => setForm({ ...form, start_date: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Ngày kết thúc dự kiến</Label><Input type="date" onChange={e => setForm({ ...form, end_date: e.target.value })} /></div>
                    </div>

                    <div className="space-y-2">
                        <Label className="flex items-center gap-2"><Users className="w-4 h-4" /> Chọn ban kiểm kê</Label>
                        <div className="border rounded-md p-3 h-40 overflow-y-auto space-y-2 bg-slate-50 dark:bg-slate-900 relative">
                            {employees.map(emp => (
                                <div
                                    key={emp.id}
                                    className="flex items-center space-x-2 py-1 px-2 hover:bg-indigo-100 dark:hover:bg-indigo-900/30 rounded cursor-pointer transition-colors"
                                    onClick={() => {
                                        setSelectedEmpIds(prev =>
                                            prev.includes(emp.id) ? prev.filter(id => id !== emp.id) : [...prev, emp.id]
                                        );
                                    }}
                                >
                                    <Checkbox
                                        checked={selectedEmpIds.includes(emp.id)}
                                        // Dùng pointer-events-none để tránh xung đột sự kiện click với div cha
                                        className="pointer-events-none"
                                    />
                                    <span className="text-sm select-none">
                                        {emp.name} - <span className="text-slate-500">{emp.position?.name}</span>
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2"><Label>Ghi chú</Label><Input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /></div>
                </div>
                <DialogFooter>
                    <Button onClick={handleSubmit} disabled={loading}>{loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Lưu kỳ kiểm kê</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}