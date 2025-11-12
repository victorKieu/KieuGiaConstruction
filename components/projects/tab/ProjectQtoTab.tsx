"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckSquare, Square, ChevronsUpDown, ChevronsDownUp, Loader2 } from "lucide-react";
import QtoCreateModal from "../qto/QtoCreateModal"; // Import Modal
import QtoEditModal from "../qto/QtoEditModal";
import QtoDeleteButton from "../qto/QtoDeleteButton";
// Import các type và actions
import type { QtoItem, QtoTemplate } from "@/types/project";    
import { getQtoItems } from "@/lib/action/qtoActions";
import { formatCurrency } from "@/lib/utils/utils";

interface ProjectQtoTabProps {
    projectId: string;
    qtoItems: QtoItem[]; // Dữ liệu ban đầu (SSR)
    qtoTemplates: QtoTemplate[];
}

export default function ProjectQtoTab({ projectId, qtoItems: initialQtoItems, qtoTemplates }: ProjectQtoTabProps) {

    // State để quản lý danh sách QTO (cho Cập nhật/Tách/Gộp)
    const [qtoItems, setQtoItems] = useState(initialQtoItems);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);

    // Hàm refresh (gọi lại khi Tạo/Sửa/Xóa thành công)
    const triggerRefresh = useCallback(async () => {
        setIsLoading(true);
        const result = await getQtoItems(projectId); // Gọi Server Action
        if (result.data) {
            setQtoItems(result.data as QtoItem[]);
        } else {
            alert("Lỗi khi tải lại dữ liệu QTO.");
        }
        setSelectedItems(new Set()); // Xóa lựa chọn
        setIsLoading(false);
    }, [projectId]);

    const handleSelect = (itemId: string) => {
        setSelectedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            } else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };

    // TODO: Implement Tách/Gộp
    const handleMerge = () => {
        if (selectedItems.size < 2) {
            alert("Vui lòng chọn ít nhất 2 công tác để gộp.");
            return;
        }
        // await mergeQtoItems(projectId, Array.from(selectedItems));
        // triggerRefresh();
        alert("Chức năng GỘP đang được phát triển.");
    };

    const handleSplit = () => {
        if (selectedItems.size !== 1) {
            alert("Vui lòng chọn 1 công tác để tách.");
            return;
        }
        // TODO: Mở Modal Tách (chia quantity)
        alert("Chức năng TÁCH đang được phát triển.");
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-lg font-semibold">Bóc tách Khối lượng (QTO)</CardTitle>
                <div className="flex gap-2">
                    {/* Nút Tách/Gộp (hiện khi có chọn) */}
                    {selectedItems.size > 0 && (
                        <>
                            <Button variant="outline" size="sm" onClick={handleMerge} disabled={selectedItems.size < 2}>
                                <ChevronsDownUp className="mr-2 h-4 w-4" /> Gộp ({selectedItems.size})
                            </Button>
                            <Button variant="outline" size="sm" onClick={handleSplit} disabled={selectedItems.size !== 1}>
                                <ChevronsUpDown className="mr-2 h-4 w-4" /> Tách
                            </Button>
                        </>
                    )}
                    {/* Nút Tạo Mới */}
                    <QtoCreateModal
                        projectId={projectId}
                        qtoTemplates={qtoTemplates}
                        onSuccess={triggerRefresh} // <-- Truyền hàm refresh
                    />
                </div>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>Tên Công tác (Hạng mục)</TableHead>
                            <TableHead className="w-[100px]">Đơn vị</TableHead>
                            <TableHead className="w-[120px] text-right">Khối lượng</TableHead>
                            <TableHead className="w-[150px] text-right">Đơn giá (VND)</TableHead>
                            <TableHead className="w-[150px] text-right">Thành tiền (VND)</TableHead>
                            <TableHead className="w-[120px] text-center">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center">
                                    <Loader2 className="h-6 w-6 animate-spin inline-block" />
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && qtoItems.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} className="text-center text-gray-500">
                                    Chưa có công tác nào. Hãy thêm công tác đầu tiên.
                                </TableCell>
                            </TableRow>
                        )}
                        {!isLoading && qtoItems.map(item => (
                            <TableRow key={item.id}>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleSelect(item.id)} className="h-6 w-6">
                                        {selectedItems.has(item.id) ?
                                            <CheckSquare className="h-4 w-4 text-blue-600" /> :
                                            <Square className="h-4 w-4 text-gray-400" />}
                                    </Button>
                                </TableCell>
                                <TableCell className="font-medium">{item.item_name}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell className="text-right">{item.quantity.toLocaleString('vi-VN')}</TableCell>
                                <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                <TableCell className="text-right font-semibold">{formatCurrency(item.quantity * item.unit_price)}</TableCell>
                                <TableCell className="text-center">
                                    <TableCell className="text-center p-2"> {/* Giảm padding p-2 */}
                                        {/* Đặt các nút Sửa/Xóa trực tiếp */}
                                        <QtoEditModal
                                            item={item}
                                            projectId={projectId}
                                            onSuccess={triggerRefresh}
                                        />
                                        <QtoDeleteButton
                                            itemId={item.id}
                                            projectId={projectId}
                                            onSuccess={triggerRefresh}
                                        />
                                    </TableCell>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}