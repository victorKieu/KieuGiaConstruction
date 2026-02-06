"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Plus, Trash2, Edit, FileSignature, Clock, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import {
    getProjectContracts,
    upsertPaymentMilestone,
    deletePaymentMilestone,
} from "@/lib/action/finance";
import { formatCurrency, formatDate } from "@/lib/utils/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function PaymentStageManager({ projectId }: { projectId: string }) {
    const [contracts, setContracts] = useState<any[]>([]);
    const [selectedContractId, setSelectedContractId] = useState<string>("");
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [open, setOpen] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        id: null as string | null,
        contract_id: "",
        name: "",
        percentage: "0",
        amount: "0",
        due_date: "",
        status: "pending", // Status này chỉ để init, không cho sửa tay thành paid
        paid_date: ""
    });

    useEffect(() => { loadData(); }, [projectId]);

    const loadData = async () => {
        setLoading(true);
        const data = await getProjectContracts(projectId);
        setContracts(data || []);
        if (data && data.length > 0 && !selectedContractId) setSelectedContractId(data[0].id);
        setLoading(false);
    };

    // Tính toán thống kê
    const projectStats = useMemo(() => {
        let totalValue = 0;
        let totalPaid = 0;
        contracts.forEach(c => {
            totalValue += (c.value || 0);
            const paidMilestones = c.payment_milestones?.filter((m: any) => m.status === 'paid') || [];
            totalPaid += paidMilestones.reduce((sum: number, m: any) => sum + (m.amount || 0), 0);
        });
        return {
            totalValue, totalPaid,
            remaining: totalValue - totalPaid,
            percent: totalValue > 0 ? (totalPaid / totalValue) * 100 : 0
        };
    }, [contracts]);

    const currentContract = contracts.find(c => c.id === selectedContractId);
    const currentMilestones = useMemo(() => {
        if (!currentContract) return [];
        return [...(currentContract.payment_milestones || [])].sort((a, b) => {
            if (!a.due_date) return 1; if (!b.due_date) return -1;
            return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
        });
    }, [currentContract]);

    // Handlers tạo/sửa kế hoạch (Giữ nguyên)
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
            id: null, contract_id: currentContract.id, name: `Đợt ${currentMilestones.length + 1}`,
            percentage: "0", amount: "0", due_date: "", status: "pending", paid_date: ""
        });
        setOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        // Chỉ cho phép sửa thông tin kế hoạch, không cho sửa trạng thái thanh toán tại đây
        setFormData({
            id: item.id, contract_id: currentContract.id, name: item.name,
            percentage: (item.percentage || 0).toString(), amount: (item.amount || 0).toString(),
            due_date: item.due_date || "", status: item.status, paid_date: item.paid_date || ""
        });
        setOpen(true);
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        // Luôn giữ status hiện tại, không cho user can thiệp status qua form này
        const payload = {
            ...formData,
            percentage: parseFloat(formData.percentage),
            amount: parseFloat(formData.amount),
            due_date: formData.due_date || null,
        };
        const res = await upsertPaymentMilestone(payload, projectId);
        if (res.success) { toast.success("Đã lưu kế hoạch!"); setOpen(false); loadData(); }
        else { toast.error("Lỗi: " + res.error); }
        setSubmitting(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Xóa đợt thanh toán này?")) return;
        await deletePaymentMilestone(id, projectId);
        toast.success("Đã xóa");
        loadData();
    };

    if (!loading && contracts.length === 0) return (<div className="p-10 text-center border border-dashed rounded-lg bg-slate-50"><p>Chưa có hợp đồng.</p><Link href={`/projects/${projectId}?tab=quotation`}><Button className="mt-2">Tạo Hợp đồng</Button></Link></div>);

    return (
        <div className="space-y-6">
            {/* Thống kê - Giữ nguyên */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 border-blue-200 shadow-sm"><CardContent className="p-4"><div><p className="text-xs font-bold uppercase text-blue-600">Tổng Giá trị HĐ</p><h3 className="text-xl font-bold text-blue-800">{formatCurrency(projectStats.totalValue)}</h3></div></CardContent></Card>
                <Card className="bg-green-50 border-green-200 shadow-sm"><CardContent className="p-4"><div><p className="text-xs font-bold uppercase text-green-600">Thực thu</p><h3 className="text-xl font-bold text-green-800">{formatCurrency(projectStats.totalPaid)}</h3></div></CardContent></Card>
                <Card className="shadow-sm"><CardContent className="p-4"><div className="flex justify-between mb-2"><p className="text-xs font-bold uppercase text-slate-500">Tiến độ</p><span className="text-xl font-bold text-slate-700">{projectStats.percent.toFixed(1)}%</span></div><Progress value={projectStats.percent} className="h-2.5" /></CardContent></Card>
            </div>

            {/* Danh sách */}
            <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-slate-50/50 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">Hợp đồng:</span>
                        <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                            <SelectTrigger className="w-[300px] bg-white"><SelectValue placeholder="Chọn hợp đồng" /></SelectTrigger>
                            <SelectContent>{contracts.map((c) => (<SelectItem key={c.id} value={c.id}>{c.contract_number}</SelectItem>))}</SelectContent>
                        </Select>
                    </div>
                    {currentContract && (
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild><Button size="sm" className="bg-blue-600" onClick={handleOpenCreate}><Plus className="w-4 h-4 mr-2" /> Thêm đợt</Button></DialogTrigger>
                            <DialogContent>
                                <DialogHeader><DialogTitle>{formData.id ? "Sửa kế hoạch" : "Thêm đợt mới"}</DialogTitle></DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2"><Label>Tên đợt <span className="text-red-500">*</span></Label><Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} /></div>
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded border">
                                        <div className="space-y-2"><Label>Tỷ lệ (%)</Label><Input type="number" value={formData.percentage} onChange={e => handlePercentageChange(e.target.value)} /></div>
                                        <div className="space-y-2"><Label>Thành tiền</Label><Input type="number" value={formData.amount} onChange={e => handleAmountChange(e.target.value)} className="font-bold text-blue-700" /></div>
                                    </div>
                                    <div className="space-y-2"><Label>Ngày đến hạn</Label><Input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} /></div>
                                    <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-blue-600">{submitting ? "Đang lưu..." : "Lưu kế hoạch"}</Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

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
                                <tr><td colSpan={5} className="text-center py-8 text-slate-500 italic">Chưa có dữ liệu.</td></tr>
                            ) : currentMilestones.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50">
                                    <td className="px-4 py-3 font-medium text-slate-700">{item.name}<div className="text-xs text-slate-400">{item.percentage}% HĐ</div></td>
                                    <td className="px-4 py-3 text-right font-bold text-slate-800">{formatCurrency(item.amount)}</td>
                                    <td className="px-4 py-3 text-center">
                                        {/* ✅ CHỈ HIỂN THỊ STATUS - KHÔNG CLICK ĐƯỢC */}
                                        {item.status === 'paid' ? (
                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                <CheckCircle2 className="w-3 h-3 mr-1" /> Đã thu: {formatDate(item.paid_date)}
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="text-slate-500">
                                                <Clock className="w-3 h-3 mr-1" /> Chưa thu
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-slate-500">{item.due_date ? formatDate(item.due_date) : "---"}</td>
                                    <td className="px-4 py-3 text-right">
                                        {/* Chỉ cho sửa/xóa nếu chưa thanh toán (để bảo toàn dữ liệu tài chính) */}
                                        {item.status !== 'paid' && (
                                            <div className="flex justify-end gap-1">
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500" onClick={() => handleOpenEdit(item)}><Edit className="w-4 h-4" /></Button>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => handleDelete(item.id)}><Trash2 className="w-4 h-4" /></Button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}