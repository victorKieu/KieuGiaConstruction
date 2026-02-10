"use client"

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, Circle, Loader2, RefreshCw } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import {
    getPaymentMilestones,
    createPaymentMilestone,
    deletePaymentMilestone,
    markAsPaid
} from "@/lib/action/paymentActions";

interface Props {
    contractId: string;
    contractValue: number; // Tổng giá trị hợp đồng
    projectId: string;
}

export default function PaymentSchedule({ contractId, contractValue, projectId }: Props) {
    const [milestones, setMilestones] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isPending, startTransition] = useTransition();

    // State cho dòng thêm mới
    const [newName, setNewName] = useState("");
    const [newPercent, setNewPercent] = useState<string>("");
    const [newAmount, setNewAmount] = useState<string>("");
    const [newDueDate, setNewDueDate] = useState("");

    // Load dữ liệu
    const loadData = async () => {
        setLoading(true);
        const res = await getPaymentMilestones(contractId);
        if (res.success) {
            setMilestones(res.data || []);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadData();
    }, [contractId]);

    // --- LOGIC TỰ ĐỘNG TÍNH TOÁN ---

    // Khi thay đổi phần trăm
    const handlePercentChange = (val: string) => {
        setNewPercent(val);
        const percent = parseFloat(val);
        if (!isNaN(percent) && contractValue > 0) {
            const calculatedAmount = (contractValue * percent) / 100;
            setNewAmount(Math.round(calculatedAmount).toString());
        } else {
            setNewAmount("");
        }
    };

    // Khi thay đổi số tiền
    const handleAmountChange = (val: string) => {
        setNewAmount(val);
        const amount = parseFloat(val);
        if (!isNaN(amount) && contractValue > 0) {
            const calculatedPercent = (amount / contractValue) * 100;
            setNewPercent(Math.round(calculatedPercent * 100) / 100 + "");
        } else {
            setNewPercent("");
        }
    };

    // Thêm mới
    const handleAdd = () => {
        if (!newName || !newAmount) return;

        startTransition(async () => {
            const res = await createPaymentMilestone({
                contract_id: contractId,
                name: newName,
                percentage: parseFloat(newPercent) || 0,
                amount: parseFloat(newAmount) || 0,
                due_date: newDueDate
            }, projectId);

            if (res.success) {
                setNewName("");
                setNewPercent("");
                setNewAmount("");
                setNewDueDate("");
                loadData();
            } else {
                alert(res.error);
            }
        });
    };

    // Xóa
    const handleDelete = (id: string) => {
        if (!confirm("Xóa đợt thanh toán này?")) return;
        startTransition(async () => {
            await deletePaymentMilestone(id, projectId);
            loadData();
        });
    };

    // Đổi trạng thái thanh toán
    const handleTogglePaid = (item: any) => {
        startTransition(async () => {
            await markAsPaid(item.id, !item.is_paid, projectId);
            loadData();
        });
    };

    // Tính tổng
    const totalPercent = milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
    const totalAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    const remainingAmount = contractValue - totalAmount;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                {/* ✅ FIX: text-slate-700 -> text-foreground */}
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {/* ✅ FIX: text-slate-500 -> text-muted-foreground */}
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    Tiến độ thanh toán
                </h3>
                {/* ✅ FIX: text-slate-500 -> text-muted-foreground */}
                <div className="text-xs text-muted-foreground">
                    {/* ✅ FIX: text-blue-600 -> dark:text-blue-400 */}
                    Giá trị HĐ: <span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrency(contractValue)}</span>
                </div>
            </div>

            {/* ✅ FIX: border -> border-border */}
            <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                    {/* ✅ FIX: bg-slate-50 -> bg-muted/50 */}
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[50px] text-center">TT</TableHead>
                            <TableHead>Nội dung đợt</TableHead>
                            <TableHead className="w-[15%] text-right">%</TableHead>
                            <TableHead className="w-[20%] text-right">Số tiền (VNĐ)</TableHead>
                            <TableHead className="w-[15%]">Hạn TT</TableHead>
                            <TableHead className="w-[12%] text-center">Trạng thái</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Đang tải...</TableCell></TableRow>
                        ) : milestones.map((item, index) => (
                            // ✅ FIX: hover:bg-slate-50 -> hover:bg-muted/50
                            <TableRow key={item.id} className="hover:bg-muted/50">
                                <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                                <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                                <TableCell className="text-right text-muted-foreground">{item.percentage}%</TableCell>
                                <TableCell className="text-right font-semibold text-foreground">{formatCurrency(item.amount)}</TableCell>
                                <TableCell className="text-muted-foreground">
                                    {item.due_date ? new Date(item.due_date).toLocaleDateString('vi-VN') : '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                    <div
                                        className="cursor-pointer inline-flex"
                                        onClick={() => handleTogglePaid(item)}
                                        title="Bấm để đổi trạng thái"
                                    >
                                        {item.is_paid
                                            ? <Badge className="bg-green-600 hover:bg-green-700 text-white"><CheckCircle className="w-3 h-3 mr-1" /> Đã thu</Badge>
                                            // ✅ FIX: Badge style for dark mode
                                            : <Badge variant="outline" className="text-muted-foreground hover:bg-muted border-border"><Circle className="w-3 h-3 mr-1" /> Chưa thu</Badge>
                                        }
                                    </div>
                                </TableCell>
                                <TableCell>
                                    {/* ✅ FIX: Hover colors */}
                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}

                        {/* Dòng Tổng cộng - ✅ FIX: bg-slate-50 -> bg-muted/50, border colors */}
                        <TableRow className="bg-muted/50 font-bold border-t-2 border-border">
                            <TableCell colSpan={2} className="text-right text-foreground">Tổng cộng:</TableCell>
                            {/* ✅ FIX: text-red-600 -> dark:text-red-400 */}
                            <TableCell className={`text-right ${totalPercent > 100 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                {totalPercent}%
                            </TableCell>
                            <TableCell className={`text-right ${totalAmount > contractValue ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                {formatCurrency(totalAmount)}
                            </TableCell>
                            {/* ✅ FIX: text-slate-500 -> text-muted-foreground */}
                            <TableCell colSpan={3} className="text-xs text-muted-foreground font-normal italic">
                                {remainingAmount > 0
                                    ? `(Còn lại: ${formatCurrency(remainingAmount)})`
                                    : remainingAmount < 0
                                        ? `(Vượt quá: ${formatCurrency(Math.abs(remainingAmount))})`
                                        : "(Đã khớp đủ 100%)"
                                }
                            </TableCell>
                        </TableRow>

                        {/* Form thêm mới - ✅ FIX: bg-blue-50/50 -> dark:bg-blue-900/10 */}
                        <TableRow className="bg-blue-50/50 dark:bg-blue-900/10">
                            <TableCell className="text-center"><Plus className="w-4 h-4 text-blue-500 dark:text-blue-400 mx-auto" /></TableCell>
                            <TableCell>
                                <Input
                                    placeholder="Tên đợt (VD: Tạm ứng...)"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    // ✅ FIX: Input colors for dark mode
                                    className="h-8 text-sm border-blue-200 dark:border-blue-800 bg-background focus-visible:ring-blue-400"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    placeholder="%"
                                    value={newPercent}
                                    onChange={(e) => handlePercentChange(e.target.value)}
                                    className="h-8 text-sm text-right border-blue-200 dark:border-blue-800 bg-background focus-visible:ring-blue-400"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    placeholder="Số tiền"
                                    value={newAmount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    className="h-8 text-sm text-right border-blue-200 dark:border-blue-800 bg-background focus-visible:ring-blue-400 font-semibold"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="date"
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                    className="h-8 text-sm border-blue-200 dark:border-blue-800 bg-background focus-visible:ring-blue-400"
                                />
                            </TableCell>
                            <TableCell colSpan={2} className="text-right">
                                <Button
                                    size="sm"
                                    onClick={handleAdd}
                                    disabled={isPending || !newName || !newAmount}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 h-8 shadow-sm w-full text-white"
                                >
                                    {isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : "Thêm"}
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            {/* ✅ FIX: text-slate-400 -> text-muted-foreground */}
            <p className="text-[11px] text-muted-foreground italic">
                * Nhập % sẽ tự tính tiền và ngược lại. Tổng giá trị các đợt nên bằng 100% giá trị hợp đồng.
            </p>
        </div>
    );
}