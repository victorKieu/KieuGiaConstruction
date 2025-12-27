import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";

// UI Components
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CardListSkeleton } from "@/components/ui/skeletons/card-list-skeleton";

// Business Components
import { CustomerActivities } from "@/components/crm/customer-activities";
import { CustomerContracts } from "@/components/crm/customer-contracts";
import { CustomerNotes } from "@/components/crm/customer-notes";
import { CustomerOpportunities } from "@/components/crm/customer-opportunities";
import { CustomerContactList } from "@/components/crm/CustomerContactList";
import { DeleteCustomerButton } from "@/components/crm/DeleteCustomerButton";
// Data & Utils
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { ArrowLeft, Building, Mail, MapPin, Phone, Globe, CreditCard } from "lucide-react";
import { getInitials } from "@/lib/utils/customer-status"; // Chỉ giữ lại getInitials

interface CustomerPageProps {
    params: Promise<{ id: string }>;
}

export default async function CustomerPage({ params }: CustomerPageProps) {
    // 1. Resolve Params (Next.js 15+)
    const { id } = await params;

    // 2. Data Fetching
    const supabase = await createClient();

    console.log(`[CRM] Fetching customer detail: ${id}`);

    const { data: customer, error } = await supabase
        .from("customers")
        .select(`
            *, 
            type_rel:sys_dictionaries!customers_type_fkey ( name, color, code ),
            status_rel:sys_dictionaries!customers_status_fkey ( name, color, code ),
            source_rel:sys_dictionaries!customers_source_id_fkey ( name, color, code )
        `)
        .eq("id", id)
        .maybeSingle();

    if (error || !customer) {
        console.error(`[CRM] Customer not found or error:`, error);
        notFound();
    }

    // 3. Process Data
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
                        <DeleteCustomerButton id={customer.id} name={customer.name} />
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-7">
                    {/* --- Left Column: Customer Profile Card --- */}
                    <Card className="md:col-span-2 h-fit shadow-sm">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16 border">
                                    <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-xl font-bold text-gray-800">{customer.name}</CardTitle>
                                    {customer.code && (
                                        <p className="text-sm text-gray-500 font-mono mt-1">{customer.code}</p>
                                    )}

                                    {/* --- BADGES AREA --- */}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {/* Badge Loại (Type) */}
                                        {customer.type_rel ? (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${customer.type_rel.color || 'gray'}-100 text-${customer.type_rel.color || 'gray'}-700 border border-${customer.type_rel.color || 'gray'}-200`}>
                                                {customer.type_rel.name}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 border px-2 py-0.5 rounded bg-gray-50">Chưa phân loại</span>
                                        )}

                                        {/* Badge Trạng thái (Status) */}
                                        {customer.status_rel ? (
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-${customer.status_rel.color || 'gray'}-100 text-${customer.status_rel.color || 'gray'}-700 border border-${customer.status_rel.color || 'gray'}-200`}>
                                                {customer.status_rel.name}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-gray-400 border px-2 py-0.5 rounded bg-gray-50">Trạng thái N/A</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 mt-2">
                            <InfoSection title="Thông tin liên hệ">
                                <InfoItem icon={Mail} text={customer.email} label="Email" />
                                <InfoItem icon={Phone} text={customer.phone} label="Điện thoại" />
                                <InfoItem icon={MapPin} text={customer.address} label="Địa chỉ" />
                                <InfoItem icon={Globe} text={customer.website} label="Website" />
                            </InfoSection>

                            <InfoSection title="Thông tin kinh doanh">
                                <InfoItem icon={Building} text={customer.business_type} label="Lĩnh vực" />
                                <InfoItem icon={CreditCard} text={customer.tax_code} label="Mã số thuế" />
                            </InfoSection>

                            <InfoSection title="Thông tin hệ thống">
                                <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-muted-foreground text-xs">Ngày tạo:</span>
                                        <span className="font-medium">{customer.created_at ? format(new Date(customer.created_at), "PPP", { locale: vi }) : "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-2 border-t border-dashed">
                                        <span className="text-muted-foreground text-xs">Nguồn:</span>
                                        <div>
                                            {customer.source_rel ? (
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider bg-${customer.source_rel.color || 'blue'}-50 text-${customer.source_rel.color || 'blue'}-700 border border-${customer.source_rel.color || 'blue'}-200`}>
                                                    {customer.source_rel.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 italic text-xs">Chưa xác định</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </InfoSection>
                        </CardContent>
                    </Card>

                    {/* --- Right Column: Tabs & Details --- */}
                    <Card className="md:col-span-5 border-none shadow-none bg-transparent">
                        <Tabs defaultValue="activities" className="space-y-4">
                            <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-white border rounded-lg shadow-sm">
                                <TabsTrigger value="activities" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Hoạt động</TabsTrigger>
                                <TabsTrigger value="opportunities" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Cơ hội</TabsTrigger>
                                <TabsTrigger value="contracts" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Hợp đồng</TabsTrigger>
                                <TabsTrigger value="contacts" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Liên hệ</TabsTrigger>
                                <TabsTrigger value="notes" className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900">Ghi chú</TabsTrigger>
                            </TabsList>

                            {/* Suspense Boundaries */}
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

// --- Micro Components ---
function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500 border-b border-gray-100 pb-1">{title}</h3>
            <div className="grid gap-3">{children}</div>
        </div>
    );
}

function InfoItem({ icon: Icon, text, label }: { icon: any; text?: string | null; label?: string }) {
    return (
        <div className="flex items-start gap-3 text-sm group">
            <div className="mt-0.5 bg-gray-50 p-1 rounded-md group-hover:bg-primary/10 transition-colors">
                <Icon className="h-3.5 w-3.5 text-gray-500 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex flex-col">
                {label && <span className="text-[10px] text-gray-400 font-medium leading-none mb-1">{label}</span>}
                <span className={`break-words ${!text ? "text-gray-400 italic" : "text-gray-700 font-medium"}`}>
                    {text || "—"}
                </span>
            </div>
        </div>
    );
}