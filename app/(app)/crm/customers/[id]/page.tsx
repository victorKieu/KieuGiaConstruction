//"use client"; // Đảm bảo rằng đây là client component

import { CardFooter } from "@/components/ui/card";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CustomerActivities } from "@/components/crm/customer-activities";
import { CustomerContracts } from "@/components/crm/customer-contracts";
import { CustomerNotes } from "@/components/crm/customer-notes";
import { CustomerOpportunities } from "@/components/crm/customer-opportunities";
import supabase from '@/lib/supabase/client';
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, Building, Mail, MapPin, Phone } from "lucide-react";
import { DeleteCustomerButton } from "../../../../../components/crm/DeleteCustomerButton";


export default async function CustomerPage({
    params,
}: {
    params: Promise<{ id: string }>;
}) {
    const { id } = await params; // Await params here

    // Lấy thông tin khách hàng
    const { data: customer, error } = await supabase.from("customers").select("*").eq("id", id).single();

    if (error || !customer) {
        notFound();
    }

    // Lấy chữ cái đầu tiên của tên khách hàng cho avatar
    const initials = customer.name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .substring(0, 2);

    // Xác định trạng thái khách hàng
    const statusColors: Record<string, string> = {
        active: "bg-green-100 text-green-800",
        inactive: "bg-gray-100 text-gray-800",
        lead: "bg-yellow-100 text-yellow-800",
    };

    const statusLabels: Record<string, string> = {
        active: "Đang hoạt động",
        inactive: "Không hoạt động",
        lead: "Tiềm năng",
    };

    const statusColor = statusColors[customer.status] || "bg-gray-100 text-gray-800";
    const statusLabel = statusLabels[customer.status] || customer.status;

    return (
        <div className="flex flex-col">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" asChild>
                            <Link href="/crm/customers">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h2 className="text-3xl font-bold tracking-tight">Chi tiết khách hàng</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="secondary">
                            <Link href={`/crm/customers/${customer.id}/edit`}>Chỉnh sửa</Link>
                        </Button>
                        <Button variant="secondary">Liên hệ</Button>
                        <DeleteCustomerButton customerId={customer.id} />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-7">
                    <Card className="md:col-span-2">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-xl">{customer.name}</CardTitle>
                                    <CardDescription>
                                        <span
                                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}
                                        >
                                            {statusLabel}
                                        </span>
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Thông tin liên hệ</h3>
                                <div className="grid gap-2">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{customer.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{customer.phone || "Chưa cập nhật"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{customer.address || "Chưa cập nhật"}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Building className="h-4 w-4 text-muted-foreground" />
                                        <span className="text-sm">{customer.company || "Chưa cập nhật"}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-sm font-medium">Thông tin khác</h3>
                                <div className="grid gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Ngày tạo:</span>
                                        <span className="text-sm">{format(new Date(customer.created_at), "PPP", { locale: vi })}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Nguồn:</span>
                                        <span className="text-sm">{customer.source || "Không xác định"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Loại:</span>
                                        <span className="text-sm">{customer.type || "Không xác định"}</span>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="md:col-span-5">
                        <CardHeader>
                            <CardTitle>Thông tin chi tiết</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="activities" className="space-y-4">
                                <TabsList className="grid grid-cols-4 gap-4">
                                    <TabsTrigger value="activities">Hoạt động</TabsTrigger>
                                    <TabsTrigger value="opportunities">Cơ hội</TabsTrigger>
                                    <TabsTrigger value="contracts">Hợp đồng</TabsTrigger>
                                    <TabsTrigger value="notes">Ghi chú</TabsTrigger>
                                </TabsList>
                                <TabsContent value="activities" className="space-y-4">
                                    <Suspense fallback={<ActivitiesLoading />}>
                                        <CustomerActivities customerId={id} />
                                    </Suspense>
                                </TabsContent>
                                <TabsContent value="opportunities" className="space-y-4">
                                    <Suspense fallback={<OpportunitiesLoading />}>
                                        <CustomerOpportunities customerId={id} />
                                    </Suspense>
                                </TabsContent>
                                <TabsContent value="contracts" className="space-y-4">
                                    <Suspense fallback={<ContractsLoading />}>
                                        <CustomerContracts customerId={id} />
                                    </Suspense>
                                </TabsContent>
                                <TabsContent value="notes" className="space-y-4">
                                    <Suspense fallback={<NotesLoading />}>
                                        <CustomerNotes customerId={id} />
                                    </Suspense>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

function ActivitiesLoading() {
    return (
        <div className="space-y-4">
            {Array(3)
                .fill(0)
                .map((_, i: number) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-16 bg-muted/20"></CardHeader>
                        <CardContent className="h-24 bg-muted/10"></CardContent>
                        <CardFooter className="h-12 bg-muted/20"></CardFooter>
                    </Card>
                ))}
        </div>
    );
}

function OpportunitiesLoading() {
    return (
        <div className="space-y-4">
            {Array(2)
                .fill(0)
                .map((_, i: number) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-16 bg-muted/20"></CardHeader>
                        <CardContent className="h-24 bg-muted/10"></CardContent>
                        <CardFooter className="h-12 bg-muted/20"></CardFooter>
                    </Card>
                ))}
        </div>
    );
}

function ContractsLoading() {
    return (
        <div className="space-y-4">
            {Array(2)
                .fill(0)
                .map((_, i: number) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-16 bg-muted/20"></CardHeader>
                        <CardContent className="h-24 bg-muted/10"></CardContent>
                        <CardFooter className="h-12 bg-muted/20"></CardFooter>
                    </Card>
                ))}
        </div>
    );
}

function NotesLoading() {
    return (
        <div className="space-y-4">
            {Array(3)
                .fill(0)
                .map((_, i: number) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="h-12 bg-muted/20"></CardHeader>
                        <CardContent className="h-20 bg-muted/10"></CardContent>
                        <CardFooter className="h-8 bg-muted/20"></CardFooter>
                    </Card>
                ))}
        </div>
    );
}