"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Zap } from "lucide-react";

// --- PHẦN FIX: Import Action mới ---
import { runEstimationAnalysis, getEstimationItems } from "@/lib/action/qtoActions";
import type { ActionResponse } from "@/lib/action/projectActions";
import type { EstimationItem } from "@/types/project"; // (Đã fix ở bước 230)
// --- KẾT THÚC FIX ---

import { useActionState } from 'react';
import { formatCurrency } from "@/lib/utils/utils";

interface ProjectEstimationTabProps {
    projectId: string;
    // (Bỏ qtoItems, vì tab này sẽ fetch dữ liệu 'estimation_items' riêng)
}

const initialState: ActionResponse = { success: false, error: undefined, message: undefined };

export default function ProjectEstimationTab({ projectId }: ProjectEstimationTabProps) {

    const [estimationItems, setEstimationItems] = useState<EstimationItem[]>([]);
    const [isLoading, setIsLoading] = useState(true); // <-- Đặt là true

    const [state, formAction, isAnalyzing] = useActionState(runEstimationAnalysis, initialState);

    // --- PHẦN FIX: Hoàn thiện hàm fetch ---
    const fetchEstimationItems = useCallback(async () => {
        setIsLoading(true);
        const result = await getEstimationItems(projectId); // <-- GỌI ACTION MỚI

        if (result.data) {
            setEstimationItems(result.data);
        } else if (result.error) {
            alert(`Lỗi tải dự toán: ${result.error.message}`);
        }
        setIsLoading(false);
    }, [projectId]);

    // Chạy fetch lần đầu khi component mount
    useEffect(() => {
        fetchEstimationItems();
    }, [fetchEstimationItems]);

    // Refresh lại list khi Phân tích thành công
    useEffect(() => {
        if (state.success) {
            alert(state.message);
            fetchEstimationItems(); // Tải lại Bảng Dự toán
        } else if (state.error) {
            alert(`Lỗi Phân tích: ${state.error}`);
        }
    }, [state, fetchEstimationItems]);
    // --- KẾT THÚC FIX ---

    // Tính tổng
    const grandTotal = estimationItems.reduce((total, item) => total + (item.total_cost || 0), 0);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">Dự toán Chi tiết (Phân tích Vật tư)</CardTitle>

                {/* Form gọi Action Phân tích (Logic G8/F1) */}
                <form action={formAction}>
                    <input type="hidden" name="projectId" value={projectId} />
                    <Button type="submit" disabled={isAnalyzing || isLoading}>
                        {isAnalyzing ?
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> :
                            <Zap className="mr-2 h-4 w-4" />}
                        Chạy Phân tích Vật tư
                    </Button>
                </form>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mã hiệu</TableHead>
                            <TableHead>Tên Vật tư/Nhân công/Máy</TableHead>
                            <TableHead className="w-[100px]">Đơn vị</TableHead>
                            <TableHead className="w-[120px] text-right">Khối lượng</TableHead>
                            <TableHead className="w-[150px] text-right">Đơn giá (VND)</TableHead>
                            <TableHead className="w-[150px] text-right">Thành tiền (VND)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center h-24">
                                    <Loader2 className="h-6 w-6 animate-spin inline-block text-gray-400" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && estimationItems.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} className="text-center text-gray-500 h-24">
                                    Bảng dự toán trống.
                                    Hãy qua tab "Bóc tách Khối lượng" để thêm công tác,
                                    sau đó nhấn nút "Chạy Phân tích Vật tư".
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && estimationItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>{item.material_code}</TableCell>
                                <TableCell className="font-medium">{item.material_name}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell className="text-right">{item.quantity.toLocaleString('vi-VN')}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(item.total_cost)}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>

                <div className="mt-4 text-right">
                    <p className="text-lg font-bold">Tổng cộng: {formatCurrency(grandTotal)}</p>
                </div>

                {/* TODO: Giao diện "So giá" (Bước 3) sẽ nằm ở đây */}
                <p className="text-sm text-gray-500 mt-4">
                    (Giao diện So sánh giá Vật liệu sẽ được phát triển ở đây.)
                </p>
            </CardContent>
        </Card>
    );
}