"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomerList } from "@/lib/action/crmActions";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { Pagination } from "@/components/ui/pagination";
import { Customer } from "@/types/crm"; 


type StatusType = "all" | "active" | "inactive" | "lead";
type TagType = "all" | string;

interface FilterType {
    search: string;
    status: StatusType;
    tag: TagType;
}

interface CustomersListProps {
    filters: FilterType;
}

export function CustomersList({ filters }: CustomersListProps) {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [totalCount, setTotalCount] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 6;

    useEffect(() => {
        async function fetchCustomers() {
            setIsLoading(true);
            try {
                const customerList = await getCustomerList(filters);
                setCustomers(customerList);
                setTotalCount(customerList.length); // Nếu API hỗ trợ total count riêng thì thay thế
            } catch (error) {
                console.error("Error fetching customers:", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchCustomers();
    }, [filters]);

    const totalPages = Math.ceil(totalCount / pageSize);

    if (isLoading) {
        return (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array(6)
                    .fill(0)
                    .map((_, i) => (
                        <Card key={i} className="animate-pulse">
                            <CardHeader className="h-24 bg-muted/20"></CardHeader>
                            <CardContent className="h-32 bg-muted/10"></CardContent>
                        </Card>
                    ))}
            </div>
        );
    }

    if (customers.length === 0) {
        return (
            <div className="text-center py-10">
                <h3 className="text-lg font-medium">Không tìm thấy khách hàng nào</h3>
                <p className="text-muted-foreground mt-2">Thử thay đổi bộ lọc hoặc thêm khách hàng mới</p>
                <Button className="mt-4" asChild>
                    <Link href="/crm/customers/new">Thêm khách hàng</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {customers.map((customer) => {
                    const initials = customer.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()
                        .substring(0, 2);

                    return (
                        <Card key={customer.id} className="overflow-hidden">
                            <CardHeader className="pb-2">
                                <div className="flex items-center gap-4">
                                    <Avatar className="h-10 w-10">
                                        <AvatarFallback>{initials}</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <CardTitle className="text-base">
                                            <Link href={`/crm/customers/${customer.id}`} className="hover:underline">
                                                {customer.name}
                                            </Link>
                                        </CardTitle>
                                        <CardDescription className="text-xs">
                                            {format(new Date(customer.created_at), "PPP", { locale: vi })}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-2">
                                <div className="grid gap-2 text-sm">
                                    <div className="grid grid-cols-4 gap-1">
                                        <div className="text-muted-foreground">Email:</div>
                                        <div className="col-span-3 truncate">{customer.email}</div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        <div className="text-muted-foreground">Điện thoại:</div>
                                        <div className="col-span-3">{customer.phone || "Chưa cập nhật"}</div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        <div className="text-muted-foreground">Địa chỉ:</div>
                                        <div className="col-span-3 truncate">{customer.address || "Chưa cập nhật"}</div>
                                    </div>
                                    <div className="grid grid-cols-4 gap-1">
                                        <div className="text-muted-foreground">Trạng thái:</div>
                                        <div className="col-span-3">
                                            <span
                                                className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${customer.status === "active"
                                                        ? "bg-green-100 text-green-800"
                                                        : customer.status === "inactive"
                                                            ? "bg-gray-100 text-gray-800"
                                                            : "bg-yellow-100 text-yellow-800"
                                                    }`}
                                            >
                                                {customer.status === "active"
                                                    ? "Đang hoạt động"
                                                    : customer.status === "inactive"
                                                        ? "Không hoạt động"
                                                        : "Tiềm năng"}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-2">
                                <Button variant="outline" size="sm" asChild className="w-full">
                                    <Link href={`/crm/customers/${customer.id}`}>Xem chi tiết</Link>
                                </Button>
                            </CardFooter>
                        </Card>
                    );
                })}
            </div>

            {totalPages > 1 && (
                <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
            )}
        </div>
    );
}
