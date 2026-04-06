"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Plus, Trash2, Edit, FileSignature, Clock, CheckCircle2, TrendingUp
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
// ✅ IMPORT THƯ VIỆN BIỂU ĐỒ DÒNG TIỀN
import {
    BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart
} from 'recharts';

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
        status: "pending",
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

    // ✅ CHUẨN BỊ DATA CHO BIỂU ĐỒ DÒNG TIỀN
    const chartData = useMemo(() => {
        let cumulativePaid = 0;
        return currentMilestones.map((m, index) => {
            const isPaid = m.status === 'paid';
            if (isPaid) cumulativePaid += (m.amount || 0);
            return {
                name: m.name || `Đợt ${index + 1}`,
                expected: m.amount || 0,
                cumulative: cumulativePaid // Dòng tiền thực tế đã chảy vào túi
            };
        });
    }, [currentMilestones]);

    // Handlers tạo/sửa kế hoạch
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
        setFormData({
            id: item.id, contract_id: currentContract.id, name: item.name,
            percentage: (item.percentage || 0).toString(), amount: (item.amount || 0).toString(),
            due_date: item.due_date || "", status: item.status, paid_date: item.paid_date || ""
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

    if (!loading && contracts.length === 0) return (
        <div className="p-10 text-center border border-dashed border-slate-300 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 transition-colors">
            <p>Dự án này chưa có Hợp đồng nào được ký kết.</p>
            <Link href={`/projects/${projectId}?tab=quotation`}><Button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">Chuyển đến tạo Hợp đồng</Button></Link>
        </div>
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500 transition-colors">
            {/* THỐNG KÊ */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-900/50 shadow-sm transition-colors">
                    <CardContent className="p-4">
                        <div>
                            <p className="text-xs font-bold uppercase text-blue-600 dark:text-blue-400">Tổng Giá trị HĐ</p>
                            <h3 className="text-xl font-bold text-blue-800 dark:text-blue-300">{formatCurrency(projectStats.totalValue)}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-900/50 shadow-sm transition-colors">
                    <CardContent className="p-4">
                        <div>
                            <p className="text-xs font-bold uppercase text-green-600 dark:text-green-400">Thực thu (Dòng tiền vào)</p>
                            <h3 className="text-xl font-bold text-green-800 dark:text-green-300">{formatCurrency(projectStats.totalPaid)}</h3>
                        </div>
                    </CardContent>
                </Card>
                <Card className="shadow-sm bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
                    <CardContent className="p-4">
                        <div className="flex justify-between mb-2">
                            <p className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Tiến độ thu hồi vốn</p>
                            <span className="text-xl font-bold text-slate-800 dark:text-slate-100">{projectStats.percent.toFixed(1)}%</span>
                        </div>
                        <Progress value={projectStats.percent} className="h-2.5 bg-slate-100 dark:bg-slate-800" />
                    </CardContent>
                </Card>
            </div>

            {/* ✅ BIỂU ĐỒ DÒNG TIỀN (CASH FLOW) */}
            {currentMilestones.length > 0 && (
                <Card className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <CardHeader className="pb-2 border-b dark:border-slate-800">
                        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wide flex items-center gap-2">
                            <TrendingUp className="w-4 h-4 text-emerald-500" /> Biểu đồ Dòng tiền (Cash Flow)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="h-[300px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.2} />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="#64748b" tickLine={false} axisLine={false} />
                                    <YAxis yAxisId="left" tickFormatter={(value) => `${value / 1000000}M`} tick={{ fontSize: 11 }} stroke="#64748b" tickLine={false} axisLine={false} />
                                    <Tooltip
                                        formatter={(value: number) => formatCurrency(value)}
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', color: '#f8fafc', borderRadius: '8px', fontSize: '12px', fontWeight: 'bold' }}
                                        itemStyle={{ color: '#e2e8f0' }}
                                    />
                                    <Legend wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#64748b' }} />
                                    <Bar yAxisId="left" dataKey="expected" name="Giá trị mỗi đợt" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} opacity={0.8} />
                                    <Line yAxisId="left" type="monotone" dataKey="cumulative" name="Dòng tiền thực thu (Lũy kế)" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                </ComposedChart>
                            </ResponsiveContainer>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* DANH SÁCH CÁC ĐỢT THANH TOÁN */}
            <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm transition-colors">
                <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-colors">
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Hợp đồng:</span>
                        <Select value={selectedContractId} onValueChange={setSelectedContractId}>
                            <SelectTrigger className="w-[300px] bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200">
                                <SelectValue placeholder="Chọn hợp đồng" />
                            </SelectTrigger>
                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                {contracts.map((c) => (<SelectItem key={c.id} value={c.id} className="dark:text-slate-200">{c.contract_number}</SelectItem>))}
                            </SelectContent>
                        </Select>
                    </div>
                    {currentContract && (
                        <Dialog open={open} onOpenChange={setOpen}>
                            <DialogTrigger asChild>
                                <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm" onClick={handleOpenCreate}>
                                    <Plus className="w-4 h-4 mr-2" /> Thêm đợt thu
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                                <DialogHeader>
                                    <DialogTitle className="dark:text-slate-100">{formData.id ? "Sửa kế hoạch thu tiền" : "Thêm đợt thu mới"}</DialogTitle>
                                </DialogHeader>
                                <div className="grid gap-4 py-4">
                                    <div className="space-y-2">
                                        <Label className="dark:text-slate-300">Tên đợt <span className="text-red-500">*</span></Label>
                                        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-lg border dark:border-slate-800 transition-colors">
                                        <div className="space-y-2">
                                            <Label className="dark:text-slate-300">Tỷ lệ (%)</Label>
                                            <Input type="number" value={formData.percentage} onChange={e => handlePercentageChange(e.target.value)} className="bg-white dark:bg-slate-900 dark:border-slate-700 dark:text-slate-100 font-mono" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="dark:text-slate-300">Thành tiền</Label>
                                            <Input type="number" value={formData.amount} onChange={e => handleAmountChange(e.target.value)} className="font-bold text-blue-700 dark:text-blue-400 bg-white dark:bg-slate-900 dark:border-slate-700 font-mono" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label className="dark:text-slate-300">Hạn dự kiến</Label>
                                            <Input type="date" value={formData.due_date} onChange={e => setFormData({ ...formData, due_date: e.target.value })} className="bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label className="dark:text-slate-300">Trạng thái</Label>
                                            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                                                <SelectTrigger className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="dark:bg-slate-900 dark:border-slate-700">
                                                    <SelectItem value="pending">Chưa thu</SelectItem>
                                                    <SelectItem value="paid">Đã thu xong</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </div>
                                    {formData.status === 'paid' && (
                                        <div className="space-y-2 animate-in fade-in zoom-in duration-200">
                                            <Label className="dark:text-slate-300">Ngày thực thu</Label>
                                            <Input type="date" value={formData.paid_date} onChange={e => setFormData({ ...formData, paid_date: e.target.value })} className="bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100" />
                                        </div>
                                    )}
                                    <Button onClick={handleSubmit} disabled={submitting} className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-2">
                                        {submitting ? "Đang lưu..." : "Lưu kế hoạch"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800 transition-colors">
                            <tr>
                                <th className="px-6 py-4 font-bold">Đợt thanh toán</th>
                                <th className="px-6 py-4 text-right font-bold">Giá trị (VNĐ)</th>
                                <th className="px-6 py-4 text-center font-bold">Trạng thái</th>
                                <th className="px-6 py-4 font-bold">Hạn thu dự kiến</th>
                                <th className="px-6 py-4 text-right font-bold">Thao tác</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                            {currentMilestones.length === 0 ? (
                                <tr><td colSpan={5} className="text-center py-8 text-slate-400 dark:text-slate-500 italic">Chưa có dữ liệu kế hoạch dòng tiền.</td></tr>
                            ) : currentMilestones.map((item: any) => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="px-6 py-4">
                                        <p className="font-bold text-slate-800 dark:text-slate-200">{item.name}</p>
                                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">{item.percentage}% Giá trị HĐ</p>
                                    </td>
                                    <td className="px-6 py-4 text-right font-bold text-slate-800 dark:text-slate-100 font-mono text-base">
                                        {formatCurrency(item.amount)}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {item.status === 'paid' ? (
                                            <Badge variant="outline" className="bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/50 px-2.5 py-1">
                                                <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Đã thu ({formatDate(item.paid_date || new Date().toISOString())})
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none px-2.5 py-1">
                                                <Clock className="w-3.5 h-3.5 mr-1.5" /> Chờ thu
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-slate-600 dark:text-slate-300">
                                        {item.due_date ? formatDate(item.due_date) : "Chưa xác định"}
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end gap-1">
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-500 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors" onClick={() => handleOpenEdit(item)}>
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors" onClick={() => handleDelete(item.id)}>
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
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