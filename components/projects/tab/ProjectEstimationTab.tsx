"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Calculator } from "lucide-react";
import { formatCurrency } from "@/lib/utils/utils";

interface Props {
    projectId: string;
    // Có thể nhận thêm data từ server component truyền xuống nếu cần
}

export default function ProjectEstimationTab({ projectId }: Props) {
    // Đây là component giữ chỗ (Placeholder) cho module Dự Toán
    // Sau này sẽ code chi tiết giống module Báo giá/QTO

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold flex items-center">
                    <Calculator className="w-5 h-5 mr-2 text-blue-600" />
                    Bảng Dự toán Chi phí (Internal Budget)
                </h3>
                <Button size="sm" className="bg-blue-600">
                    <Plus className="w-4 h-4 mr-2" /> Lập dự toán
                </Button>
            </div>

            <Card>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Hạng mục / Vật tư</TableHead>
                                <TableHead className="text-right">Khối lượng</TableHead>
                                <TableHead className="text-right">Đơn giá gốc</TableHead>
                                <TableHead className="text-right">Thành tiền</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            <TableRow>
                                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                                    Chưa có dữ liệu dự toán. <br />
                                    Tính năng này giúp kiểm soát chi phí nội bộ (Cost Control).
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}