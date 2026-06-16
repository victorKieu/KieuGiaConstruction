import { notFound } from "next/navigation";
import { Building2, Info, MapPin, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";
import { generateGoogleMapsDirLink } from "@/lib/utils/gmaps";
import VendorQuoteForm from "@/components/procurement/VendorQuoteForm";

export const dynamic = "force-dynamic";

export default async function OpenRfqPortalPage({ params }: { params: Promise<{ token: string }> }) {
    const { token } = await params;
    const supabase = await createClient();

    const { data: rfq, error } = await supabase
        .from('rfqs')
        .select(`
            id, code, deadline,
            project:projects(name, address, latitude, longitude, geocode),
            items:rfq_items(*)
        `)
        .eq('public_token', token)
        .single();

    if (error || !rfq) return notFound();

    const project: any = Array.isArray(rfq.project) ? rfq.project[0] : rfq.project;
    const isExpired = new Date() > new Date(rfq.deadline);

    const mapLink = generateGoogleMapsDirLink({
        latitude: project?.latitude, longitude: project?.longitude,
        geocode: project?.geocode, address: project?.address || project?.name
    });

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-4 md:p-8 font-sans transition-colors duration-500">
            <div className="max-w-7xl mx-auto space-y-6">

                <div className="flex flex-col md:flex-row items-center justify-between border-b dark:border-slate-800 pb-6 gap-4">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="w-12 h-12 bg-emerald-600 text-white rounded-xl flex items-center justify-center shadow-md">
                            <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">Cổng Mời Thầu Công Khai (Open RFQ)</h1>
                            <p className="text-sm text-slate-500">Mã gói thầu: <span className="font-semibold text-slate-700 dark:text-slate-300">{rfq.code}</span></p>
                        </div>
                    </div>
                    <Badge className="bg-emerald-500 text-white animate-pulse px-3 py-1 border-none">Đang tiếp nhận hồ sơ</Badge>
                </div>

                {isExpired ? (
                    <Card className="border-red-200 bg-red-50 dark:bg-red-950/20 max-w-md mx-auto">
                        <CardContent className="p-6 text-center text-red-600 font-bold mt-4">
                            <Clock className="w-12 h-12 text-red-500 mx-auto mb-3" />
                            Đã hết hạn nộp thầu
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                        <div className="lg:col-span-1">
                            <Card className="border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900">
                                <CardHeader className="pb-3 border-b dark:border-slate-800">
                                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                                        <Info className="w-4 h-4 text-blue-500" /> Yêu cầu giao hàng
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-4 text-sm">
                                    <div><span className="text-xs text-slate-400 block mb-0.5">Dự án</span><p className="font-bold text-slate-800 dark:text-slate-200">{project?.name}</p></div>
                                    <a href={mapLink} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 w-full py-3 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400 dark:hover:bg-blue-950 font-bold text-sm rounded-xl transition-all border border-blue-200/60 dark:border-blue-900/40 shadow-sm">
                                        <MapPin className="w-4 h-4" /> Xem bản đồ thi công
                                    </a>
                                    <div className="flex items-center gap-3 bg-orange-50 dark:bg-orange-950/20 p-3 rounded-xl border border-orange-100 dark:border-orange-900/30">
                                        <Clock className="w-4 h-4 text-orange-500" />
                                        <div><span className="text-xs font-bold text-orange-800 dark:text-orange-400 uppercase block">Chốt sổ lúc</span><p className="font-semibold text-orange-700 dark:text-orange-400">{new Date(rfq.deadline).toLocaleString('vi-VN')}</p></div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <div className="lg:col-span-2">
                                <VendorQuoteForm rfqId={rfq.id} items={rfq.items} isOpenLink={true} />
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}