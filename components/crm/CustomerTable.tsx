"use client";

import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Edit, Eye, MoreHorizontal, Phone, Mail, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteCustomerButton } from "@/components/crm/DeleteCustomerButton";

interface CustomerTableProps {
    data: any[];
}

export function CustomerTable({ data }: CustomerTableProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-border rounded-md bg-muted/30">
                <p className="text-muted-foreground mb-4">Không tìm thấy dữ liệu nào.</p>
                <Button variant="outline" asChild className="border-dashed border-border hover:bg-muted/50">
                    <Link href="/crm/customers/new">
                        <PlusCircle className="mr-2 h-4 w-4" /> Tạo khách hàng mới
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="rounded-md border border-border bg-card">
            <Table>
                <TableHeader className="bg-muted/50">
                    <TableRow className="hover:bg-transparent">
                        <TableHead className="font-medium text-muted-foreground uppercase text-xs">Khách hàng</TableHead>
                        <TableHead className="font-medium text-muted-foreground uppercase text-xs">Liên hệ</TableHead>
                        <TableHead className="font-medium text-muted-foreground uppercase text-xs">Phân loại</TableHead>
                        <TableHead className="font-medium text-muted-foreground uppercase text-xs">Trạng thái</TableHead>
                        <TableHead className="font-medium text-muted-foreground uppercase text-xs">Nguồn</TableHead>
                        <TableHead className="font-medium text-muted-foreground uppercase text-xs hidden md:table-cell">Ngày tạo</TableHead>
                        <TableHead className="font-medium text-muted-foreground uppercase text-xs text-right">Thao tác</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((customer) => (
                        <TableRow key={customer.id} className="hover:bg-muted/50 transition-colors">
                            <TableCell>
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs border border-primary/20">
                                        {getInitials(customer.name)}
                                    </div>
                                    <div className="flex flex-col">
                                        <Link href={`/crm/customers/${customer.id}`} className="font-medium text-foreground hover:text-primary hover:underline transition-colors">
                                            {customer.name}
                                        </Link>
                                        {customer.code && <span className="text-[10px] text-muted-foreground font-mono">{customer.code}</span>}
                                    </div>
                                </div>
                            </TableCell>

                            <TableCell>
                                <div className="flex flex-col gap-1 text-sm">
                                    {customer.phone && (
                                        <div className="flex items-center gap-1.5 text-foreground/80">
                                            <Phone className="h-3 w-3 text-muted-foreground" /> <span>{customer.phone}</span>
                                        </div>
                                    )}
                                    {customer.email && (
                                        <div className="flex items-center gap-1.5 text-muted-foreground">
                                            <Mail className="h-3 w-3" /> <span className="truncate max-w-[150px]" title={customer.email}>{customer.email}</span>
                                        </div>
                                    )}
                                </div>
                            </TableCell>

                            <TableCell>
                                {customer.type_rel ? (
                                    <span
                                        className="inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border"
                                        style={{
                                            backgroundColor: `var(--${customer.type_rel.color}-50, rgba(var(--primary), 0.1))`,
                                            color: `var(--${customer.type_rel.color}-700, var(--primary))`,
                                            borderColor: `var(--${customer.type_rel.color}-200, rgba(var(--primary), 0.2))`
                                        }}
                                    >
                                        {customer.type_rel.name}
                                    </span>
                                ) : <span className="text-muted-foreground text-xs">-</span>}
                            </TableCell>

                            <TableCell>
                                {customer.status_rel ? (
                                    <div className="flex items-center gap-2 text-sm">
                                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: `var(--${customer.status_rel.color}-500, gray)` }} />
                                        <span className="text-foreground">{customer.status_rel.name}</span>
                                    </div>
                                ) : <span className="text-muted-foreground text-xs">-</span>}
                            </TableCell>

                            <TableCell className="text-muted-foreground text-sm">{customer.source_rel?.name || "-"}</TableCell>

                            <TableCell className="text-muted-foreground text-sm hidden md:table-cell">
                                {customer.created_at ? format(new Date(customer.created_at), "dd/MM/yyyy", { locale: vi }) : "-"}
                            </TableCell>

                            <TableCell className="text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-muted">
                                            <MoreHorizontal className="h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuLabel>Hành động</DropdownMenuLabel>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/crm/customers/${customer.id}`} className="cursor-pointer">
                                                <Eye className="mr-2 h-4 w-4" /> Xem chi tiết
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem asChild>
                                            <Link href={`/crm/customers/${customer.id}/edit`} className="cursor-pointer">
                                                <Edit className="mr-2 h-4 w-4" /> Chỉnh sửa
                                            </Link>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <div className="p-1">
                                            <DeleteCustomerButton id={customer.id} name={customer.name} />
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </div>
    );
}

function getInitials(name: string | null) {
    if (!name) return "KH";
    const words = name.trim().split(/\s+/);
    if (words.length === 1) return words[0].substring(0, 2).toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}