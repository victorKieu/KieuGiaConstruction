"use client"

import { useState, useTransition } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table"
import { Edit, CheckCircle, Trash2, FileText, Loader2, FileSignature } from "lucide-react"
import { formatCurrency } from "@/lib/utils/utils"
import { deleteQuotation, approveQuotation } from "@/lib/action/quotationActions"
import { useRouter } from "next/navigation"

interface QuotationListProps {
    quotations: any[]
    projectId: string
    onEdit: (quotation: any) => void
    onCreateContract?: (quotationId: string) => void
}

export default function QuotationList({ quotations, projectId, onEdit, onCreateContract }: QuotationListProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [processingId, setProcessingId] = useState<string | null>(null)

    // Xử lý xóa báo giá
    const handleDelete = async (id: string) => {
        if (!confirm("Bạn có chắc chắn muốn xóa báo giá này?")) return;

        setProcessingId(id)
        startTransition(async () => {
            const res = await deleteQuotation(id, projectId)
            if (res.success) {
                router.refresh()
            } else {
                alert("Lỗi: " + res.error)
            }
            setProcessingId(null)
        })
    }

    // Xử lý duyệt báo giá
    const handleApprove = async (id: string) => {
        if (!confirm("Xác nhận DUYỆT báo giá này?\nNgân sách dự án sẽ được cập nhật theo báo giá này.")) return;

        setProcessingId(id)
        startTransition(async () => {
            const res = await approveQuotation(id, projectId)
            if (res.success) {
                alert("Đã duyệt thành công! Bây giờ bạn có thể tạo Hợp đồng.")
                router.refresh()
            } else {
                alert("Lỗi: " + res.error)
            }
            setProcessingId(null)
        })
    }

    // Hàm hiển thị Badge trạng thái
    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft': return <Badge variant="secondary" className="bg-slate-200 text-slate-700 hover:bg-slate-300">Nháp</Badge>
            case 'sent': return <Badge className="bg-blue-500 hover:bg-blue-600">Đã gửi khách</Badge>
            case 'accepted': return <Badge className="bg-green-600 hover:bg-green-700">Đã chốt</Badge>
            case 'rejected': return <Badge className="bg-red-500 hover:bg-red-600">Từ chối</Badge>
            default: return <Badge variant="outline">{status}</Badge>
        }
    }

    if (!quotations || quotations.length === 0) {
        return (
            <Card className="border-dashed border-2 shadow-none">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Mã phiếu</TableHead>
                            <TableHead>Ngày lập</TableHead>
                            <TableHead>Tổng tiền</TableHead>
                            <TableHead>Trạng thái</TableHead>
                            <TableHead className="text-right">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 text-gray-500">
                                <div className="flex flex-col items-center justify-center">
                                    <FileText className="w-10 h-10 text-slate-300 mb-2" />
                                    <p>Chưa có báo giá nào.</p>
                                    <p className="text-xs mt-1">Bấm "Tạo Báo Giá" để bắt đầu.</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </Card>
        )
    }

    return (
        <Card className="shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50">
                        <TableHead className="font-semibold">Mã phiếu</TableHead>
                        <TableHead className="font-semibold">Ngày lập</TableHead>
                        <TableHead className="font-semibold">Tổng tiền</TableHead>
                        <TableHead className="font-semibold">Trạng thái</TableHead>
                        <TableHead className="text-right font-semibold">Hành động</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {quotations.map((q) => {
                        const isLoading = isPending && processingId === q.id;

                        return (
                            <TableRow key={q.id} className="hover:bg-slate-50 transition-colors">
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-blue-500" />
                                        {q.quotation_number}
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-600">
                                    {q.issue_date ? new Date(q.issue_date).toLocaleDateString('vi-VN') : '---'}
                                </TableCell>
                                <TableCell className="font-bold text-slate-700">
                                    {/* ✅ FIX: Đổi quoted_amount -> total_amount để khớp với DB */}
                                    {formatCurrency(q.total_amount || 0)}
                                </TableCell>
                                <TableCell>{getStatusBadge(q.status)}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-1">
                                        {q.status !== 'accepted' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => onEdit(q)}
                                                disabled={isLoading}
                                                title="Chỉnh sửa"
                                                className="hover:text-blue-600 hover:bg-blue-50"
                                            >
                                                <Edit className="w-4 h-4" />
                                            </Button>
                                        )}

                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            disabled={isLoading}
                                            onClick={() => handleDelete(q.id)}
                                            title="Xóa báo giá"
                                            className="hover:text-red-600 hover:bg-red-50"
                                        >
                                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                        </Button>

                                        {q.status !== 'accepted' && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Duyệt & Chốt giá"
                                                disabled={isLoading}
                                                onClick={() => handleApprove(q.id)}
                                                className="text-green-600 hover:bg-green-50"
                                            >
                                                <CheckCircle className="w-4 h-4" />
                                            </Button>
                                        )}

                                        {q.status === 'accepted' && onCreateContract && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                title="Tạo Hợp đồng thi công từ báo giá này"
                                                disabled={isLoading}
                                                onClick={() => onCreateContract(q.id)}
                                                className="text-indigo-600 hover:bg-indigo-50 bg-indigo-50/50 border border-indigo-100"
                                            >
                                                <FileSignature className="w-4 h-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </Card>
    )
}