import { notFound } from "next/navigation";
import Link from "next/link";
import { getRfqDetails, getBidTabulation } from "@/lib/action/procurement";
import BidTabulation from "@/components/procurement/BidTabulation";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CalendarClock, FileText, Users, Calculator, ArrowLeft } from "lucide-react";
import InviteSupplierClient from "./InviteSupplierClient";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DeleteRfqButton } from "@/components/procurement/DeleteRfqButton"; // Import component chuẩn
import { ExtendDeadlineButton } from "@/components/procurement/ExtendDeadlineButton";
import { toVNDatetimeLocal, formatVNDate } from "@/lib/utils/date";
import { formatDateVN } from "../../../../../lib/utils/utils";

export const dynamic = "force-dynamic";

export default async function RfqDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    // 1. Lấy dữ liệu nguyên bản
    const { rfq, items, invitedSuppliers, allSuppliers } = await getRfqDetails(id) || {};
    const bidData = await getBidTabulation(id);

    if (!rfq) return notFound();

    const safeInvitedSuppliers = (invitedSuppliers || []).map((inv: any) => {
        const supp = Array.isArray(inv.supplier) ? inv.supplier[0] : inv.supplier;
        return {
            ...inv,
            supplier: {
                ...supp,
                // Lấy tax_code đắp vào code, nếu trống thì để "Chưa có mã"
                code: supp?.tax_code || 'Chưa có mã'
            }
        };
    });

    const safeBidData = bidData ? {
        items: items || [],
        suppliers: bidData.suppliers || [],
        bids: bidData.matrix || []
    } : null;

    const getStatusBadge = (status: string) => {
        if (status === 'published') return <Badge className="bg-blue-500">Đang nhận báo giá</Badge>;
        if (status === 'closed') return <Badge className="bg-amber-500">Đã đóng / Chờ duyệt</Badge>;
        if (status === 'completed') return <Badge className="bg-green-600">Đã chốt xong</Badge>;
        return <Badge>{status}</Badge>;
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <Link href="/procurement/rfq" className="flex items-center text-sm font-medium text-slate-500 hover:text-blue-600 mb-2 transition-colors">
                            <ArrowLeft className="w-4 h-4 mr-1" /> Quay lại danh sách
                        </Link>
                        <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold text-slate-800 uppercase tracking-wide">{rfq.code}</h2>
                            {getStatusBadge(rfq.status)}
                        </div>
                        <p className="text-slate-600 dark:text-slate-400 font-medium mt-1">{rfq.title}</p>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
                            <CalendarClock className="w-5 h-5 text-red-500" />
                            <div>
                                <p className="text-xs text-slate-500 font-semibold uppercase">Thời hạn đóng thầu</p>
                                <p className="font-bold text-slate-800">
                                    {formatVNDate(rfq.deadline)}
                                </p>
                            </div>
                        </div>
                        {/* Nút Hủy sử dụng Component Client riêng biệt */}
                        <ExtendDeadlineButton rfqId={rfq.id} currentDeadline={rfq.deadline} />
                        <DeleteRfqButton rfqId={id} />
                    </div>
                </div>

                <Tabs defaultValue="suppliers" className="w-full">
                    <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm h-12">
                        <TabsTrigger value="suppliers" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-6 font-semibold">
                            <Users className="w-4 h-4 mr-2" /> Thông Tin Mời Thầu
                        </TabsTrigger>
                        <TabsTrigger value="items" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-6 font-semibold">
                            <FileText className="w-4 h-4 mr-2" /> Danh mục vật tư ({items?.length})
                        </TabsTrigger>
                        <TabsTrigger value="tabulation" className="data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-700 px-6 font-semibold">
                            <Calculator className="w-4 h-4 mr-2" /> Ma trận so sánh & Chốt giá
                        </TabsTrigger>
                    </TabsList>

                    {/* TAB 1: DANH SÁCH NHÀ CUNG CẤP & LINK MỜI */}
                    <TabsContent value="suppliers" className="mt-4">
                        <InviteSupplierClient
                            rfqId={rfq.id}
                            publicToken={rfq.public_token}
                            invitedSuppliers={safeInvitedSuppliers} // <-- THAY TÊN BIẾN Ở ĐÂY
                            allSuppliers={allSuppliers || []}
                        />
                    </TabsContent>

                    {/* TAB 2: DANH MỤC VẬT TƯ */}
                    <TabsContent value="items" className="mt-4">
                        <div className="border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-950 overflow-hidden rounded-xl">
                            <Table>
                                <TableHeader className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800">
                                    <TableRow>
                                        <TableHead className="w-[60px] text-center font-bold">STT</TableHead>
                                        <TableHead className="w-[120px] font-bold">Mã / Loại</TableHead>
                                        <TableHead className="font-bold min-w-[250px]">Tên Vật tư / Hạng mục</TableHead>
                                        <TableHead className="w-[100px] text-center font-bold">ĐVT</TableHead>
                                        <TableHead className="w-[150px] text-right font-bold">Khối lượng mua</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {!items || items.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-10 text-slate-500">
                                                Không có dữ liệu vật tư trong gói thầu này.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        items.map((item, index) => (
                                            <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                                <TableCell className="text-center font-medium text-slate-500">
                                                    {index + 1}
                                                </TableCell>
                                                <TableCell>
                                                    {item.material_code ? (
                                                        <Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-none">
                                                            {item.material_code}
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="text-slate-400 border-slate-300 dark:border-slate-700">
                                                            Chưa có mã
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                <TableCell className="font-bold text-slate-800 dark:text-slate-200">
                                                    {item.item_name || item.material_name}
                                                </TableCell>
                                                <TableCell className="text-center font-medium text-slate-600 dark:text-slate-400 bg-slate-50/30 dark:bg-slate-900/30">
                                                    {item.purchase_unit}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400 text-base bg-blue-50/30 dark:bg-blue-900/10">
                                                    {Number(item.purchase_quantity).toLocaleString('en-US', { maximumFractionDigits: 3 })}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    {/* TAB 3: BID TABULATION */}
                    <TabsContent value="tabulation" className="mt-4">
                        {safeBidData ? ( // <-- THAY TÊN BIẾN Ở ĐÂY
                            <BidTabulation data={safeBidData} /> // <-- THAY TÊN BIẾN Ở ĐÂY
                        ) : (
                            <div className="text-center p-12 bg-white rounded-xl border border-dashed">Chưa có dữ liệu báo giá</div>
                        )}
                    </TabsContent>
                </Tabs>
            </div>
        );
    }