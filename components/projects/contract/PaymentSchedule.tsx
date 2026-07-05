"use client"

import { useState, useEffect, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, CheckCircle, Circle, Loader2, RefreshCw, Pencil, Save, X } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";
import {
    getPaymentMilestones,
    createPaymentMilestone,
    deletePaymentMilestone,
    updatePaymentMilestone // Thêm hàm này để sửa ngày
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

    // State cho việc Edit ngày (Gia hạn)
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editDate, setEditDate] = useState<string>("");

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
        if (!confirm("Xóa kế hoạch thu này?")) return;
        startTransition(async () => {
            await deletePaymentMilestone(id, projectId);
            loadData();
        });
    };

    // Bắt đầu sửa ngày
    const handleEditClick = (item: any) => {
        setEditingId(item.id);
        setEditDate(item.due_date ? item.due_date.split('T')[0] : "");
    };

    // Lưu sửa ngày
    const handleSaveDate = (id: string) => {
        startTransition(async () => {
            const res = await updatePaymentMilestone(id, { due_date: editDate }, projectId);
            if (res.success) {
                setEditingId(null);
                loadData();
            } else {
                alert(res.error);
            }
        });
    };

    // Tính tổng
    const totalPercent = milestones.reduce((sum, m) => sum + (m.percentage || 0), 0);
    const totalAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0);
    const collectedAmount = milestones.filter(m => m.is_paid || m.status === 'paid').reduce((sum, m) => sum + (m.amount || 0), 0);
    const remainingAmount = contractValue - totalAmount;

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <RefreshCw className="w-4 h-4 text-muted-foreground" />
                    Kế hoạch thu hồi công nợ (Follow-up)
                </h3>
                <div className="text-xs text-muted-foreground text-right space-y-1">
                    <div>Giá trị HĐ: <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{formatCurrency(contractValue)}</span></div>
                    <div>Đã thu: <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(collectedAmount)}</span></div>
                </div>
            </div>

            <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                    <TableHeader className="bg-muted/50">
                        <TableRow>
                            <TableHead className="w-[50px] text-center">TT</TableHead>
                            <TableHead>Nội dung đợt</TableHead>
                            <TableHead className="w-[10%] text-right">%</TableHead>
                            <TableHead className="w-[20%] text-right">Số tiền (VNĐ)</TableHead>
                            <TableHead className="w-[20%] text-center">Hạn thu</TableHead>
                            <TableHead className="w-[15%] text-center">Trạng thái</TableHead>
                            <TableHead className="w-[100px] text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            <TableRow><TableCell colSpan={7} className="text-center py-8 text-muted-foreground"><Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" /> Đang tải dữ liệu...</TableCell></TableRow>
                        ) : milestones.map((item, index) => {
                            const isPaid = item.is_paid || item.status === 'paid';
                            const isEditing = editingId === item.id;

                            return (
                                <TableRow key={item.id} className="hover:bg-muted/50 transition-colors">
                                    <TableCell className="text-center text-muted-foreground">{index + 1}</TableCell>
                                    <TableCell className="font-medium text-foreground">{item.name}</TableCell>
                                    <TableCell className="text-right text-muted-foreground">{item.percentage}%</TableCell>
                                    <TableCell className="text-right font-bold text-foreground">{formatCurrency(item.amount)}</TableCell>

                                    {/* CỘT HẠN THU CÓ THỂ EDIT */}
                                    <TableCell className="text-center text-muted-foreground">
                                        {isEditing ? (
                                            <Input
                                                type="date"
                                                value={editDate}
                                                onChange={(e) => setEditDate(e.target.value)}
                                                className="h-8 text-xs bg-background border-blue-400"
                                            />
                                        ) : (
                                            item.due_date ? new Date(item.due_date).toLocaleDateString('vi-VN') : '-'
                                        )}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        {isPaid
                                            ? <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-default"><CheckCircle className="w-3 h-3 mr-1" /> Đã thu</Badge>
                                            : <Badge variant="outline" className="text-muted-foreground border-border bg-background cursor-default shadow-sm"><Circle className="w-3 h-3 mr-1" /> Chưa thu</Badge>
                                        }
                                    </TableCell>

                                    <TableCell>
                                        <div className="flex items-center justify-end gap-1">
                                            {isEditing ? (
                                                <>
                                                    <Button variant="ghost" size="icon" onClick={() => handleSaveDate(item.id)} className="h-8 w-8 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20" title="Lưu ngày">
                                                        <Save className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => setEditingId(null)} className="h-8 w-8 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" title="Hủy">
                                                        <X className="w-4 h-4" />
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    {/* Chỉ cho sửa ngày khi chưa thu tiền */}
                                                    {!isPaid && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleEditClick(item)} className="h-8 w-8 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20" title="Gia hạn (Sửa ngày)">
                                                            <Pencil className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                    {/* Chỉ cho phép xóa khi chưa thu tiền */}
                                                    {!isPaid && (
                                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)} className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20" title="Xóa đợt thu">
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}

                        {/* Dòng Tổng cộng */}
                        <TableRow className="bg-muted/50 font-bold border-t-2 border-border">
                            <TableCell colSpan={2} className="text-right text-foreground">Tổng kế hoạch:</TableCell>
                            <TableCell className={`text-right ${totalPercent > 100 ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                {totalPercent}%
                            </TableCell>
                            <TableCell className={`text-right ${totalAmount > contractValue ? 'text-red-600 dark:text-red-400' : 'text-foreground'}`}>
                                {formatCurrency(totalAmount)}
                            </TableCell>
                            <TableCell colSpan={3} className="text-xs text-muted-foreground font-normal italic">
                                {remainingAmount > 0
                                    ? `(Cần phân bổ thêm: ${formatCurrency(remainingAmount)})`
                                    : remainingAmount < 0
                                        ? `(Đang dư: ${formatCurrency(Math.abs(remainingAmount))})`
                                        : "(Đã khớp 100% Hợp đồng)"
                                }
                            </TableCell>
                        </TableRow>

                        {/* Form thêm mới */}
                        <TableRow className="bg-blue-50/50 dark:bg-blue-900/10">
                            <TableCell className="text-center"><Plus className="w-4 h-4 text-blue-500 dark:text-blue-400 mx-auto" /></TableCell>
                            <TableCell>
                                <Input
                                    placeholder="Tên đợt (VD: Tạm ứng...)"
                                    value={newName}
                                    onChange={(e) => setNewName(e.target.value)}
                                    className="h-8 text-sm border-blue-200 dark:border-blue-800 bg-background focus-visible:ring-blue-400 shadow-sm"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    placeholder="%"
                                    value={newPercent}
                                    onChange={(e) => handlePercentChange(e.target.value)}
                                    className="h-8 text-sm text-right border-blue-200 dark:border-blue-800 bg-background focus-visible:ring-blue-400 shadow-sm"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="number"
                                    placeholder="Số tiền"
                                    value={newAmount}
                                    onChange={(e) => handleAmountChange(e.target.value)}
                                    className="h-8 text-sm text-right border-blue-200 dark:border-blue-800 bg-background focus-visible:ring-blue-400 font-semibold shadow-sm"
                                />
                            </TableCell>
                            <TableCell>
                                <Input
                                    type="date"
                                    value={newDueDate}
                                    onChange={(e) => setNewDueDate(e.target.value)}
                                    className="h-8 text-sm border-blue-200 dark:border-blue-800 bg-background focus-visible:ring-blue-400 shadow-sm"
                                />
                            </TableCell>
                            <TableCell colSpan={2} className="text-right">
                                <Button
                                    size="sm"
                                    onClick={handleAdd}
                                    disabled={isPending || !newName || !newAmount}
                                    className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 h-8 shadow-sm w-full text-white"
                                >
                                    {isPending ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Plus className="w-3 h-3 mr-1" />}
                                    Lên lịch thu
                                </Button>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </div>

            <div className="flex justify-between items-center pt-1">
                <p className="text-[11px] text-muted-foreground italic">
                    * Bảng này dùng để phòng Kinh Doanh Follow-up khách hàng. Kế toán sẽ thực hiện Báo Có tại phân hệ Tài Chính.
                </p>
            </div>
        </div>
    );
}