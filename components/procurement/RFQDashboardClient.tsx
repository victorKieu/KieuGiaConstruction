"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShoppingCart, Send, CalendarClock, ExternalLink, PackageSearch, Filter, ArrowRight, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { createRFQAction } from "@/lib/action/procurement";
import { formatVNDate } from "@/lib/utils/date";

export default function RFQDashboardClient({ userProfile }: { userProfile: any }) {
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [needs, setNeeds] = useState<any[]>([]);
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);

    // Filter states: Bắt buộc chọn dự án trước (mặc định rỗng)
    const [filterProject, setFilterProject] = useState("");
    const [filterMaterialGroup, setFilterMaterialGroup] = useState("all");

    // Lưu các Dự án đang thực sự có nhu cầu mua sắm
    const [projectsFromNeeds, setProjectsFromNeeds] = useState<any[]>([]);

    const [openModal, setOpenModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rfqTitle, setRfqTitle] = useState("");
    const [rfqDeadline, setRfqDeadline] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        try {
            // 1. Kéo Giỏ nhu cầu: Join lấy tên dự án luôn
            const { data: rawNeeds, error: needsError } = await supabase
                .from('procurement_needs')
                .select('*, project:projects(id, name)')
                .in('status', ['pending', 'PENDING'])
                .order('created_at', { ascending: false });

            if (needsError) console.error("Lỗi kéo Needs:", needsError);

            // 2. Kéo Materials kèm Nhóm (Để tra cứu Group)
            const { data: materialsData } = await supabase
                .from('materials')
                .select('code, group:material_groups(id, name)');

            // 3. RÁP DỮ LIỆU BẰNG JS
            const enrichedNeeds = (rawNeeds || []).map((need: any) => {
                const matInfo = (materialsData || []).find((m: any) => m.code === need.material_code);
                return {
                    ...need,
                    material_group: matInfo?.group || null
                };
            });

            // 4. GROUP BY: Lọc ra danh sách dự án ĐANG CÓ NHU CẦU từ mảng enrichedNeeds
            const uniqueProjects = new Map();
            enrichedNeeds.forEach(need => {
                if (need.project && !uniqueProjects.has(need.project.id)) {
                    uniqueProjects.set(need.project.id, need.project);
                }
            });

            // 5. CẬP NHẬT Kéo RFQs: Gọi thẳng tên bảng 'projects' để chống lỗi Alias
            const { data: rfqData, error: rfqError } = await supabase
                .from('rfqs')
                .select('*, projects(name, code)')
                .order('created_at', { ascending: false });

            if (rfqError) console.error("Lỗi kéo RFQs:", rfqError);

            // Xử lý dữ liệu: Tự động gỡ mảng nếu Supabase trả về Array
            const formattedRfqs = (rfqData || []).map(rfq => {
                const projInfo = Array.isArray(rfq.projects) ? rfq.projects[0] : rfq.projects;
                return {
                    ...rfq,
                    project_name: projInfo?.name || null,
                    project_code: projInfo?.code || null
                };
            });

            setNeeds(enrichedNeeds);
            setProjectsFromNeeds(Array.from(uniqueProjects.values()));
            setRfqs(formattedRfqs); // Đưa mảng đã chuẩn hóa vào state
        } catch (error) {
            console.error("Lỗi khi load dữ liệu:", error);
            toast.error("Lỗi kết nối dữ liệu!");
        } finally {
            setLoading(false);
        }
    };

    // CHỈ LẤY Nhóm vật tư của những món hàng THUỘC DỰ ÁN ĐÃ CHỌN
    const activeMaterialGroups = useMemo(() => {
        if (!filterProject) return []; // Nếu chưa chọn dự án -> Không hiện nhóm

        const unique = new Map();
        needs.forEach(need => {
            if (need.project_id === filterProject && need.material_group && need.material_group.id) {
                unique.set(need.material_group.id, need.material_group);
            }
        });
        return Array.from(unique.values());
    }, [needs, filterProject]);

    // Áp dụng bộ lọc (Khóa cứng: Phải chọn dự án mới hiện đồ)
    const filteredNeeds = useMemo(() => {
        if (!filterProject) return []; // Trả về mảng rỗng nếu chưa chọn dự án

        return needs.filter(need => {
            const matchProject = need.project_id === filterProject;
            const matchGroup = filterMaterialGroup === "all" || need.material_group?.id === filterMaterialGroup;
            return matchProject && matchGroup;
        });
    }, [needs, filterProject, filterMaterialGroup]);

    const toggleSelectNeed = (id: string) => {
        setSelectedNeeds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    const toggleSelectAll = () => {
        if (selectedNeeds.length === filteredNeeds.length) setSelectedNeeds([]);
        else setSelectedNeeds(filteredNeeds.map(n => n.id));
    };

    const handleCreateRFQ = async (e: React.FormEvent) => {
        e.preventDefault();
        if (selectedNeeds.length === 0) return toast.warning("Chưa chọn vật tư nào!");
        if (!rfqDeadline) return toast.warning("Vui lòng chọn thời gian đóng thầu!");

        setIsSubmitting(true);
        // Lưu ý: createRFQAction của anh cần được điều chỉnh nếu muốn lưu trực tiếp project_id vào bảng rfqs
        const res = await createRFQAction({ title: rfqTitle, deadline: new Date(rfqDeadline).toISOString(), needIds: selectedNeeds });

        if (res.success) {
            toast.success(res.message);
            setOpenModal(false); setSelectedNeeds([]); setRfqTitle(""); setRfqDeadline("");
            fetchData();
        } else {
            toast.error("Lỗi: " + res.error);
        }
        setIsSubmitting(false);
    };

    const handleDeleteRFQ = async (rfqId: string) => {
        if (!window.confirm("CẢNH BÁO: Xóa gói thầu sẽ xóa luôn toàn bộ báo giá và liên kết Nhà cung cấp. Tiếp tục?")) return;
        const { error } = await supabase.from('rfqs').delete().eq('id', rfqId);
        if (error) toast.error("Lỗi xóa: " + error.message);
        else { toast.success("Đã xóa gói thầu!"); fetchData(); }
    };

    // Kiểm tra quyền Xóa (Giữ nguyên logic của anh nếu có dùng đến)
    const canDeleteRFQ = ['ADMIN', 'DIRECTOR', 'PURCHASING_MANAGER'].includes(userProfile?.role?.toUpperCase());

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <PackageSearch className="w-6 h-6 text-blue-600" /> Trung Tâm Mua Hàng
                    </h2>
                    <p className="text-slate-500 text-sm mt-1">Phân quyền hiện tại: <Badge variant="outline">{userProfile?.role}</Badge></p>
                </div>
            </div>

            <Tabs defaultValue="needs" className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 h-12 w-full md:w-auto">
                    <TabsTrigger value="needs" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-6">
                        Giỏ Nhu Cầu
                    </TabsTrigger>
                    <TabsTrigger value="rfqs" className="data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700 px-6">
                        Các Gói Thầu Đang Mở
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="needs" className="space-y-4">
                    <Card className="p-4 border-slate-200 bg-white flex flex-col md:flex-row gap-4 items-end shadow-sm">
                        <div className="flex-1 w-full space-y-1.5">
                            <Label className="text-slate-500 text-xs font-bold uppercase flex items-center gap-1"><Filter className="w-3 h-3" /> Dự án đang có nhu cầu</Label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700"
                                value={filterProject}
                                onChange={(e) => {
                                    setFilterProject(e.target.value);
                                    setFilterMaterialGroup("all");
                                    setSelectedNeeds([]);
                                }}
                            >
                                <option value="" disabled>-- Vui lòng chọn 1 Dự án để lấy danh sách --</option>
                                {projectsFromNeeds.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 w-full space-y-1.5">
                            <Label className="text-slate-500 text-xs font-bold uppercase flex items-center gap-1"><Filter className="w-3 h-3" /> Nhóm vật tư</Label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                value={filterMaterialGroup}
                                onChange={(e) => { setFilterMaterialGroup(e.target.value); setSelectedNeeds([]); }}
                                disabled={!filterProject}
                            >
                                <option value="all">-- Tất cả Nhóm vật tư --</option>
                                {activeMaterialGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    </Card>

                    <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 flex justify-between items-center border-b">
                            <span className="font-semibold text-slate-700">
                                {filterProject ? `Đã chọn ${selectedNeeds.length} / ${filteredNeeds.length} vật tư` : 'Danh sách vật tư chờ xử lý'}
                            </span>
                            <Button onClick={() => setOpenModal(true)} disabled={selectedNeeds.length === 0} className="bg-indigo-600 hover:bg-indigo-700">
                                <ShoppingCart className="w-4 h-4 mr-2" /> Tạo đợt hỏi giá (RFQ)
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100">
                                    <TableHead className="w-[50px] text-center">
                                        <input
                                            type="checkbox"
                                            disabled={!filterProject || filteredNeeds.length === 0}
                                            checked={filteredNeeds.length > 0 && selectedNeeds.length === filteredNeeds.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded text-blue-600 disabled:opacity-50"
                                        />
                                    </TableHead>
                                    <TableHead className="font-bold">Mã VT</TableHead>
                                    <TableHead className="font-bold min-w-[250px]">Tên Vật tư</TableHead>
                                    <TableHead className="text-right font-bold">Khối lượng</TableHead>
                                    <TableHead className="text-center font-bold">ĐVT</TableHead>
                                    <TableHead className="text-center font-bold">Nhóm vật tư</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                                ) : !filterProject ? (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center text-slate-500">
                                                <ArrowRight className="w-10 h-10 mb-3 text-indigo-300" />
                                                <p className="text-base font-medium text-slate-700">Vui lòng chọn 1 Dự án ở phía trên</p>
                                                <p className="text-sm">Hệ thống chỉ cho phép gom vật tư của cùng 1 dự án vào chung Gói thầu.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredNeeds.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Dự án này đã hết vật tư chờ xử lý.</TableCell></TableRow>
                                ) : filteredNeeds.map(need => (
                                    <TableRow key={need.id} className="cursor-pointer hover:bg-slate-50" onClick={() => toggleSelectNeed(need.id)}>
                                        <TableCell className="text-center" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedNeeds.includes(need.id)} onChange={() => toggleSelectNeed(need.id)} className="w-4 h-4 rounded text-blue-600" /></TableCell>
                                        <TableCell><Badge className="bg-slate-200 text-slate-700 hover:bg-slate-200 border-none">{need.material_code}</Badge></TableCell>
                                        <TableCell className="font-semibold text-slate-800">{need.material_name}</TableCell>
                                        <TableCell className="text-right font-bold text-blue-700">{Number(need.purchase_quantity).toLocaleString()}</TableCell>
                                        <TableCell className="text-center text-slate-600 font-medium">{need.purchase_unit}</TableCell>
                                        <TableCell className="text-center text-sm text-slate-500">{need.material_group?.name || 'Chưa phân nhóm'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="rfqs" className="space-y-4">
                    <Card className="border-slate-200 bg-white overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100">
                                    <TableHead className="font-bold">Mã gói thầu</TableHead>
                                    {/* THÊM CỘT DỰ ÁN */}
                                    <TableHead className="font-bold">Mã dự án</TableHead>
                                    <TableHead className="font-bold">Tên dự án</TableHead>
                                    <TableHead className="font-bold min-w-[250px]">Tiêu đề</TableHead>
                                    <TableHead className="font-bold text-center">Trạng thái</TableHead>
                                    <TableHead className="font-bold">Thời hạn đóng thầu</TableHead>
                                    <TableHead className="text-right font-bold">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? <TableRow><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" /></TableCell></TableRow>
                                    : rfqs.length === 0 ? <TableRow><TableCell colSpan={6} className="text-center py-8 text-slate-500">Chưa có gói thầu nào.</TableCell></TableRow>
                                        : rfqs.map(rfq => {
                                            const isExpired = new Date(rfq.deadline) < new Date();
                                            const isCompleted = rfq.status === 'completed';

                                            return (
                                                <TableRow key={rfq.id}>
                                                    <TableCell className="font-bold text-slate-800">{rfq.code}</TableCell>
                                                    {/* HIỂN THỊ TÊN DỰ ÁN */}
                                                    <TableCell className="font-semibold text-slate-600">
                                                        {rfq.project_code || <span className="text-slate-400 italic">Chưa xác định</span>}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-slate-600">
                                                        {rfq.project_name || <span className="text-slate-400 italic">Chưa xác định</span>}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-blue-700">{rfq.title}</TableCell>

                                                    <TableCell className="text-center">
                                                        {rfq.status === 'published' && !isExpired && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 border-none">Đang nhận báo giá</Badge>}
                                                        {rfq.status === 'published' && isExpired && <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-none">Đã hết hạn nộp</Badge>}
                                                        {rfq.status === 'closed' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 border-none">Chờ sàng lọc</Badge>}
                                                        {rfq.status === 'completed' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200 border-none">Đã chốt giá</Badge>}
                                                    </TableCell>

                                                    <TableCell className={`flex items-center gap-2 mt-1.5 ${isExpired && !isCompleted ? 'text-red-600 font-bold' : 'text-slate-600'}`}>
                                                        <CalendarClock className="w-4 h-4" />
                                                        {formatVNDate(rfq.deadline)}
                                                        {isExpired && !isCompleted && (
                                                            <span className="text-[10px] uppercase tracking-wider bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse flex-shrink-0">
                                                                Quá hạn
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            <Link href={`/procurement/rfq/${rfq.id}`}>
                                                                <Button variant="outline" size="sm" className="bg-white border-slate-300">Quản trị <ExternalLink className="w-4 h-4 ml-2" /></Button>
                                                            </Link>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent>
                    <DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2"><Send className="w-5 h-5 text-indigo-600" /> Thiết lập Gói Thầu Mới</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateRFQ} className="space-y-4 py-4">
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">Hệ thống sẽ gom <strong>{selectedNeeds.length} vật tư</strong> vào gói thầu này.</div>
                        <div className="space-y-2"><Label>Tiêu đề gói thầu <span className="text-red-500">*</span></Label><Input required value={rfqTitle} onChange={e => setRfqTitle(e.target.value)} /></div>
                        <div className="space-y-2"><Label>Thời hạn đóng thầu <span className="text-red-500">*</span></Label><Input required type="datetime-local" value={rfqDeadline} onChange={e => setRfqDeadline(e.target.value)} /></div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>Hủy bỏ</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Phát hành RFQ"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}