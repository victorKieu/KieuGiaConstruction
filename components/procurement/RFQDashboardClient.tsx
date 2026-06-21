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
import { Loader2, ShoppingCart, Send, CalendarClock, ExternalLink, PackageSearch, Filter, ArrowRight, Trash2, Settings2, BookCheck } from "lucide-react";
import { toast } from "sonner";
import { createRFQAction, standardizeProcurementNeedAction } from "@/lib/action/procurement";
import { formatVNDate } from "@/lib/utils/date";

export default function RFQDashboardClient({ userProfile }: { userProfile: any }) {
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [needs, setNeeds] = useState<any[]>([]);
    const [rfqs, setRfqs] = useState<any[]>([]);
    const [selectedNeeds, setSelectedNeeds] = useState<string[]>([]);

    // Danh sách các nhóm vật tư (Dùng cho dropdown Chuẩn hóa)
    const [allMaterialGroups, setAllMaterialGroups] = useState<any[]>([]);

    const [filterProject, setFilterProject] = useState("");
    const [filterMaterialGroup, setFilterMaterialGroup] = useState("all");

    const [projectsFromNeeds, setProjectsFromNeeds] = useState<any[]>([]);

    // States cho Modal tạo RFQ
    const [openModal, setOpenModal] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [rfqTitle, setRfqTitle] = useState("");
    const [rfqDeadline, setRfqDeadline] = useState("");

    // States cho Modal Chuẩn hóa vật tư
    const [stdModalOpen, setStdModalOpen] = useState(false);
    const [selectedNeedForStd, setSelectedNeedForStd] = useState<any>(null);
    const [isStandardizing, setIsStandardizing] = useState(false);
    const [stdData, setStdData] = useState({ code: '', name: '', unit: '', groupId: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);

        try {
            // Lấy danh sách nhóm vật tư cho form chuẩn hóa
            const { data: groupsData } = await supabase.from('material_groups').select('id, name');
            setAllMaterialGroups(groupsData || []);

            const { data: rawNeeds, error: needsError } = await supabase
                .from('procurement_needs')
                .select('*, project:projects(id, name)')
                .in('status', ['pending', 'PENDING'])
                .order('created_at', { ascending: false });

            if (needsError) console.error("Lỗi kéo Needs:", needsError);

            const { data: materialsData } = await supabase
                .from('materials')
                .select('code, group:material_groups(id, name)');

            const enrichedNeeds = (rawNeeds || []).map((need: any) => {
                const matInfo = (materialsData || []).find((m: any) => m.code === need.material_code);
                return {
                    ...need,
                    material_group: matInfo?.group || null
                };
            });

            const uniqueProjects = new Map();
            enrichedNeeds.forEach(need => {
                if (need.project && !uniqueProjects.has(need.project.id)) {
                    uniqueProjects.set(need.project.id, need.project);
                }
            });

            const { data: rfqData, error: rfqError } = await supabase
                .from('rfqs')
                .select('*, projects(name)')
                .order('created_at', { ascending: false });

            if (rfqError) console.error("Lỗi kéo RFQs:", rfqError);

            const formattedRfqs = (rfqData || []).map(rfq => {
                const projInfo = Array.isArray(rfq.projects) ? rfq.projects[0] : rfq.projects;
                return {
                    ...rfq,
                    project_name: projInfo?.name || null
                };
            });

            setNeeds(enrichedNeeds);
            setProjectsFromNeeds(Array.from(uniqueProjects.values()));
            setRfqs(formattedRfqs);
        } catch (error) {
            console.error("Lỗi khi load dữ liệu:", error);
            toast.error("Lỗi kết nối dữ liệu!");
        } finally {
            setLoading(false);
        }
    };

    const activeMaterialGroups = useMemo(() => {
        if (!filterProject) return [];
        const unique = new Map();
        needs.forEach(need => {
            if (need.project_id === filterProject && need.material_group && need.material_group.id) {
                unique.set(need.material_group.id, need.material_group);
            }
        });
        return Array.from(unique.values());
    }, [needs, filterProject]);

    const filteredNeeds = useMemo(() => {
        if (!filterProject) return [];
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
        if (!window.confirm("CẢNH BÁO: Xóa gói thầu sẽ hoàn trả vật tư về giỏ nhu cầu. Tiếp tục?")) return;
        const { error } = await supabase.from('rfqs').delete().eq('id', rfqId);
        if (error) toast.error("Lỗi xóa: " + error.message);
        else { toast.success("Đã xóa gói thầu!"); fetchData(); }
    };

    // Hàm Xóa Vật tư khỏi Giỏ nhu cầu
    const handleDeleteNeed = async (id: string, name: string) => {
        if (!window.confirm(`Bạn có chắc chắn muốn xóa "${name}" khỏi Giỏ Nhu Cầu không? Hành động này không thể hoàn tác.`)) return;

        const toastId = toast.loading("Đang xóa vật tư...");
        const { error } = await supabase.from('procurement_needs').delete().eq('id', id);

        if (error) {
            toast.error("Lỗi xóa: " + error.message, { id: toastId });
        } else {
            // Xóa ID khỏi mảng đang select nếu người dùng lỡ tick chọn trước khi xóa
            setSelectedNeeds(prev => prev.filter(item => item !== id));
            toast.success("Đã xóa vật tư thành công!", { id: toastId });
            fetchData();
        }
    };

    // Mở Modal Chuẩn hóa vật tư
    const openStandardizeModal = (need: any) => {
        setSelectedNeedForStd(need);
        setStdData({
            code: need.material_code || '',
            name: need.material_name || '',
            unit: need.purchase_unit || '',
            groupId: need.material_group?.id || ''
        });
        setStdModalOpen(true);
    };

    // Xử lý submit Chuẩn hóa
    const handleStandardizeSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!stdData.code || !stdData.name) return toast.warning("Vui lòng nhập Mã và Tên vật tư chuẩn!");

        setIsStandardizing(true);
        const payload = {
            needId: selectedNeedForStd.id,
            materialCode: stdData.code,
            materialName: stdData.name,
            unit: stdData.unit,
            groupId: stdData.groupId || null
        };

        const res = await standardizeProcurementNeedAction(payload);
        if (res.success) {
            toast.success(res.message);
            setStdModalOpen(false);
            fetchData(); // Cập nhật lại dữ liệu
        } else {
            toast.error(res.error);
        }
        setIsStandardizing(false);
    };

    const canDeleteRFQ = ['ADMIN', 'DIRECTOR', 'PURCHASING_MANAGER'].includes(userProfile?.role?.toUpperCase());

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <PackageSearch className="w-6 h-6 text-blue-600 dark:text-blue-400" /> Trung Tâm Mua Hàng
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Phân quyền hiện tại: <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-300">{userProfile?.role}</Badge></p>
                </div>
            </div>

            <Tabs defaultValue="needs" className="w-full">
                <TabsList className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 h-12 w-full md:w-auto">
                    <TabsTrigger value="needs" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 text-slate-600 dark:text-slate-400 px-6">
                        Giỏ Nhu Cầu
                    </TabsTrigger>
                    <TabsTrigger value="rfqs" className="data-[state=active]:bg-blue-50 dark:data-[state=active]:bg-blue-900/20 data-[state=active]:text-blue-700 dark:data-[state=active]:text-blue-400 text-slate-600 dark:text-slate-400 px-6">
                        Các Gói Thầu Đang Mở
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="needs" className="space-y-4">
                    <Card className="p-4 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col md:flex-row gap-4 items-end shadow-sm">
                        <div className="flex-1 w-full space-y-1.5">
                            <Label className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase flex items-center gap-1"><Filter className="w-3 h-3" /> Dự án đang có nhu cầu</Label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 font-semibold text-slate-700 dark:text-slate-300"
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
                            <Label className="text-slate-500 dark:text-slate-400 text-xs font-bold uppercase flex items-center gap-1"><Filter className="w-3 h-3" /> Nhóm vật tư</Label>
                            <select
                                className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 disabled:opacity-50 font-semibold text-slate-700 dark:text-slate-300"
                                value={filterMaterialGroup}
                                onChange={(e) => { setFilterMaterialGroup(e.target.value); setSelectedNeeds([]); }}
                                disabled={!filterProject}
                            >
                                <option value="all">-- Tất cả Nhóm vật tư --</option>
                                {activeMaterialGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                        </div>
                    </Card>

                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                        <div className="p-4 bg-slate-50 dark:bg-slate-950/50 flex justify-between items-center border-b dark:border-slate-800">
                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                {filterProject ? `Đã chọn ${selectedNeeds.length} / ${filteredNeeds.length} vật tư` : 'Danh sách vật tư chờ xử lý'}
                            </span>
                            <Button onClick={() => setOpenModal(true)} disabled={selectedNeeds.length === 0} className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500">
                                <ShoppingCart className="w-4 h-4 mr-2" /> Tạo đợt hỏi giá (RFQ)
                            </Button>
                        </div>
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 dark:border-slate-800 border-b">
                                    <TableHead className="w-[50px] text-center">
                                        <input
                                            type="checkbox"
                                            disabled={!filterProject || filteredNeeds.length === 0}
                                            checked={filteredNeeds.length > 0 && selectedNeeds.length === filteredNeeds.length}
                                            onChange={toggleSelectAll}
                                            className="w-4 h-4 rounded text-blue-600 dark:text-blue-500 disabled:opacity-50"
                                        />
                                    </TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Mã VT</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 min-w-[200px]">Tên Vật tư</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Khối lượng</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">ĐVT</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Nhóm vật tư</TableHead>
                                    <TableHead className="text-center font-bold text-slate-700 dark:text-slate-300">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow className="dark:border-slate-800"><TableCell colSpan={7} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400 dark:text-slate-500" /></TableCell></TableRow>
                                ) : !filterProject ? (
                                    <TableRow className="dark:border-slate-800 hover:bg-transparent dark:hover:bg-transparent">
                                        <TableCell colSpan={7} className="text-center py-12">
                                            <div className="flex flex-col items-center justify-center text-slate-500 dark:text-slate-400">
                                                <ArrowRight className="w-10 h-10 mb-3 text-indigo-300 dark:text-indigo-500" />
                                                <p className="text-base font-medium text-slate-700 dark:text-slate-300">Vui lòng chọn 1 Dự án ở phía trên</p>
                                                <p className="text-sm">Hệ thống chỉ cho phép gom vật tư của cùng 1 dự án vào chung Gói thầu.</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ) : filteredNeeds.length === 0 ? (
                                    <TableRow className="dark:border-slate-800"><TableCell colSpan={7} className="text-center py-8 text-slate-500 dark:text-slate-400">Dự án này đã hết vật tư chờ xử lý.</TableCell></TableRow>
                                ) : filteredNeeds.map(need => (
                                    <TableRow key={need.id} className="cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:border-slate-800" onClick={() => toggleSelectNeed(need.id)}>
                                        <TableCell className="text-center" onClick={e => e.stopPropagation()}><input type="checkbox" checked={selectedNeeds.includes(need.id)} onChange={() => toggleSelectNeed(need.id)} className="w-4 h-4 rounded text-blue-600 dark:text-blue-500" /></TableCell>
                                        <TableCell>
                                            {need.material_code ? (
                                                <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-300 border-none dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700">{need.material_code}</Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-amber-600 border-amber-300 dark:text-amber-500 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30">Chưa có mã</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="font-semibold text-slate-800 dark:text-slate-200">{need.material_name}</TableCell>
                                        <TableCell className="text-right font-bold text-blue-700 dark:text-blue-400">{Number(need.purchase_quantity).toLocaleString()}</TableCell>
                                        <TableCell className="text-center text-slate-600 dark:text-slate-400 font-medium">{need.purchase_unit}</TableCell>
                                        <TableCell className="text-center text-sm text-slate-500 dark:text-slate-400">{need.material_group?.name || '-'}</TableCell>
                                        <TableCell className="text-center" onClick={e => e.stopPropagation()}>
                                            <div className="flex items-center justify-center gap-1">
                                                <Button variant="ghost" size="sm" onClick={() => openStandardizeModal(need)} className="h-8 px-2 text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-500 dark:hover:bg-amber-950/50">
                                                    <Settings2 className="w-4 h-4 mr-1" /> Chuẩn hóa
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 transition-colors"
                                                    onClick={() => handleDeleteNeed(need.id, need.material_name || need.item_name)}
                                                    title="Xóa khỏi Giỏ nhu cầu"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                <TabsContent value="rfqs" className="space-y-4">
                    <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-100 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800/50 dark:border-slate-800 border-b">
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Mã gói thầu</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Dự án</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300 min-w-[250px]">Tiêu đề</TableHead>
                                    <TableHead className="font-bold text-center text-slate-700 dark:text-slate-300">Trạng thái</TableHead>
                                    <TableHead className="font-bold text-slate-700 dark:text-slate-300">Thời hạn đóng thầu</TableHead>
                                    <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Thao tác</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? <TableRow className="dark:border-slate-800"><TableCell colSpan={6} className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400 dark:text-slate-500" /></TableCell></TableRow>
                                    : rfqs.length === 0 ? <TableRow className="dark:border-slate-800"><TableCell colSpan={6} className="text-center py-8 text-slate-500 dark:text-slate-400">Chưa có gói thầu nào.</TableCell></TableRow>
                                        : rfqs.map(rfq => {
                                            const isExpired = new Date(rfq.deadline) < new Date();
                                            const isCompleted = rfq.status === 'completed';

                                            return (
                                                <TableRow key={rfq.id} className="dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                    <TableCell className="font-bold text-slate-800 dark:text-slate-200">{rfq.code}</TableCell>
                                                    <TableCell className="font-semibold text-slate-600 dark:text-slate-400">
                                                        {rfq.project_name || <span className="text-slate-400 dark:text-slate-500 italic">Chưa xác định</span>}
                                                    </TableCell>
                                                    <TableCell className="font-semibold text-blue-700 dark:text-blue-400">{rfq.title}</TableCell>

                                                    <TableCell className="text-center">
                                                        {rfq.status === 'published' && !isExpired && <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 border-none">Đang nhận báo giá</Badge>}
                                                        {rfq.status === 'published' && isExpired && <Badge className="bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 border-none">Đã hết hạn nộp</Badge>}
                                                        {rfq.status === 'closed' && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50 border-none">Chờ sàng lọc</Badge>}
                                                        {rfq.status === 'completed' && <Badge className="bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-400 dark:hover:bg-green-900/50 border-none">Đã chốt giá</Badge>}
                                                    </TableCell>

                                                    <TableCell className={`flex items-center gap-2 mt-1.5 ${isExpired && !isCompleted ? 'text-red-600 dark:text-red-400 font-bold' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        <CalendarClock className="w-4 h-4" />
                                                        {formatVNDate(rfq.deadline)}
                                                        {isExpired && !isCompleted && (
                                                            <span className="text-[10px] uppercase tracking-wider bg-red-100 text-red-600 px-2 py-0.5 rounded-full animate-pulse flex-shrink-0 dark:bg-red-900/40 dark:text-red-400">
                                                                Quá hạn
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-2">
                                                            {canDeleteRFQ && (
                                                                <Button variant="destructive" size="sm" onClick={() => handleDeleteRFQ(rfq.id)} className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400 dark:border-red-800/50">
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                            <Link href={`/procurement/rfq/${rfq.id}`}>
                                                                <Button variant="outline" size="sm" className="bg-white border-slate-300 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Quản trị <ExternalLink className="w-4 h-4 ml-2" /></Button>
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

            {/* Modal Tạo Gói Thầu */}
            <Dialog open={openModal} onOpenChange={setOpenModal}>
                <DialogContent className="dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader><DialogTitle className="text-xl font-bold flex items-center gap-2 dark:text-slate-100"><Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" /> Thiết lập Gói Thầu Mới</DialogTitle></DialogHeader>
                    <form onSubmit={handleCreateRFQ} className="space-y-4 py-4">
                        <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700 text-sm text-slate-800 dark:text-slate-300">
                            Hệ thống sẽ gom <strong className="dark:text-white">{selectedNeeds.length} vật tư</strong> vào gói thầu này.
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Tiêu đề gói thầu <span className="text-red-500">*</span></Label>
                            <Input required value={rfqTitle} onChange={e => setRfqTitle(e.target.value)} className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Thời hạn đóng thầu <span className="text-red-500">*</span></Label>
                            <Input required type="datetime-local" value={rfqDeadline} onChange={e => setRfqDeadline(e.target.value)} className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100 dark:[color-scheme:dark]" />
                        </div>
                        <DialogFooter className="pt-4">
                            <Button type="button" variant="outline" onClick={() => setOpenModal(false)} className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Hủy bỏ</Button>
                            <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white dark:bg-indigo-600 dark:hover:bg-indigo-500 min-w-[140px]">{isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Phát hành RFQ"}</Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal Chuẩn hóa vật tư */}
            <Dialog open={stdModalOpen} onOpenChange={setStdModalOpen}>
                <DialogContent className="dark:bg-slate-900 dark:border-slate-800 max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold flex items-center gap-2 text-amber-700 dark:text-amber-500">
                            <BookCheck className="w-5 h-5" /> Chuẩn hóa Mã Vật Tư
                        </DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleStandardizeSubmit} className="space-y-4 py-2">
                        <div className="bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900/50 text-sm text-amber-800 dark:text-amber-400 mb-2 leading-relaxed">
                            Vật tư gõ tay từ công trường: <strong>{selectedNeedForStd?.material_name}</strong><br />
                            Hãy gán Mã và Tên chuẩn để hệ thống tự động ghi nhận vào Danh mục Master Data.
                        </div>

                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Mã vật tư chuẩn <span className="text-red-500">*</span></Label>
                            <Input required placeholder="VD: KEO-BOT-01" value={stdData.code} onChange={e => setStdData({ ...stdData, code: e.target.value.toUpperCase() })} className="uppercase font-mono dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100" />
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Tên vật tư chuẩn <span className="text-red-500">*</span></Label>
                            <Input required placeholder="Keo bọt nở chuyên dụng loại 1..." value={stdData.name} onChange={e => setStdData({ ...stdData, name: e.target.value })} className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100" />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="dark:text-slate-300">Đơn vị mua <span className="text-red-500">*</span></Label>
                                <Input required value={stdData.unit} onChange={e => setStdData({ ...stdData, unit: e.target.value })} className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-100" />
                            </div>
                            <div className="space-y-2">
                                <Label className="dark:text-slate-300">Nhóm vật tư</Label>
                                <select
                                    className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-sm focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200"
                                    value={stdData.groupId}
                                    onChange={e => setStdData({ ...stdData, groupId: e.target.value })}
                                >
                                    <option value="">-- Chưa phân nhóm --</option>
                                    {allMaterialGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>
                        </div>

                        <DialogFooter className="pt-4 border-t dark:border-slate-800">
                            <Button type="button" variant="outline" onClick={() => setStdModalOpen(false)} className="dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">Đóng</Button>
                            <Button type="submit" disabled={isStandardizing} className="bg-amber-600 hover:bg-amber-700 text-white dark:bg-amber-600 dark:hover:bg-amber-500 min-w-[120px]">
                                {isStandardizing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Lưu chuẩn hóa"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

        </div>
    );
}