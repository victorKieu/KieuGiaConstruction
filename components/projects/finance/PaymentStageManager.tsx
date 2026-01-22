"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Plus, Trash2, Edit, CheckCircle, FileSignature, AlertCircle, ChevronDown, Circle
} from "lucide-react";
import { toast } from "sonner";
import {
    getProjectContracts,
    upsertPaymentMilestone,
    deletePaymentMilestone,
    toggleMilestoneStatus
} from "@/lib/action/finance";
import { formatCurrency, formatDate } from "@/lib/utils/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

export default function PaymentStageManager({ projectId }: { projectId: string }) {
    const [contracts, setContracts] = useState<any[]>([]);
    const [selectedContractId, setSelectedContractId] = useState<string>("");

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [open, setOpen] = useState(false);

    const [formData, setFormData] = useState({
        id: null as string | null,
        contract_id: "",
        name: "",
        percentage: "0",
        amount: "0",
        due_date: "",
        status: "pending",
        paid_date: ""
    });

    useEffect(() => {
        loadData();
    }, [projectId]);

    const loadData = async () => {
        setLoading(true);
        const data = await getProjectContracts(projectId);
        setContracts(data);

        if (data.length > 0 && !selectedContractId) {
            setSelectedContractId(data[0].id);
        }
        setLoading(false);
    };

    const projectStats = useMemo(() => {
        let totalValue = 0;
        let totalPaid = 0;

        contracts.forEach(c => {
            totalValue += (c.value || 0);
            const milestones = c.payment_milestones || [];
            const paidMilestones = milestones.filter((m: any) => m.status === 'paid');
            const paidAmount = paidMilestones.reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
            totalPaid += paidAmount;
        });

        return {
            totalValue,
            totalPaid,
            remaining: totalValue - totalPaid,
            percent: totalValue > 0 ? (totalPaid / totalValue) * 100 : 0
        };
    }, [contracts]);

    const currentContract = contracts.find(c => c.id === selectedContractId);

    const currentMilestones = useMemo(() => {
        if (!currentContract) return [];
        return [...(currentContract.payment_milestones || [])].sort((a, b) => {
            if (!a.due_date) return 1;
            if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
    }, [currentContract]);

    // --- HANDLERS ---
    const handlePercentageChange = (val: string) => {
        if (!currentContract) return;
        const pct = parseFloat(val) || 0;
        const amt = (currentContract.value * pct) / 100;
        setFormData(prev => ({ ...prev, percentage: val, amount: amt.toFixed(0) }));
    };

    const handleAmountChange = (val: string) => {
        if (!currentContract) return;
        const amt = parseFloat(val) || 0;
        const pct = currentContract.value > 0 ? (amt / currentContract.value) * 100 : 0;
        setFormData(prev => ({ ...prev, amount: val, percentage: pct.toFixed(2) }));
    };

    const handleOpenCreate = () => {
        if (!currentContract) return;
        setFormData({
            id: null,
            contract_id: currentContract.id,
            name: `Đợt ${currentMilestones.length + 1}`,
            percentage: "0",
            amount: "0",
            due_date: "",
            status: "pending",
            paid_date: new Date().toISOString().split('T')[0]
        });
        setOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        setFormData({
            id: item.id,
            contract_id: currentContract.id,
            name: item.name,
            percentage: (item.percentage || 0).toString(),
            amount: (item.amount || 0).toString(),
            due_date: item.due_date || "",
            status: item.status || "pending",
            paid_date: item.paid_date ? item.paid_date.split('T')[0] : new Date().toISOString().split('T')[0]
        });
        setOpen(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        const payload = {
            ...formData,
            percentage: parseFloat(formData.percentage),
            amount: parseFloat(formData.amount),
            due_date: formData.due_date || null,
            paid_date: formData.status === 'paid' ? formData.paid_date : null
        };

        const res = await upsertPaymentMilestone(payload, projectId);
        if (res.success) {
            toast.success("Đã lưu đợt thanh toán!");
            setOpen(false);
            loadData();
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa đợt thanh toán này?")) return;
        await deletePaymentMilestone(id, projectId);
        toast.success("Đã xóa");
        loadData();
    };

    // ✅ Fix: Hàm toggle nhận vào string status hiện tại
    const handleTogglePaid = async (id: string, currentStatus: string) => {
        const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
        await toggleMilestoneStatus(id, projectId, newStatus);
        toast.success(newStatus === 'paid' ? "Đã xác nhận thu tiền" : "Đã hủy xác nhận thu");
        loadData();
    };

    // --- RENDER ---
    if (!loading && contracts.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-10 bg-slate-50 border border-dashed border-slate-300 rounded-lg text-center animate-in fade-in">
                <FileSignature className="w-12 h-12 text-slate-400 mb-3" />
                <h3 className="text-lg font-semibold text-slate-700">Dự án chưa có Hợp đồng</h3>
                <p className="text-sm text-slate-500 mb-4 max-w-md">
                    Hệ thống cần Hợp đồng thi công để thiết lập các đợt thanh toán.
                </p>
                <Link href={`/projects/${projectId}?tab=quotation`}>
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> Tạo Hợp đồng ngay
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* 1. CARD THỐNG KÊ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase text-blue-600">Tổng Giá trị HĐ</p>
                            <h3 className="text-xl font-bold text-blue-800">{formatCurrency(projectStats.totalValue)}</h3>
                            <p className="text-[10px] text-blue-500 mt-1 font-mono">{contracts.length} Hợp đồng</p>
                        </div>
                        <FileSignature className="w-8 h-8 text-blue-300" />
                    </CardContent>
                </Card>
                <Card className="bg-green-50 border-green-200 shadow-sm">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold uppercase text-green-600">Thực thu</p>
                            <h3 className="text-xl font-bold text-green-800">{formatCurrency(projectStats.totalPaid)}</h3>
                            <p className="text-[10px] text-green-600 mt-1">
                                Còn lại: {formatCurrency(projectStats.remaining)}
                            </p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-300" />
                    </CardContent>
                </Card>
                <Card className="shadow-sm">
                    <CardContent className="p-4 flex flex-col justify-center h-full">
                        <div className="flex justify-between items-end mb-2">
                            <p className="text-xs font-bold uppercase text-slate-500">Tiến độ thu tiền</p>
                            <span className="text-xl font-bold text-slate-700">{projectStats.percent.toFixed(1)}%</span>
                        </div>
                        <Progress value={projectStats.percent} className="h-2.5 bg-slate-100" />
                    </CardContent>
                </Card>
            </div>

            {/* 2. DANH SÁCH CHI TIẾT */}
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">

                {/* Header & Dropdown */}
                <div className="p-4 border-b bg-slate-50/50 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="font-bold text-slate-800 text-sm md:text-base whitespace-nowrap">
                            Hợp đồng / Phụ lục:
                        </div>
                        <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                            <SelectTrigger className="w-[300px] bg-white">
                                <SelectValue placeholder="Chọn hợp đồng" />
                            </SelectTrigger>
                            <SelectContent>
                                {contracts.map((c) => (
                                    <SelectItem key={c.id} value={c.id}>
                                        <div className="flex flex-col items-start py-1">
                                            <span className={`font-medium ${c.is_addendum ? 'text-slate-600 pl-4 text-sm' : 'text-slate-900'}`}>
                                                {c.is_addendum ? '↳ Phụ lục: ' : '📄 '}
                                                {c.contract_number}
                                            </span>
                                            <span className={`text-xs text-slate-400 ${c.is_addendum ? 'pl-4' : ''}`}>
                                                {formatCurrency(c.value)}
                                            </span>
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {currentContract && (
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700" onClick={handleOpenCreate}>
                                    <Plus className="w-4 h-4 mr-2" /> Thêm đợt thanh toán
                                </Button>
                            </DialogTrigger>
                            <DialogContent>
                                <DialogHeader>
                                    <DialogTitle>
                                        {formData.id ? "Sửa đợt thanh toán" : "Thêm đợt thanh toán mới"}
                                    </DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label>Tên đợt / Lý do <span className="text-red-500">*</span></Label>
                                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Đợt 1 - Tạm ứng 30%" />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border">
                                        <div className="space-y-2">
                                            <Label>Tỷ lệ (%)</Label>
                                            <Input type="number" value={formData.percentage} onChange={e => handlePercentageChange(e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Thành tiền (VNĐ)</Label>
                                            <Input type="number" value={formData.amount} onChange={e => handleAmountChange(e.target.value)} className="font-bold text-blue-700" />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Ngày đến hạn</Label>
                                            <Input
                                                type="date"
                                                value={formData.due_date}
                                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                            />
                                        </div>
                                        <div className="space-y-2 flex flex-col justify-end pb-2">
                                            <div className="flex items-center space-x-2">
                                                <Switch
                                                    id="paid-mode"
                                                    checked={formData.status === 'paid'}
                                                    onCheckedChange={(checked) => setFormData({ ...formData, status: checked ? 'paid' : 'pending' })}
                                                />
                                                <Label htmlFor="paid-mode" className={formData.status === 'paid' ? "text-green-600 font-bold" : ""}>
                                                    {formData.status === 'paid' ? "Đã thanh toán" : "Chưa thanh toán"}
                                                </Label>
                                            </div>
                                        </div>
                                    </div>

                                    {formData.status === 'paid' && (
                                        <div className="space-y-2 animate-in slide-in-from-top-2">
                                            <Label>Ngày thực thu</Label>
                                            <Input
                                                type="date"
                                                value={formData.paid_date}
                                                onChange={e => setFormData({ ...formData, paid_date: e.target.value })}
                                            />
                                        </div>
                                    )}

                                    <Button onClick={handleSubmit} disabled={submitting} className="w-full mt-2 bg-blue-600">
                                        {submitting ? "Đang lưu..." : "Lưu thông tin"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                {/* Table List */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 uppercase bg-slate-50 border-b">
                            <tr>
                                <th className="px-4 py-3">Đợt thanh toán</th>
                                <th className="px-4 py-3 text-right">Giá trị</th>
                                <th className="px-4 py-3 text-center">Trạng thái</th>
                                <th className="px-4 py-3">Hạn thanh toán</th>
                                <th className="px-4 py-3 text-right">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {currentMilestones.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-slate-500 italic">
                                        Hợp đồng này chưa có đợt thanh toán nào.
                                    </td>
                                </tr>
                            ) : (
                                currentMilestones.map((item: any) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-700">
                                            {item.name}
                                            <div className="text-xs text-slate-400 font-normal">{item.percentage}% HĐ</div>
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-slate-800">
                                            {formatCurrency(item.amount)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <div
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium cursor-pointer transition-colors border ${item.status === 'paid'
                                                        ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'
                                                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                                                    }`}
                                                onClick={() => handleTogglePaid(item.id, item.status)}
                                                title="Bấm để đổi trạng thái"
                                            >
                                                {item.status === 'paid' ? <CheckCircle className="w-3 h-3" /> : <Circle className="w-3 h-3" />}
                                                {item.status === 'paid' ? "Đã thu" : "Chưa thu"}
                                            </div>
                                            {item.status === 'paid' && item.paid_date && (
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    {formatDate(item.paid_date)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">
                                            {item.due_date ? formatDate(item.due_date) : "---"}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:bg-blue-50" onClick={() => handleOpenEdit(item)}>
                                                    <Edit className="w-4 h-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:bg-red-50" onClick={() => handleDelete(item.id)}>
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}