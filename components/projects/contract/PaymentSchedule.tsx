"use client"

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, Circle, Loader2, AlertCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import {
    getPaymentMilestones,
    createPaymentMilestone,
    deletePaymentMilestone,
    markAsPaid
} from "@/lib/action/paymentActions";

interface Props {
    contractId: string;
    contractValue: number;
    projectId: string;
}

export default function PaymentSchedule({ contractId, contractValue, projectId }: Props) {
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // State cho dòng thêm mới
    const [newName, setNewName] = useState("");
    const [newPercent, setNewPercent] = useState<number>(0);
    const [newAmount, setNewAmount] = useState<number>(0);
    const [newDueDate, setNewDueDate] = useState("");

    // Load dữ liệu khi component mount hoặc contractId thay đổi
    useEffect(() => {
        loadData();
    }, [contractId]);

    const loadData = async () => {
        setLoading(true);
        const res = await getPaymentMilestones(contractId);
        if (res.success) {
            setMilestones(res.data || []);
        }
        setLoading(false);
    };

    // Tự động tính tiền khi nhập % hoặc ngược lại
    const handlePercentChange = (percent: number) => {
        setNewPercent(percent);
        setNewAmount(Math.round((contractValue * percent) / 100));
    };

    const handleAmountChange = (amount: number) => {
        setNewAmount(amount);
        setNewPercent(parseFloat(((amount / contractValue) * 100).toFixed(2)));
    };

    // Xử lý thêm đợt thanh toán
    const handleAdd = async () => {
        if (!newName || newAmount <= 0) {
            alert("Vui lòng nhập tên đợt và số tiền hợp lệ");
            return;
        }

        startTransition(async () => {
            const res = await createPaymentMilestone({
                contract_id: contractId,
                name: newName,
                percentage: newPercent,
                amount: newAmount,
                due_date: newDueDate
            }, projectId);

            if (res.success) {
                await loadData();
                // Reset form
                setNewName("");
                setNewPercent(0);
                setNewAmount(0);
                setNewDueDate("");
            } else {
                alert("Lỗi: " + res.error);
            }
        });
    };

    // Xử lý xóa
    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa đợt thanh toán này?")) return;

        const res = await deletePaymentMilestone(id, projectId);
        if (res.success) {
            loadData();
        } else {
            alert(res.error);
        }
    };

    // Xử lý đổi trạng thái thu tiền
    const handleTogglePaid = async (item: any) => {
        const nextStatus = item.status === 'paid' ? false : true;
        const res = await markAsPaid(item.id, nextStatus, projectId);
        if (res.success) {
            loadData();
        }
    };

    // Hàm hiển thị trạng thái (Có xử lý cảnh báo quá hạn)
    const renderStatus = (item: any) => {
        const isPaid = item.status === 'paid';
        const isOverdue = !isPaid && item.due_date && new Date(item.due_date) < new Date();

        if (isPaid) {
            return (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-green-200 gap-1">
                    <CheckCircle className="w-3 h-3" /> Đã thu
                </Badge>
            );
        }
        if (isOverdue) {
            return (
                <Badge variant="destructive" className="gap-1 animate-pulse">
                    <AlertCircle className="w-3 h-3" /> Quá hạn
                </Badge>
            );
        }
        return (
            <Badge variant="outline" className="text-slate-500 gap-1">
                <Circle className="w-3 h-3" /> Chờ thu
            </Badge>
        );
    };

    // Tính toán tổng số tiền đã lên lịch
    const totalScheduled = milestones.reduce((sum, item) => sum + Number(item.amount), 0);
    const remaining = contractValue - totalScheduled;

    if (loading) return <div className="flex justify-center p-8"><Loader2 className="animate-spin text-slate-400" /></div>;

    return (
        <div className="space-y-4">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                    Tiến độ thanh toán
                    <Badge variant="secondary" className="font-normal text-[10px]">
                        {milestones.length} đợt
                    </Badge>
                </h3>
                <div className="text-xs space-y-1 text-right w-full md:w-auto">
                    <div className="text-slate-500">
                        Tổng Hợp đồng: <span className="font-bold text-slate-700">{formatCurrency(contractValue)}</span>
                    </div>
                    <div className="flex gap-4 justify-end">
                        <span>Đã lập lịch: <b className="text-blue-600">{formatCurrency(totalScheduled)}</b></span>
                        <span className={remaining > 0 ? "text-orange-500" : remaining < 0 ? "text-red-500" : "text-green-600"}>
                            {remaining > 0 ? `Còn thiếu: ${formatCurrency(remaining)}` : remaining < 0 ? `Vượt: ${formatCurrency(Math.abs(remaining))}` : "Đã đủ 100%"}
                        </span>
                    </div>
                </div>
            </div>

            <div className="border rounded-xl overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-50">
                        <TableRow>
                            <TableHead className="text-xs uppercase font-bold">Tên đợt thanh toán</TableHead>
                            <TableHead className="text-xs uppercase font-bold w-[80px]">%</TableHead>
                            <TableHead className="text-xs uppercase font-bold">Số tiền</TableHead>
                            <TableHead className="text-xs uppercase font-bold">Hạn thu</TableHead>
                            <TableHead className="text-xs uppercase font-bold">Trạng thái</TableHead>
                            <TableHead className="text-right w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {milestones.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-8 text-slate-400 text-sm italic">
                                    Chưa có kế hoạch thanh toán. Hãy thêm đợt đầu tiên bên dưới.
                                </TableCell>
                            </TableRow>
                        )}

                        {milestones.map((ms) => (
                            <TableRow key={ms.id} className="group">
                                <TableCell className="font-medium text-slate-700">{ms.name}</TableCell>
                                <TableCell className="text-slate-500">{ms.percentage}%</TableCell>
                                <TableCell className="font-bold text-slate-900">{formatCurrency(ms.amount)}</TableCell>
                                <TableCell className="text-slate-600 text-sm">
                                    {ms.due_date ? new Date(ms.due_date).toLocaleDateString('vi-VN') : '---'}
                                </TableCell>
                                <TableCell>
                                    <button
                                        onClick={() => handleTogglePaid(ms)}
                                        className="focus:outline-none transition-transform active:scale-95"
                                        title="Click để đổi trạng thái thu tiền"
                                    >
                                        {renderStatus(ms)}
                                    </button>
                                </TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleDelete(ms.id)}
                                        className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-600 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* DÒNG THÊM MỚI (Quick Add) */}
                        <TableRow className="bg-indigo-50/50 border-t-2 border-indigo-100">
                            <TableCell>
                                <Input
                                    placeholder="Tên đợt (VD: Đợt 1 - Tạm ứng)"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="h-8 text-sm border-indigo-200 focus:border-indigo-500"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    placeholder="%"
                                    value={newPercent || ''}
                                    onChange={(e) => handlePercentChange(Number(e.target.value))}
                                    className="h-8 text-sm border-indigo-200"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    placeholder="Số tiền"
                                    value={newAmount || ''}
                                    onChange={(e) => handleAmountChange(Number(e.target.value))}
                                    className="h-8 text-sm font-bold border-indigo-200"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="date"
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                    className="h-8 text-sm border-indigo-200"
                                />
                            </TableCell>
                            <TableCell colSpan={2} className="text-right">
                                <Button
                                    size="sm"
                                    onClick={handleAdd}
                                    disabled={isPending || !newName}
                                    className="bg-indigo-600 hover:bg-indigo-700 h-8 shadow-sm"
                                >
                                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3 mr-1" />}
                                    Thêm đợt
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <p className="text-[11px] text-slate-400 italic">
                * Mẹo: Nhập % để hệ thống tự tính tiền, hoặc nhập số tiền trực tiếp. Bấm vào nhãn Trạng thái để đánh dấu đã thu tiền.
            </p>
        </div>
    );
}