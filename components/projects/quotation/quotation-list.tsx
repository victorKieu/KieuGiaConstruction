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
            case 'draft': return <Badge variant="secondary" className="bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors border-none">Nháp</Badge>
            case 'sent': return <Badge className="bg-blue-500 hover:bg-blue-600 border-none">Đã gửi khách</Badge>
            case 'accepted': return <Badge className="bg-green-600 hover:bg-green-700 border-none">Đã chốt</Badge>
            case 'rejected': return <Badge className="bg-red-500 hover:bg-red-600 border-none">Từ chối</Badge>
            default: return <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-300">{status}</Badge>
        }
    }

    if (!quotations || quotations.length === 0) {
        return (
            <Card className="border-dashed border-2 border-slate-200 dark:border-slate-800 shadow-none bg-transparent transition-colors">
                <Table>
                    <TableHeader>
                        <TableRow className="border-b dark:border-slate-800">
                            <TableHead className="dark:text-slate-400">Mã phiếu</TableHead>
                            <TableHead className="dark:text-slate-400">Ngày lập</TableHead>
                            <TableHead className="dark:text-slate-400">Tổng tiền</TableHead>
                            <TableHead className="dark:text-slate-400">Trạng thái</TableHead>
                            <TableHead className="text-right dark:text-slate-400">Hành động</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        <TableRow className="hover:bg-transparent border-none">
                            <TableCell colSpan={5} className="text-center py-12 text-slate-500 dark:text-slate-400 transition-colors">
                                <div className="flex flex-col items-center justify-center">
                                    <FileText className="w-10 h-10 text-slate-300 dark:text-slate-600 mb-2 transition-colors" />
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
        <Card className="shadow-sm border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 transition-colors overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 transition-colors">
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">Mã phiếu</TableHead>
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">Ngày lập</TableHead>
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">Tổng tiền</TableHead>
                        <TableHead className="font-bold text-slate-800 dark:text-slate-200">Trạng thái</TableHead>
                        <TableHead className="text-right font-bold text-slate-800 dark:text-slate-200">Hành động</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {quotations.map((q) => {
                        const isLoading = isPending && processingId === q.id;

                        return (
                            <TableRow key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-none">
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                                        <FileText className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                                        {q.quotation_number}
                                    </div>
                                </TableCell>
                                <TableCell className="text-slate-600 dark:text-slate-400">
                                    {q.issue_date ? new Date(q.issue_date).toLocaleDateString('vi-VN') : '---'}
                                </TableCell>
                                <TableCell className="font-bold text-slate-700 dark:text-slate-200">
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
                                                className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
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
                                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
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
                                                className="text-slate-400 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/30 transition-colors"
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
                                                className="text-indigo-600 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-500/10 hover:bg-indigo-100 dark:hover:bg-indigo-500/30 border border-indigo-100 dark:border-indigo-500/20 transition-colors"
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