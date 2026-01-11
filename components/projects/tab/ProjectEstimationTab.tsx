"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Calculator, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { createEstimationFromBudget, updateEstimationPrice, getEstimationItems } from "@/lib/action/estimationActions";
import { formatCurrency } from "@/lib/utils/utils";

interface Props {
    projectId: string;
}

export default function ProjectEstimationTab({ projectId }: Props) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [items, setItems] = useState<any[]>([]);
    const [initLoaded, setInitLoaded] = useState(false);

    // Load dữ liệu lần đầu (Client-side fetch để đảm bảo mới nhất sau khi tab switch)
    // Hoặc có thể truyền props từ server component
    React.useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const res = await getEstimationItems(projectId);
        if (res.success) {
            setItems(res.data);
        }
        setInitLoaded(true);
    };

    const handleSync = async () => {
        setLoading(true);
        const res = await createEstimationFromBudget(projectId);
        if (res.success) {
            toast.success(res.message);
            await loadData(); // Reload lại bảng
            router.refresh();
        } else {
            toast.error(res.error);
        }
        setLoading(false);
    };

    const handlePriceChange = async (id: string, newPrice: string) => {
        const price = parseFloat(newPrice) || 0;

        // Optimistic Update (Cập nhật giao diện ngay lập tức)
        setItems(prev => prev.map(item => {
            if (item.id === id) {
                return { ...item, unit_price: price, total_cost: item.quantity * price };
            }
            return item;
        }));

        // Gọi Server lưu (Debounce nếu cần, ở đây gọi trực tiếp onBlur)
        await updateEstimationPrice(id, projectId, price);
        router.refresh(); // Refresh để update tổng tiền dự án trên header nếu có
    };

    // Tính tổng dự toán
    const totalEstimate = items.reduce((sum, item) => sum + (item.total_cost || 0), 0);

    return (
        <div className="space-y-4">
            {/* HEADER & ACTIONS */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-lg border shadow-sm">
                <div>
                    <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                        Bảng Dự toán Chi phí (Vật tư)
                    </h3>
                    <p className="text-sm text-slate-500">Nhập đơn giá cho vật tư để tính tổng chi phí.</p>
                </div>

                <div className="flex items-center gap-2">
                    <div className="bg-purple-50 px-4 py-2 rounded-lg border border-purple-100 text-right mr-4">
                        <span className="text-xs text-purple-600 font-semibold uppercase block">Tổng cộng</span>
                        <span className="text-xl font-bold text-purple-700">{formatCurrency(totalEstimate)}</span>
                    </div>

                    <Button onClick={handleSync} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                        Đồng bộ từ Bảng Vật tư
                    </Button>
                </div>
            </div>

            {/* TABLE */}
            <Card className="border-none shadow-none bg-white">
                <Table className="border rounded-md">
                    <TableHeader>
                        <TableRow className="bg-slate-100">
                            <TableHead className="w-[50px] text-center">STT</TableHead>
                            <TableHead>Tên Vật tư / Hạng mục</TableHead>
                            <TableHead className="w-[100px] text-center">ĐVT</TableHead>
                            <TableHead className="w-[120px] text-right">Khối lượng</TableHead>
                            <TableHead className="w-[150px] text-right">Đơn giá (VNĐ)</TableHead>
                            <TableHead className="w-[150px] text-right">Thành tiền</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {!initLoaded ? (
                            <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                        ) : items.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center py-10 text-slate-500">
                                    Chưa có dữ liệu. Vui lòng bấm nút "Đồng bộ" ở trên.
                                </TableCell>
                            </TableRow>
                        ) : (
                            items.map((item, index) => (
                                <TableRow key={item.id} className="hover:bg-slate-50">
                                    <TableCell className="text-center text-slate-500">{index + 1}</TableCell>
                                    <TableCell className="font-medium text-slate-700">{item.material_name}</TableCell>
                                    <TableCell className="text-center"><Badge variant="outline" className="bg-slate-50">{item.unit}</Badge></TableCell>
                                    <TableCell className="text-right font-semibold text-blue-600">
                                        {Number(item.quantity).toLocaleString('en-US', { maximumFractionDigits: 2 })}
                                    </TableCell>
                                    <TableCell className="text-right p-1">
                                        <Input
                                            type="number"
                                            className="text-right h-8 font-medium focus:ring-purple-500"
                                            defaultValue={item.unit_price}
                                            onBlur={(e) => handlePriceChange(item.id, e.target.value)}
                                            placeholder="0"
                                        />
                                    </TableCell>
                                    <TableCell className="text-right font-bold text-slate-800">
                                        {formatCurrency(item.total_cost || 0)}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>
        </div>
    );
}