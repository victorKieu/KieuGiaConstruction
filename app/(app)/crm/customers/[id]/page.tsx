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
import { getInitials } from "@/lib/utils/customer-status";

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
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 transition-colors duration-500 min-h-screen">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">

                {/* --- Header Navigation & Actions --- */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="icon" className="dark:border-slate-800 dark:bg-slate-900 dark:hover:bg-slate-800 transition-colors" asChild>
                            <Link href="/crm/customers">
                                <ArrowLeft className="h-4 w-4" />
                            </Link>
                        </Button>
                        <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100 transition-colors">Chi tiết khách hàng</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button asChild variant="secondary" className="dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors">
                            <Link href={`/crm/customers/${customer.id}/edit`}>Chỉnh sửa</Link>
                        </Button>
                        <Button variant="secondary" className="dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 transition-colors">Liên hệ</Button>
                        <DeleteCustomerButton id={customer.id} name={customer.name} />
                    </div>
                </div>

                <div className="grid gap-6 md:grid-cols-7 pt-2">
                    {/* --- Left Column: Customer Profile Card --- */}
                    <Card className="md:col-span-2 h-fit shadow-sm border-slate-200 dark:border-slate-800 dark:bg-slate-900 transition-colors">
                        <CardHeader className="pb-2">
                            <div className="flex items-center gap-4">
                                <Avatar className="h-16 w-16 border border-slate-200 dark:border-slate-700">
                                    <AvatarFallback className="text-xl bg-primary/10 text-primary font-bold">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <CardTitle className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">{customer.name}</CardTitle>
                                    {customer.code && (
                                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono mt-1">{customer.code}</p>
                                    )}

                                    {/* --- BADGES AREA --- */}
                                    <div className="mt-3 flex flex-wrap gap-2">
                                        {/* Badge Loại (Type) */}
                                        {customer.type_rel ? (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-${customer.type_rel.color || 'blue'}-100 dark:bg-${customer.type_rel.color || 'blue'}-500/20 text-${customer.type_rel.color || 'blue'}-700 dark:text-${customer.type_rel.color || 'blue'}-400 border border-${customer.type_rel.color || 'blue'}-200 dark:border-${customer.type_rel.color || 'blue'}-800 transition-colors`}>
                                                {customer.type_rel.name}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50 transition-colors">Chưa phân loại</span>
                                        )}

                                        {/* Badge Trạng thái (Status) */}
                                        {customer.status_rel ? (
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider bg-${customer.status_rel.color || 'green'}-100 dark:bg-${customer.status_rel.color || 'green'}-500/20 text-${customer.status_rel.color || 'green'}-700 dark:text-${customer.status_rel.color || 'green'}-400 border border-${customer.status_rel.color || 'green'}-200 dark:border-${customer.status_rel.color || 'green'}-800 transition-colors`}>
                                                {customer.status_rel.name}
                                            </span>
                                        ) : (
                                            <span className="text-[10px] uppercase font-bold text-slate-400 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-md bg-slate-50 dark:bg-slate-800/50 transition-colors">Trạng thái N/A</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-6 mt-4">
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
                                <div className="grid gap-3 text-sm">
                                    <div className="flex justify-between items-center">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Ngày tạo:</span>
                                        <span className="font-semibold text-slate-800 dark:text-slate-200">{customer.created_at ? format(new Date(customer.created_at), "dd/MM/yyyy", { locale: vi }) : "N/A"}</span>
                                    </div>
                                    <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800 border-dashed transition-colors">
                                        <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Nguồn:</span>
                                        <div>
                                            {customer.source_rel ? (
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider bg-${customer.source_rel.color || 'blue'}-50 dark:bg-${customer.source_rel.color || 'blue'}-500/10 text-${customer.source_rel.color || 'blue'}-700 dark:text-${customer.source_rel.color || 'blue'}-400 border border-${customer.source_rel.color || 'blue'}-200 dark:border-${customer.source_rel.color || 'blue'}-800/50 transition-colors`}>
                                                    {customer.source_rel.name}
                                                </span>
                                            ) : (
                                                <span className="text-slate-400 dark:text-slate-500 italic text-xs">Chưa xác định</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </InfoSection>
                        </CardContent>
                    </Card>

                    {/* --- Right Column: Tabs & Details --- */}
                    <div className="md:col-span-5">
                        <Tabs defaultValue="activities" className="space-y-4">
                            <TabsList className="w-full justify-start overflow-x-auto h-auto p-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm transition-colors">
                                <TabsTrigger value="activities" className="rounded-lg data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 font-semibold transition-colors">Hoạt động</TabsTrigger>
                                <TabsTrigger value="opportunities" className="rounded-lg data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 font-semibold transition-colors">Cơ hội</TabsTrigger>
                                <TabsTrigger value="contracts" className="rounded-lg data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 font-semibold transition-colors">Hợp đồng</TabsTrigger>
                                <TabsTrigger value="contacts" className="rounded-lg data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 font-semibold transition-colors">Liên hệ</TabsTrigger>
                                <TabsTrigger value="notes" className="rounded-lg data-[state=active]:bg-slate-100 dark:data-[state=active]:bg-slate-800 data-[state=active]:text-slate-900 dark:data-[state=active]:text-slate-100 font-semibold transition-colors">Ghi chú</TabsTrigger>
                            </TabsList>

                            {/* Suspense Boundaries */}
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 md:p-6 shadow-sm min-h-[500px] transition-colors">
                                <TabsContent value="activities" className="mt-0 outline-none">
                                    <Suspense fallback={<CardListSkeleton count={3} />}>
                                        <CustomerActivities customerId={id} />
                                    </Suspense>
                                </TabsContent>

                                <TabsContent value="opportunities" className="mt-0 outline-none">
                                    <Suspense fallback={<CardListSkeleton count={2} />}>
                                        <CustomerOpportunities customerId={id} />
                                    </Suspense>
                                </TabsContent>

                                <TabsContent value="contracts" className="mt-0 outline-none">
                                    <Suspense fallback={<CardListSkeleton count={2} />}>
                                        <CustomerContracts customerId={id} />
                                    </Suspense>
                                </TabsContent>

                                <TabsContent value="contacts" className="mt-0 outline-none">
                                    <Suspense fallback={<CardListSkeleton count={4} headerHeight="h-12" contentHeight="h-16" />}>
                                        <CustomerContactList customerId={id} />
                                    </Suspense>
                                </TabsContent>

                                <TabsContent value="notes" className="mt-0 outline-none">
                                    <Suspense fallback={<CardListSkeleton count={3} />}>
                                        <CustomerNotes customerId={id} />
                                    </Suspense>
                                </TabsContent>
                            </div>
                        </Tabs>
                    </div>
                </div>
            </div>
        </div>
    );
}

// --- Micro Components ---
function InfoSection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div className="space-y-3">
            <h3 className="text-[11px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-1.5 transition-colors">{title}</h3>
            <div className="grid gap-3">{children}</div>
        </div>
    );
}

function InfoItem({ icon: Icon, text, label }: { icon: any; text?: string | null; label?: string }) {
    return (
        <div className="flex items-start gap-3 text-sm group">
            <div className="mt-0.5 bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 p-1.5 rounded-md group-hover:bg-primary/10 dark:group-hover:bg-primary/20 transition-colors">
                <Icon className="h-4 w-4 text-slate-500 dark:text-slate-400 group-hover:text-primary transition-colors" />
            </div>
            <div className="flex flex-col min-w-0">
                {label && <span className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wide leading-none mb-1 transition-colors">{label}</span>}
                <span className={`truncate block w-full ${!text ? "text-slate-400 dark:text-slate-600 italic" : "text-slate-800 dark:text-slate-200 font-medium"} transition-colors`}>
                    {text || "—"}
                </span>
            </div>
        </div>
    );
}