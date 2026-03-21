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

interface NormClientProps { norms: any[]; totalItems: number; currentPage: number; pageSize: number; resources: any[]; initialSearch?: string; }

export default function NormClient({ norms, totalItems, currentPage, pageSize, resources, initialSearch = "" }: NormClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // ✅ ĐÃ SỬA: Tách riêng giá trị đang gõ (searchInput) và giá trị thực sự dùng để search (appliedSearch)
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

    // ✅ ĐÃ SỬA: Chỉ push URL khi `appliedSearch` hoặc `page` thay đổi (Bỏ setTimeout/debounce)
    useEffect(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (appliedSearch) params.set("q", appliedSearch); else params.delete("q");
        if (page > 1) params.set("page", page.toString()); else params.delete("page");
        params.delete("group");
        router.push(`?${params.toString()}`, { scroll: false });
    }, [appliedSearch, page, router, searchParams]);

    // ✅ XỬ LÝ NHẤN ENTER ĐỂ TÌM KIẾM
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            setPage(1); // Reset về trang 1 khi tìm kiếm mới
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
        <div className="flex flex-col h-full space-y-4 overflow-hidden">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm shrink-0">
                <div className="relative w-[400px]">
                    <Search
                        className="absolute left-2 top-2.5 h-4 w-4 text-slate-400 cursor-pointer hover:text-blue-600 transition-colors z-10"
                        onClick={triggerSearch}
                    />
                    <Input
                        placeholder="Tìm mã hiệu, tên công tác + Nhấn Enter..."
                        className="pl-8 bg-slate-50 focus-visible:ring-blue-500 border-slate-300"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Select value={importType} onValueChange={setImportType} disabled={isImporting}>
                        <SelectTrigger className="w-[180px] h-9 bg-slate-50 border-slate-200">
                            <SelectValue placeholder="Loại định mức" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="company">Định mức Nội bộ</SelectItem>
                            <SelectItem value="state">Định mức Nhà nước</SelectItem>
                        </SelectContent>
                    </Select>
                    <div className="relative">
                        <input type="file" accept=".csv" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" />
                        <Button variant="outline" disabled={isImporting} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100 h-9">
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import CSV
                        </Button>
                    </div>
                    <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 shadow-sm h-9">
                        <Plus className="mr-2 h-4 w-4" /> Thêm định mức mới
                    </Button>
                </div>
            </div>

            {/* Grid List */}
            <ScrollArea className="flex-1 pr-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-2">
                    {norms.map(norm => (
                        <Card key={norm.id} className="hover:shadow-md transition-all border-l-4 group border-l-blue-400">
                            <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2 p-4">
                                <div className="flex flex-col gap-1">
                                    <Badge variant="secondary" className="font-mono font-bold bg-slate-100 text-slate-700 border-slate-200 w-fit">
                                        {norm.code}
                                    </Badge>
                                    <span className="text-[10px] text-muted-foreground uppercase font-semibold">
                                        {norm.type === 'state' ? '🏛️ Định mức Nhà nước' : '🏢 Định mức Nội bộ'}
                                    </span>
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-emerald-600 hover:bg-emerald-50" title="So khớp Online" onClick={() => handleCompare(norm)}><GitCompare className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" title="Chỉnh sửa" onClick={() => handleEdit(norm)}><Edit className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" title="Xóa" onClick={() => handleDelete(norm.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-base font-bold mb-1 line-clamp-2 text-slate-800" title={norm.name}>{norm.name}</div>
                                <div className="text-xs text-muted-foreground mb-3 flex items-center justify-between">
                                    <span>Đơn vị tính: <span className="font-semibold text-slate-700">{norm.unit}</span></span>
                                    <span title="Hệ số quy đổi">Hệ số: <span className="font-semibold text-orange-600">{norm.conversion_factor || 1}</span></span>
                                </div>
                                <div className="bg-slate-50/80 p-2 rounded-md text-xs space-y-1 border border-slate-100">
                                    {(!norm.details || norm.details.length === 0) ? (
                                        <span className="italic text-slate-400 pl-1">Chưa khai báo hao phí</span>
                                    ) : (
                                        norm.details.slice(0, 5).map((d: any, idx: number) => {
                                            const resCode = d.resource?.code || 'N/A';
                                            const resName = d.resource?.name || 'Vật tư không xác định';
                                            const resUnit = d.resource?.unit || '';
                                            return (
                                                <div key={idx} className="flex justify-between border-b border-dashed border-slate-200 last:border-0 py-1 hover:bg-slate-100 px-1 rounded transition-colors">
                                                    <span className="truncate pr-2" title={resName}>{resName} <span className="text-slate-400 font-mono">({resCode})</span></span>
                                                    <span className="font-mono font-bold text-slate-700 shrink-0">{d.quantity} {resUnit}</span>
                                                </div>
                                            );
                                        })
                                    )}
                                    {norm.details && norm.details.length > 5 && <div className="text-center pt-1 text-slate-400 italic">...và {norm.details.length - 5} hao phí khác</div>}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                    {norms.length === 0 && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-white rounded-lg border border-dashed">
                            <Filter className="w-10 h-10 mb-2 opacity-20" />
                            <p>Không tìm thấy định mức nào phù hợp.</p>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* THANH PHÂN TRANG */}
            {totalItems > 0 && (
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm shrink-0">
                    <div className="text-sm text-slate-500">
                        Hiển thị <span className="font-medium text-slate-800">{(page - 1) * pageSize + 1}</span> đến <span className="font-medium text-slate-800">{Math.min(page * pageSize, totalItems)}</span> trong tổng số <span className="font-medium text-slate-800">{totalItems}</span> định mức
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm font-medium text-slate-600">Trang {page} / {totalPages}</span>
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                    </div>
                </div>
            )}

            {/* DIALOG FORM */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 flex flex-col">
                    <DialogHeader className="p-6 pb-2 border-b bg-slate-50/50 sticky top-0 z-10 shrink-0">
                        <DialogTitle className="text-xl text-slate-800">{editingNorm ? "Cập nhật định mức" : "Thêm định mức mới"}</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 flex-1">
                        <NormForm initialData={editingNorm} resources={resources} onSuccess={() => { setIsOpen(false); router.refresh(); }} />
                    </div>
                </DialogContent>
            </Dialog>

            {/* ✅ MODAL 1: NHẬP ĐƯỜNG LINK */}
            <Dialog open={linkDialogOpen} onOpenChange={setLinkDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <LinkIcon className="w-5 h-5 text-blue-600" /> Nhập link để lấy dữ liệu
                        </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <p className="text-sm text-slate-600 mb-4">
                            Hệ thống sẽ đối chiếu định mức <b className="text-blue-600 font-mono">{selectedLocalNorm?.code}</b>. Vui lòng dán đường link chi tiết từ DinhMucOnline vào ô bên dưới:
                        </p>
                        <Input
                            placeholder="VD: https://dinhmuconline.com/dinhmuc/104481"
                            value={inputUrl}
                            onChange={(e) => setInputUrl(e.target.value)}
                            className="bg-slate-50 border-slate-300"
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setLinkDialogOpen(false)} disabled={isFetchingUrl}>Hủy</Button>
                        <Button onClick={handleFetchFromUrl} disabled={isFetchingUrl} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[140px]">
                            {isFetchingUrl ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Search className="w-4 h-4 mr-2" />}
                            Bắt đầu lấy dữ liệu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ✅ MODAL 2: SO KHỚP ONLINE */}
            <Dialog open={compareOpen} onOpenChange={setCompareOpen}>
                <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden p-0 flex flex-col">
                    <DialogHeader className="p-4 border-b bg-slate-50 shrink-0">
                        <DialogTitle className="text-lg flex items-center gap-2">
                            <GitCompare className="w-5 h-5 text-emerald-600" />
                            So khớp định mức: <span className="font-mono text-blue-700">{compareData?.local?.code}</span>
                        </DialogTitle>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50">
                        {compareData && (
                            <div className="grid grid-cols-2 gap-4 h-full">
                                {/* CỘT TRÁI: HIỆN TẠI */}
                                <Card className="border-rose-200 shadow-sm">
                                    <CardHeader className="bg-rose-50 p-3 border-b border-rose-100">
                                        <h3 className="font-bold text-rose-800 text-sm">Dữ liệu hiện tại (Hệ thống)</h3>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Tên công tác</div>
                                            <div className="font-semibold text-slate-800 text-sm">{compareData.local.name}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Đơn vị tính</div>
                                            <Badge variant="outline">{compareData.local.unit}</Badge>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-2">Hao phí vật tư ({compareData.local.details?.length || 0})</div>
                                            <div className="space-y-1">
                                                {compareData.local.details?.map((d: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center bg-slate-50 p-2 rounded text-xs border border-slate-100">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-700">{d.resource?.name || 'N/A'}</span>
                                                            <span className="text-[10px] font-mono text-slate-400">{d.resource?.code || 'N/A'}</span>
                                                        </div>
                                                        <span className="font-bold text-slate-800">{d.quantity} <span className="text-slate-500 font-normal">{d.resource?.unit}</span></span>
                                                    </div>
                                                ))}
                                                {(!compareData.local.details || compareData.local.details.length === 0) && <div className="text-slate-400 text-xs italic text-center py-2">Trống</div>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* CỘT PHẢI: ONLINE */}
                                <Card className="border-emerald-200 shadow-sm relative">
                                    <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 bg-white rounded-full shadow-md z-10">
                                        <ArrowRight className="w-5 h-5 text-slate-400" />
                                    </div>
                                    <CardHeader className="bg-emerald-50 p-3 border-b border-emerald-100">
                                        <h3 className="font-bold text-emerald-800 text-sm">Dữ liệu Online (Gợi ý)</h3>
                                    </CardHeader>
                                    <CardContent className="p-4 space-y-4">
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Tên công tác</div>
                                            <div className="font-semibold text-slate-800 text-sm">{compareData.online.name}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-1">Đơn vị tính</div>
                                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">{compareData.online.unit}</Badge>
                                        </div>
                                        <div>
                                            <div className="text-xs text-slate-500 mb-2">Hao phí vật tư ({compareData.online.details?.length || 0})</div>
                                            <div className="space-y-1">
                                                {compareData.online.details?.map((d: any, idx: number) => (
                                                    <div key={idx} className="flex justify-between items-center bg-white p-2 rounded text-xs border border-emerald-100">
                                                        <div className="flex flex-col">
                                                            <span className="font-semibold text-slate-700">{d.resource?.name || 'N/A'}</span>
                                                            <span className="text-[10px] font-mono text-slate-400">{d.resource?.code || 'N/A'}</span>
                                                        </div>
                                                        <span className="font-bold text-emerald-700">{d.quantity} <span className="text-slate-500 font-normal">{d.resource?.unit}</span></span>
                                                    </div>
                                                ))}
                                                {(!compareData.online.details || compareData.online.details.length === 0) && <div className="text-slate-400 text-xs italic text-center py-2">Trống</div>}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="p-4 border-t bg-white shrink-0">
                        <Button variant="outline" onClick={() => setCompareOpen(false)} disabled={isUpdating}>Hủy bỏ</Button>
                        <Button onClick={handleApplyOnlineData} disabled={isUpdating} className="bg-emerald-600 hover:bg-emerald-700 text-white min-w-[200px]">
                            {isUpdating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCompare className="w-4 h-4 mr-2" />}
                            Cập nhật bằng dữ liệu Online
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}