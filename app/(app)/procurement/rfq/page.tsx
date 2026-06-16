"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShoppingCart, Send, CalendarClock, ExternalLink, PackageSearch } from "lucide-react";
import { toast } from "sonner";
import { createRFQAction } from "@/lib/action/procurement";

export default function RFQDashboard() {
    const router = useRouter();
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [needs, setNeeds] = useState<any[]>([]);
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);

    // Modal state
    const [openModal, setOpenModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rfqTitle, setRfqTitle] = useState("");
    const [rfqDeadline, setRfqDeadline] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        // Lấy giỏ nhu cầu (chưa xử lý) kèm tên dự án
        const { data: needsData } = await supabase
            .from('procurement_needs')
            .select(`*, project:projects(name)`)
            .eq('status', 'pending')
            .order('created_at', { ascending: false });

        // Lấy danh sách RFQ
        const { data: rfqData } = await supabase
            .from('rfqs')
            .select('*')
            .order('created_at', { ascending: false });

        setNeeds(needsData || []);
        setRfqs(rfqData || []);
        setLoading(false);
    };

    const toggleSelectNeed = (id: string) => {
        setSelectedNeeds(prev =>
            prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedNeeds.length === needs.length) setSelectedNeeds([]);
        else setSelectedNeeds(needs.map(n => n.id));
    };

    const handleCreateRFQ = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedNeeds.length === 0) return toast.warning("Chưa chọn vật tư nào!");
        if (!rfqDeadline) return toast.warning("Vui lòng chọn hạn chót báo giá!");

        setIsSubmitting(true);
        const res = await createRFQAction({
            title: rfqTitle,
            deadline: new Date(rfqDeadline).toISOString(),
            needIds: selectedNeeds
        });

        if (res.success) {
            toast.success(res.message);
            setOpenModal(false);
            setSelectedNeeds([]);
            setRfqTitle("");
            setRfqDeadline("");
            fetchData(); // Reload data
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setIsSubmitting(false);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'published': return <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">Đang nhận báo giá</Badge>;
            case 'closed': return <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">Chờ sàng lọc</Badge>;
            case 'completed': return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">Đã chốt giá</Badge>;
            default: return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <PackageSearch className="w-6 h-6 text-blue-600" /> Trung Tâm Mua Hàng (Strategic Sourcing)
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Quản lý nhu cầu từ công trường và phát hành các gói thầu tìm giá cạnh tranh.</p>
                </div>
            </div>

            <Tabs defaultValue="needs" className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm mb-4 h-12 w-full md:w-auto">
                    <TabsTrigger value="needs" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/20 dark:data-[state=active]:text-blue-400 font-semibold px-6">
                        Giỏ Nhu Cầu ({needs.length})
                    </TabsTrigger>
                    <TabsTrigger value="rfqs" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/20 dark:data-[state=active]:text-blue-400 font-semibold px-6">
                        Các Gói Thầu Đang Mở
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: GIỎ NHU CẦU */}
                <TabsContent value="needs" className="space-y-4 animate-in fade-in duration-300">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 flex justify-between items-center">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                Đã chọn {selectedNeeds.length} vật tư
                            </span>
                            <Button
                                onClick={() => setOpenModal(true)}
                                disabled={selectedNeeds.length === 0}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md"
                            >
                                <ShoppingCart className="w-4 h-4 mr-2" /> Tạo đợt hỏi giá (RFQ)
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100 dark:bg-slate-900">
                                    <TableHead className="w-[50px] text-center">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                            checked={needs.length > 0 && selectedNeeds.length === needs.length}
                                            onChange={toggleSelectAll}
                                        />
                                    </TableHead>
                                    <TableHead className="font-bold">Dự án</TableHead>
                                    <TableHead className="font-bold">Mã VT</TableHead>
                                    <TableHead className="font-bold min-w-[200px]">Tên Vật tư / Hạng mục</TableHead>
                                    <TableHead className="text-right font-bold">Số lượng (Mua)</TableHead>
                                    <TableHead className="text-center font-bold">ĐVT</TableHead>
                                    <TableHead className="text-center font-bold">Ngày gửi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                                ) : needs.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center py-8 text-slate-500">Giỏ hàng trống. Chưa có nhu cầu nào từ công trường.</TableCell></TableRow>
                                ) : (
                                    needs.map(need => (
                                        <TableRow key={need.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" onClick={() => toggleSelectNeed(need.id)}>
                                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                                    checked={selectedNeeds.includes(need.id)}
                                                    onChange={() => toggleSelectNeed(need.id)}
                                                />
                                            </TableCell>
                                            <TableCell className="font-medium text-slate-700 dark:text-slate-300">{need.project?.name}</TableCell>
                                            <TableCell><Badge className="bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300 hover:bg-slate-200">{need.material_code}</Badge></TableCell>
                                            <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{need.material_name}</TableCell>
                                            <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">{Number(need.purchase_quantity).toLocaleString()}</TableCell>
                                            <TableCell className="text-center text-slate-600 dark:text-slate-400 font-medium">{need.purchase_unit}</TableCell>
                                            <TableCell className="text-center text-sm text-slate-500">{new Date(need.created_at).toLocaleDateString('vi-VN')}</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* TAB 2: QUẢN LÝ RFQ */}
                <TabsContent value="rfqs" className="space-y-4 animate-in fade-in duration-300">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100 dark:bg-slate-900">
                                    <TableHead className="font-bold">Mã gói thầu</TableHead>
                                    <TableHead className="font-bold min-w-[250px]">Tiêu đề</TableHead>
                                    <TableHead className="font-bold text-center">Trạng thái</TableHead>
                                    <TableHead className="font-bold">Hạn chót báo giá</TableHead>
                                    <TableHead className="text-right font-bold">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                                ) : rfqs.length === 0 ? (
                                    <TableRow><TableCell colSpan={5} className="text-center py-8 text-slate-500">Chưa có gói thầu nào được tạo.</TableCell></TableRow>
                                ) : (
                                    rfqs.map(rfq => (
                                        <TableRow key={rfq.id}>
                                            <TableCell className="font-bold text-slate-800 dark:text-slate-200">{rfq.code}</TableCell>
                                            <TableCell className="font-semibold text-blue-700 dark:text-blue-400">{rfq.title}</TableCell>
                                            <TableCell className="text-center">{getStatusBadge(rfq.status)}</TableCell>
                                            <TableCell className="text-slate-600 dark:text-slate-400 flex items-center gap-2">
                                                <CalendarClock className="w-4 h-4" />
                                                {new Date(rfq.deadline).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Link href={`/procurement/rfq/${rfq.id}`}>
                                                    <Button variant="outline" size="sm" className="bg-white hover:bg-slate-50 dark:bg-slate-950 border-slate-300 text-slate-700 dark:text-slate-300">
                                                        Quản trị <ExternalLink className="w-4 h-4 ml-2" />
                                                    </Button>
                                                </Link>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* MODAL TẠO RFQ */}
            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="dark:bg-slate-900 dark:border-slate-800 sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold dark:text-slate-100 flex items-center gap-2">
                            <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Thiết lập Gói Thầu Mới
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateRFQ} className="space-y-4 py-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm">
                            Hệ thống sẽ gom <strong>{selectedNeeds.length} vật tư</strong> đã chọn vào gói thầu này. Bạn có thể gửi link mời thầu cho Nhà cung cấp ở bước tiếp theo.
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 font-semibold">Tiêu đề gói thầu <span className="text-red-500">*</span></Label>
                            <Input
                                required
                                placeholder="VD: Báo giá Thép và Cát dự án KGB tháng 6..."
                                value={rfqTitle}
                                onChange={(e) => setRfqTitle(e.target.value)}
                                className="dark:bg-slate-950 dark:border-slate-700 h-11"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300 font-semibold">Hạn chót nộp báo giá (Deadline) <span className="text-red-500">*</span></Label>
                            <Input
                                required
                                type="datetime-local"
                                value={rfqDeadline}
                                onChange={(e) => setRfqDeadline(e.target.value)}
                                className="dark:bg-slate-950 dark:border-slate-700 h-11"
                            />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpenModal(false)} className="dark:border-slate-700 dark:text-slate-300">
                                Hủy bỏ
                            </Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
                                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Phát hành RFQ"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}