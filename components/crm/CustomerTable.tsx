"use client";

import Link from "next/link";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Edit, Eye, MoreHorizontal, Phone, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteCustomerButton } from "@/components/crm/DeleteCustomerButton"; // Tận dụng nút xóa đã sửa ở bước trước

interface CustomerTableProps {
    data: any[]; // Bạn có thể thay 'any' bằng interface Customer cụ thể nếu muốn chặt chẽ hơn
}

export function CustomerTable({ data }: CustomerTableProps) {
    if (!data || data.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md bg-gray-50 border-dashed">
                <p className="text-gray-500 mb-2">Không tìm thấy dữ liệu nào.</p>
                <Button variant="outline" asChild>
                    <Link href="/crm/customers/new">Tạo khách hàng mới</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="w-full overflow-auto">
            <table className="w-full text-sm text-left border-collapse">
                <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                    <tr>
                        <th className="px-4 py-3 font-medium">Khách hàng</th>
                        <th className="px-4 py-3 font-medium">Liên hệ</th>
                        <th className="px-4 py-3 font-medium">Phân loại</th>
                        <th className="px-4 py-3 font-medium">Trạng thái</th>
                        <th className="px-4 py-3 font-medium">Nguồn</th>
                        <th className="px-4 py-3 font-medium hidden md:table-cell">Ngày tạo</th>
                        <th className="px-4 py-3 font-medium text-right">Thao tác</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.map((customer) => (
                        <tr key={customer.id} className="hover:bg-gray-50/50 transition-colors">
                            {/* Cột Tên */}
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {/* Avatar Initials */}
                                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                                        {getInitials(customer.name)}
                                    </div>
                                    <div className="flex flex-col">
                                        <Link
                                            href={`/crm/customers/${customer.id}`}
                                            className="font-medium text-gray-900 hover:text-primary hover:underline"
                                        >
                                            {customer.name}
                                        </Link>
                                        {customer.code && (
                                            <span className="text-[10px] text-gray-500 font-mono">{customer.code}</span>
                                        )}
                                    </div>
                                </div>
                            </td>

                            {/* Cột Liên hệ */}
                            <td className="px-4 py-3">
                                <div className="flex flex-col gap-1">
                                    {customer.phone && (
                                        <div className="flex items-center gap-1.5 text-gray-600">
                                            <Phone className="h-3 w-3" />
                                            <span>{customer.phone}</span>
                                        </div>
                                    )}
                                    {customer.email && (
                                        <div className="flex items-center gap-1.5 text-gray-500">
                                            <Mail className="h-3 w-3" />
                                            <span className="truncate max-w-[150px]">{customer.email}</span>
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* Cột Phân loại (Type) */}
                            <td className="px-4 py-3">
                                {customer.type_rel ? (
                                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-semibold border bg-${customer.type_rel.color || 'gray'}-50 text-${customer.type_rel.color || 'gray'}-700 border-${customer.type_rel.color || 'gray'}-200`}>
                                        {customer.type_rel.name}
                                    </span>
                                ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                )}
                            </td>

                            {/* Cột Trạng thái (Status) */}
                            <td className="px-4 py-3">
                                {customer.status_rel ? (
                                    <div className="flex items-center gap-2">
                                        <span className={`h-2 w-2 rounded-full bg-${customer.status_rel.color || 'gray'}-500`} />
                                        <span className="text-gray-700">{customer.status_rel.name}</span>
                                    </div>
                                ) : (
                                    <span className="text-gray-400 text-xs">-</span>
                                )}
                            </td>

                            {/* Cột Nguồn */}
                            <td className="px-4 py-3 text-gray-500">
                                {customer.source_rel?.name || "-"}
                            </td>

                            {/* Cột Ngày tạo */}
                            <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                                {customer.created_at
                                    ? format(new Date(customer.created_at), "dd/MM/yyyy", { locale: vi })
                                    : "-"}
                            </td>

                            {/* Cột Thao tác */}
                            <td className="px-4 py-3 text-right">
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
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
                                        {/* Chúng ta không nhúng DeleteCustomerButton trực tiếp vào MenuItem vì nó là Dialog. 
                        Nên để nó ở ngoài hoặc render custom. 
                        Ở đây tôi dùng DropdownMenuItem chặn sự kiện để hiển thị Dialog bên trong (hơi phức tạp),
                        Hoặc đơn giản là để nút xóa ở ngoài bảng nếu muốn nhanh.
                        Tuy nhiên, cách tốt nhất là render custom item:
                    */}
                                        <div className="p-1">
                                            <DeleteCustomerButton id={customer.id} name={customer.name} />
                                        </div>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

// Helper function để lấy chữ cái đầu tên
function getInitials(name: string | null) {
    if (!name) return "KH";
    return name
        .match(/(\b\S)?/g)
        ?.join("")
        .match(/(^\S|\S$)?/g)
        ?.join("")
        .toUpperCase()
        .slice(0, 2);
}