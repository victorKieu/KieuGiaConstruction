import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { FileText, MoreHorizontal, ExternalLink } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getAllContracts } from "@/lib/action/contract";
import { formatCurrency } from "@/lib/utils/utils";

// Cấu hình màu sắc cho trạng thái hợp đồng
const STATUS_MAP: Record<string, { label: string; color: string }> = {
    draft: { label: "Bản nháp", color: "bg-gray-100 text-gray-800" },
    signed: { label: "Đã ký", color: "bg-blue-100 text-blue-800" },
    processing: { label: "Đang thi công", color: "bg-orange-100 text-orange-800" },
    warranty: { label: "Bảo hành", color: "bg-purple-100 text-purple-800" },
    liquidated: { label: "Đã thanh lý", color: "bg-green-100 text-green-800" },
    cancelled: { label: "Đã hủy", color: "bg-red-100 text-red-800" },
};

export async function ContractList() {
    const contracts = await getAllContracts();

    if (!contracts || contracts.length === 0) {
        return <EmptyContracts />;
    }

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[100px]">Số HĐ</TableHead>
                        <TableHead>Tên gói thầu</TableHead>
                        <TableHead>Khách hàng</TableHead>
                        <TableHead>Giá trị</TableHead>
                        <TableHead>Ngày ký</TableHead>
                        <TableHead>Trạng thái</TableHead>
                        <TableHead className="text-right">Thao tác</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {contracts.map((contract) => {
                        const status = STATUS_MAP[contract.status] || { label: contract.status, color: "bg-gray-100" };

                        return (
                            <TableRow key={contract.id}>
                                <TableCell className="font-medium text-xs font-mono">{contract.contract_number}</TableCell>
                                <TableCell>
                                    <Link href={`/crm/contracts/${contract.id}`} className="hover:underline font-medium text-blue-700">
                                        {contract.title}
                                    </Link>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-2">
                                        <Avatar className="h-6 w-6">
                                            <AvatarFallback className="text-[10px]">
                                                {contract.customers?.name?.substring(0, 2).toUpperCase()}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="text-sm truncate max-w-[150px]">{contract.customers?.name}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="font-medium">{formatCurrency(contract.value)}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                    {contract.signed_date ? format(new Date(contract.signed_date), "dd/MM/yyyy") : "-"}
                                </TableCell>
                                <TableCell>
                                    <Badge variant="outline" className={`border-0 ${status.color}`}>
                                        {status.label}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                <span className="sr-only">Open menu</span>
                                                <MoreHorizontal className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                                            <DropdownMenuItem asChild>
                                                <Link href={`/crm/contracts/${contract.id}`}>Xem chi tiết</Link>
                                            </DropdownMenuItem>
                                            <DropdownMenuItem>Tải bản PDF</DropdownMenuItem>
                                            <DropdownMenuItem className="text-red-600">Hủy hợp đồng</DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </TableCell>
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}

function EmptyContracts() {
    return (
        <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md bg-muted/10">
            <FileText className="h-10 w-10 text-muted-foreground mb-3" />
            <h3 className="text-lg font-medium">Chưa có hợp đồng nào</h3>
            <p className="text-sm text-muted-foreground mb-4">
                Hệ thống chưa ghi nhận hợp đồng nào được tạo.
            </p>
            <Button variant="outline" asChild>
                <Link href="/crm/contracts/new">Tạo hợp đồng mới</Link>
            </Button>
        </div>
    )
}