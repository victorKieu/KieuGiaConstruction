"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Filter, Upload, Loader2, ChevronLeft, ChevronRight, GitCompare, ArrowRight, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { deleteNorm, importNormsCSV, saveNorm } from "@/lib/action/normActions";
import { crawlNormFromUrl } from "@/lib/action/crawlerActions";
import NormForm from "@/components/dictionaries/norms/NormForm";
import { toast } from "sonner";
import { cn } from "@/lib/utils/utils";

interface NormClientProps { norms: any[]; totalItems: number; currentPage: number; pageSize: number; resources: any[]; initialSearch?: string; }

export default function NormClient({ norms, totalItems, currentPage, pageSize, resources, initialSearch = "" }: NormClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchInput, setSearchInput] = useState(initialSearch);
    const [appliedSearch, setAppliedSearch] = useState(initialSearch);

    const [page, setPage] = useState(currentPage);
    const [isOpen, setIsOpen] = useState(false);
    const [editingNorm, setEditingNorm] = useState<any>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importType, setImportType] = useState<string>("company");

    const [linkDialogOpen, setLinkDialogOpen] = useState(false);
    const [inputUrl, setInputUrl] = useState("");
    const [selectedLocalNorm, setSelectedLocalNorm] = useState<any>(null);
    const [isFetchingUrl, setIsFetchingUrl] = useState(false);

    const [compareOpen, setCompareOpen] = useState(false);
    const [compareData, setCompareData] = useState<{ local: any, online: any } | null>(null);
    const [isUpdating, setIsUpdating] = useState(false);

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (appliedSearch) params.set("q", appliedSearch); else params.delete("q");
        if (page > 1) params.set("page", page.toString()); else params.delete("page");
        params.delete("group");
        router.push(`?${params.toString()}`, { scroll: false });
    }, [appliedSearch, page, router, searchParams]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setPage(1);
            setAppliedSearch(searchInput);
        }
    };

    const triggerSearch = () => {
        setPage(1);
        setAppliedSearch(searchInput);
    };

    const handleDelete = async (id: string) => { if (confirm("Bạn có chắc chắn muốn xóa định mức này không?")) { const res = await deleteNorm(id) as any; if (res.success) toast.success(res.message); else toast.error(res.error); } };
    const handleEdit = (norm: any) => { setEditingNorm(norm); setIsOpen(true); };
    const handleAddNew = () => { setEditingNorm(null); setIsOpen(true); };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setIsImporting(true);
        const toastId = toast.loading(`Đang nạp file thành Định mức ${importType === 'state' ? 'Nhà nước' : 'Nội bộ'}...`);
        const formData = new FormData(); formData.append("file", file); formData.append("type", importType);
        try {
            const res = await importNormsCSV(formData) as any;
            if (res.success) { toast.success(res.message, { id: toastId, duration: 5000 }); setPage(1); router.refresh(); }
            else toast.error(res.error, { id: toastId, duration: 5000 });
        } catch (error: any) { toast.error("Lỗi hệ thống: " + error.message, { id: toastId, duration: 5000 }); }
        finally { setIsImporting(false); e.target.value = ''; }
    };

    const handleCompare = (norm: any) => {
        setSelectedLocalNorm(norm);
        setInputUrl("");
        setLinkDialogOpen(true);
    };

    const handleFetchFromUrl = async () => {
        if (!inputUrl.trim()) {
            toast.error("Vui lòng dán link từ DinhMucOnline vào ô trống!");
            return;
        }

        setIsFetchingUrl(true);
        const toastId = toast.loading("Đang lấy dữ liệu từ đường link...");

        try {
            const res = await crawlNormFromUrl(inputUrl.trim());

            if (res.success) {
                toast.success("Đã lấy được dữ liệu đối chiếu!", { id: toastId });
                setCompareData({ local: selectedLocalNorm, online: res.data });
                setLinkDialogOpen(false);
                setCompareOpen(true);
            } else {
                toast.error(res.error, { id: toastId });
            }
        } catch (error: any) {
            toast.error("Lỗi hệ thống: " + error.message, { id: toastId });
        } finally {
            setIsFetchingUrl(false);
        }
    };

    const handleApplyOnlineData = async () => {
        if (!compareData) return;
        setIsUpdating(true);
        const toastId = toast.loading("Đang cập nhật ghi đè dữ liệu...");

        const payload = { ...compareData.online, id: compareData.local.id };

        const res = await saveNorm(payload);
        setIsUpdating(false);
        if (res.success) {
            toast.success("Cập nhật định mức thành công!", { id: toastId });
            setCompareOpen(false);
            router.refresh();
        } else {
            toast.error("Lỗi: " + res.error, { id: toastId });
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4 overflow-hidden transition-colors duration-500">
            {/* Toolbar */}
            <div className="flex flex-col lg:flex-row justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 gap-4 transition-colors">
                <div className="relative w-full lg:w-[400px]">
                    <Search
                        className="absolute left-3 top-2.5 h-4 w-4 text-slate-400 cursor-pointer hover:text-blue-600 transition-colors z-10"
                        onClick={triggerSearch}
                    />
                    <Input
                        placeholder="Tìm mã hiệu, tên công tác + Nhấn Enter..."
                        className="pl-10 bg-slate-50 dark:bg-slate-950 focus-visible:ring-blue-500 border-slate-200 dark:border-slate-800 transition-colors"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto justify-end">
                    <Select value={importType} onValueChange={setImportType} disabled={isImporting}>
                        <SelectTrigger className="w-[180px] h-9 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 transition-colors">
                            <SelectValue placeholder="Loại định mức" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                            <SelectItem value="company">Định mức Nội bộ</SelectItem>
                            <SelectItem value="state">Định mức Nhà nước</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative">
                        <input type="file" accept=".csv" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" />
                        <Button variant="outline" disabled={isImporting} className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/30 hover:bg-green-100 h-9 transition-colors">
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import CSV
                        </Button>
                    </div>
                    <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-9 transition-colors">
                        <Plus className="mr-2 h-4 w-4" /> Thêm định mức mới
                    </Button>
                </div>
            </div>

            {/* Grid List */}
            <ScrollArea className="flex-1 pr-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-4">
                    {norms.map(norm => (
                        <Card key={norm.id} className="hover:shadow-md transition-all border-l-4 group border-slate-200 dark:border-slate-800 border-l-blue-400 dark:border-l-blue-600 bg-white dark:bg-slate-900">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4">
                                <div className="flex flex-col gap-1.5">
                                    <Badge variant="secondary" className="font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 w-fit transition-colors">
                                        {norm.code}
                                    </Badge>
                                    <span className="text-[10px] text-slate-500 dark:text-slate-400 uppercase font-bold tracking-wider">
                                        {norm.type === 'state' ? '🏛️ Nhà nước' : '🏢 Nội bộ'}
                                    </span>
                                </div>
                                <div className="flex gap-1 opacity-100 lg:opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-emerald-600 dark:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30" title="So khớp Online" onClick={() => handleCompare(norm)}><GitCompare className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30" title="Chỉnh sửa" onClick={() => handleEdit(norm)}><Edit className="h-4 w-4" /></Button>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30" title="Xóa" onClick={() => handleDelete(norm.id)}><Trash2 className="h-4 w-4" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-base font-bold mb-2 line-clamp-2 text-slate-800 dark:text-slate-200 min-h-[3rem] leading-snug transition-colors" title={norm.name}>{norm.name}</div>
                                <div className="text-xs text-slate-500 dark:text-slate-400 mb-4 flex items-center justify-between transition-colors">
                                    <span>ĐVT: <span className="font-bold text-slate-700 dark:text-slate-300">{norm.unit}</span></span>
                                    <span title="Hệ số quy đổi">Hệ số: <span className="font-bold text-orange-600 dark:text-orange-400">{norm.conversion_factor || 1}</span></span>
                                </div>
                                <div className="bg-slate-50/80 dark:bg-slate-950/50 p-3 rounded-lg text-xs space-y-1.5 border border-slate-100 dark:border-slate-800 transition-colors">
                                    {(!norm.details || norm.details.length === 0) ? (
                                        <span className="italic text-slate-400 dark:text-slate-600 pl-1">Chưa khai báo hao phí</span>
                                    ) : (
                                        norm.details.slice(0, 5).map((d: any, idx: number) => {
                                            const resName = d.resource?.name || 'Vật tư không xác định';
                                            const resUnit = d.resource?.unit || '';
                                            return (
                                                <div key={idx} className="flex justify-between items-center border-b border-dashed border-slate-200 dark:border-slate-800 last:border-0 pb-1.5 last:pb-0 transition-colors">
                                                    <span className="truncate pr-4 text-slate-600 dark:text-slate-400" title={resName}>{resName}</span>
                                                    <span className="font-mono font-bold text-slate-800 dark:text-slate-300 shrink-0">{d.quantity} {resUnit}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                    {norm.details && norm.details.length > 5 && <div className="text-center pt-1 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-widest">+{norm.details.length - 5} hao phí khác</div>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {norms.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-400 dark:text-slate-600 bg-white dark:bg-slate-900 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 transition-colors">
                            <Filter className="w-12 h-12 mb-3 opacity-20" />
                            <p className="font-medium text-lg">Không tìm thấy định mức nào phù hợp.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Pagination */}
            {totalItems > 0 && (
                <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm shrink-0 gap-4 transition-colors">
                    <div className="text-sm text-slate-500 dark:text-slate-400 transition-colors">
                        Hiển thị <span className="font-bold text-slate-800 dark:text-slate-200">{(page - 1) * pageSize + 1}</span> - <span className="font-bold text-slate-800 dark:text-slate-200">{Math.min(page * pageSize, totalItems)}</span> / <span className="font-bold text-slate-800 dark:text-slate-200">{totalItems}</span> định mức
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-bold text-slate-600 dark:text-slate-400">Trang {page} / {totalPages}</span>
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" className="h-8 w-8 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-400" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
            )}

            {/* DIALOG FORM */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden p-0 gap-0 flex flex-col dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader className="p-6 pb-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 sticky top-0 z-10 shrink-0 transition-colors">
                        <DialogTitle className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">{editingNorm ? "Cập nhật định mức" : "Thêm định mức mới"}</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 flex-1 overflow-y-auto">
                        <NormForm initialData={editingNorm} resources={resources} onSuccess={() => { setIsOpen(false); router.refresh(); }} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL 1: NHẬP ĐƯỜNG LINK */}
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent className="sm:max-w-[500px] dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 dark:text-slate-100">
                            <LinkIcon className="w-5 h-5 text-blue-600 dark:text-blue-500" /> Nhập link để lấy dữ liệu
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 transition-colors">
                            Hệ thống sẽ đối chiếu định mức <b className="text-blue-600 dark:text-blue-400 font-mono">{selectedLocalNorm?.code}</b>. Vui lòng dán đường link chi tiết từ DinhMucOnline:
                        </p>
                        <Input
                            placeholder="https://dinhmuconline.com/..."
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border-slate-300 dark:border-slate-800 dark:text-slate-100 transition-colors"
                            autoFocus
                        />
                    </div>
                    <DialogFooter className="dark:border-slate-800">
                        <Button variant="outline" onClick={() => setLinkDialogOpen(false)} disabled={isFetchingUrl} className="dark:border-slate-700 dark:text-slate-300">Hủy</Button>
                        <Button onClick={handleFetchFromUrl} disabled={isFetchingUrl} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
                            {isFetchingUrl ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            Bắt đầu lấy dữ liệu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: SO KHỚP ONLINE */}
            <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 flex flex-col dark:bg-slate-900 dark:border-slate-800">
                    <DialogHeader className="p-4 border-b dark:border-slate-800 bg-slate-50 dark:bg-slate-950 transition-colors">
                        <DialogTitle className="text-lg flex items-center gap-2 dark:text-slate-100 font-black">
                            <GitCompare className="w-5 h-5 text-emerald-600" />
                            SO KHỚP ĐỊNH MỨC: <span className="font-mono text-blue-700 dark:text-blue-400">{compareData?.local?.code}</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50 dark:bg-slate-950/30 transition-colors">
                        {compareData && (
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {/* CỘT TRÁI: HIỆN TẠI */}
                                <Card className="border-rose-200 dark:border-rose-900/50 shadow-sm bg-white dark:bg-slate-900 overflow-hidden">
                                    <CardHeader className="bg-rose-50 dark:bg-rose-950/20 p-3 border-b border-rose-100 dark:border-rose-900/30 transition-colors">
                                        <h3 className="font-bold text-rose-800 dark:text-rose-400 text-xs uppercase tracking-widest">Dữ liệu hiện tại (Hệ thống)</h3>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-4">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tên công tác</div>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-snug">{compareData.local.name}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Đơn vị tính</div>
                                            <Badge variant="outline" className="dark:border-slate-700 dark:text-slate-300">{compareData.local.unit}</Badge>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Chi tiết hao phí ({compareData.local.details?.length || 0})</div>
                                            <div className="space-y-1.5">
                                                {compareData.local.details?.map((d: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center bg-slate-50 dark:bg-slate-950/50 p-2.5 rounded-lg text-xs border border-slate-100 dark:border-slate-800 transition-colors">
                                                        <div className="flex flex-col min-w-0 pr-4">
                                                            <span className="font-bold text-slate-700 dark:text-slate-300 truncate">{d.resource?.name || 'N/A'}</span>
                                                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{d.resource?.code || 'N/A'}</span>
                                                        </div>
                                                        <span className="font-black text-slate-900 dark:text-slate-200 shrink-0">{d.quantity} <span className="text-slate-500 font-normal">{d.resource?.unit}</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CỘT PHẢI: ONLINE */}
                                <Card className="border-emerald-200 dark:border-emerald-900/50 shadow-sm bg-white dark:bg-slate-900 relative overflow-hidden">
                                    <div className="hidden lg:block absolute top-1/2 -left-3.5 transform -translate-y-1/2 bg-white dark:bg-slate-900 border dark:border-slate-700 rounded-full shadow-md z-10 p-1">
                                        <ArrowRight className="w-5 h-5 text-emerald-500" />
                                    </div>
                                    <CardHeader className="bg-emerald-50 dark:bg-emerald-950/20 p-3 border-b border-emerald-100 dark:border-emerald-900/30 transition-colors">
                                        <h3 className="font-bold text-emerald-800 dark:text-emerald-400 text-xs uppercase tracking-widest text-right">Dữ liệu Online (Nguồn cập nhật)</h3>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-4">
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Tên công tác</div>
                                            <div className="font-bold text-slate-800 dark:text-slate-200 text-sm leading-snug">{compareData.online.name}</div>
                                        </div>
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Đơn vị tính</div>
                                            <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">{compareData.online.unit}</Badge>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Chi tiết hao phí ({compareData.online.details?.length || 0})</div>
                                            <div className="space-y-1.5">
                                                {compareData.online.details?.map((d: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white dark:bg-slate-950 p-2.5 rounded-lg text-xs border border-emerald-100 dark:border-emerald-900/40 transition-colors shadow-sm">
                                                        <div className="flex flex-col min-w-0 pr-4">
                                                            <span className="font-bold text-emerald-900 dark:text-emerald-400 truncate">{d.resource?.name || 'N/A'}</span>
                                                            <span className="text-[10px] font-mono text-slate-400 dark:text-slate-500">{d.resource?.code || 'N/A'}</span>
                                                        </div>
                                                        <span className="font-black text-emerald-700 dark:text-emerald-300 shrink-0">{d.quantity} <span className="text-slate-500 font-normal">{d.resource?.unit}</span></span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0 transition-colors">
                        <Button variant="outline" onClick={() => setCompareOpen(false)} disabled={isUpdating} className="dark:border-slate-700 dark:text-slate-300">Hủy bỏ</Button>
                        <Button onClick={handleApplyOnlineData} disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[220px] font-bold shadow-lg shadow-emerald-500/20">
                            {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCompare className="w-4 h-4 mr-2" />}
                            Áp dụng dữ liệu mới này
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}