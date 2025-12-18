import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// UI Components
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardListSkeleton } from "@/components/ui/skeletons/card-list-skeleton"; // Import skeleton chung

// Business Components
import { CustomerActivities } from "@/components/crm/customer-activities";
import { CustomerContracts } from "@/components/crm/customer-contracts";
import { CustomerNotes } from "@/components/crm/customer-notes";
import { CustomerOpportunities } from "@/components/crm/customer-opportunities";
import { CustomerContactList } from "@/components/crm/CustomerContactList";
import { DeleteCustomerButton } from "@/components/crm/DeleteCustomerButton";

// Data & Utils
import { createClient } from "@/lib/supabase/server"; // LƯU Ý: Dùng Server Client
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, Building, Mail, MapPin, Phone } from "lucide-react";
import { getCustomerStatusConfig, getInitials } from "@/lib/utils/customer-status";

interface CustomerPageProps {
    params: Promise<{ id: string }>; // Next.js 15: params là Promise
}

export default async function CustomerPage({ params }: CustomerPageProps) {
    // 1. Resolve Params
    const { id } = await params;

    // 2. Data Fetching (Server-side)
    // Sử dụng hàm createClient chuyên cho server để handle cookies/auth
    const supabase = await createClient();

    console.log(`[CRM] Fetching customer detail: ${id}`);

    const { data: customer, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .maybeSingle();

    if (error || !customer) {
        console.error(`[CRM] Customer not found or error:`, error);
        notFound();
    }

    // 3. Process Data
    const { label: statusLabel, color: statusColor } = getCustomerStatusConfig(customer.status);
    const initials = getInitials(customer.name);

    // 4. Render
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">

                {/* --- Header Navigation & Actions --- */}
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
                    {/* --- Left Column: Customer Profile Card --- */}
                    <Card className="md:col-span-2 h-fit">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16">
                                    <AvatarFallback className="text-xl bg-primary/10 text-primary">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-xl">{customer.name}</CardTitle>
                                    <CardDescription className="mt-1">
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                                            {statusLabel}
                                        </span>
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <InfoSection title="Thông tin liên hệ">
                                <InfoItem icon={Mail} text={customer.email} />
                                <InfoItem icon={Phone} text={customer.phone} />
                                <InfoItem icon={MapPin} text={customer.address} />
                                <InfoItem icon={Building} text={customer.company} />
                            </InfoSection>

                            <InfoSection title="Thông tin khác">
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Ngày tạo:</span>
                                        <span>{customer.created_at ? format(new Date(customer.created_at), "PPP", { locale: vi }) : "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Nguồn:</span>
                                        <span>{customer.source || "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Loại:</span>
                                        <span>{customer.type || "N/A"}</span>
                                    </div>
                                </div>
                            </InfoSection>
                        </CardContent>
                    </Card>

                    {/* --- Right Column: Tabs & Details --- */}
                    <Card className="md:col-span-5 border-none shadow-none bg-transparent">
                        {/* Bỏ Card bao ngoài Tabs để giao diện thoáng hơn, hoặc giữ lại tùy design system */}
                        <Tabs defaultValue="activities" className="space-y-4">
                            <TabsList className="w-full justify-start overflow-x-auto">
                                <TabsTrigger value="activities">Hoạt động</TabsTrigger>
                                <TabsTrigger value="opportunities">Cơ hội</TabsTrigger>
                                <TabsTrigger value="contracts">Hợp đồng</TabsTrigger>
                                <TabsTrigger value="contacts">Liên hệ</TabsTrigger>
                                <TabsTrigger value="notes">Ghi chú</TabsTrigger>
                            </TabsList>

                            {/* Suspense Boundaries với Skeleton Component tái sử dụng */}
                            <TabsContent value="activities">
                                <Suspense fallback={<CardListSkeleton count={3} />}>
                                    <CustomerActivities customerId={id} />
                                </Suspense>
                            </TabsContent>

                            <TabsContent value="opportunities">
                                <Suspense fallback={<CardListSkeleton count={2} />}>
                                    <CustomerOpportunities customerId={id} />
                                </Suspense>
                            </TabsContent>

                            <TabsContent value="contracts">
                                <Suspense fallback={<CardListSkeleton count={2} />}>
                                    <CustomerContracts customerId={id} />
                                </Suspense>
                            </TabsContent>

                            <TabsContent value="contacts">
                                <Suspense fallback={<CardListSkeleton count={4} headerHeight="h-12" contentHeight="h-16" />}>
                                    <CustomerContactList customerId={id} />
                                </Suspense>
                            </TabsContent>

                            <TabsContent value="notes">
                                <Suspense fallback={<CardListSkeleton count={3} />}>
                                    <CustomerNotes customerId={id} />
                                </Suspense>
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </div>
        </div>
    );
}

// --- Micro Components (Local) để code gọn gàng ---
function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground/90 border-b pb-1">{title}</h3>
            <div className="grid gap-2.5">{children}</div>
        </div>
    );
}

function InfoItem({ icon: Icon, text }: { icon: any; text?: string | null }) {
    return (
        <div className="flex items-start gap-3 text-sm group">
            <Icon className="h-4 w-4 text-muted-foreground mt-0.5 group-hover:text-primary transition-colors" />
            <span className="text-foreground/80 break-words">{text || "Chưa cập nhật"}</span>
        </div>
    );
}