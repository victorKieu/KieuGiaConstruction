"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Plus, Search, Edit, Trash2, Filter, Upload, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteNorm, importNormsCSV } from "@/lib/action/normActions";
import NormForm from "@/components/dictionaries/norms/NormForm";
import { toast } from "sonner";

interface NormClientProps {
    norms: any[];
    totalItems: number;
    currentPage: number;
    pageSize: number;
    resources: any[];
    initialSearch?: string;
}

export default function NormClient({
    norms, totalItems, currentPage, pageSize,
    resources, initialSearch = ""
}: NormClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [page, setPage] = useState(currentPage);

    const [isOpen, setIsOpen] = useState(false);
    const [editingNorm, setEditingNorm] = useState<any>(null);
    const [isImporting, setIsImporting] = useState(false);

    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

    // --- ĐỒNG BỘ URL ---
    useEffect(() => {
        const timer = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());

            if (searchTerm) params.set("q", searchTerm);
            else params.delete("q");

            if (page > 1) params.set("page", page.toString());
            else params.delete("page");

            // Xóa rác url group nếu còn
            params.delete("group");

            router.push(`?${params.toString()}`, { scroll: false });
        }, 500);

        return () => clearTimeout(timer);
    }, [searchTerm, page, router, searchParams]);

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(1);
    };

    const handleDelete = async (id: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa định mức này không?")) {
            const res = await deleteNorm(id) as any;
            if (res.success) toast.success(res.message);
            else toast.error(res.error);
        }
    };

    const handleEdit = (norm: any) => {
        setEditingNorm(norm);
        setIsOpen(true);
    };

    const handleAddNew = () => {
        setEditingNorm(null);
        setIsOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        toast.info("Đang tải file lên và xử lý... Vui lòng không đóng trang.");

        const formData = new FormData();
        formData.append("file", file);

        try {
            const res = await importNormsCSV(formData) as any;
            if (res.success) {
                toast.success(res.message);
                setPage(1);
            } else {
                toast.error(res.error);
            }
        } catch (error: any) {
            toast.error("Lỗi: " + error.message);
        } finally {
            setIsImporting(false);
            e.target.value = '';
        }
    };

    return (
        <div className="flex flex-col h-full space-y-4 overflow-hidden">
            {/* Toolbar */}
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm shrink-0">
                <div className="relative w-[400px]">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Tìm mã hiệu, tên công tác..."
                        className="pl-8 bg-slate-50"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <div className="relative">
                        <input type="file" accept=".csv" onChange={handleFileUpload} disabled={isImporting} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed z-10" />
                        <Button variant="outline" disabled={isImporting} className="bg-green-50 text-green-700 border-green-200 hover:bg-green-100">
                            {isImporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Import CSV
                        </Button>
                    </div>
                    <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> Thêm định mức mới
                    </Button>
                </div>
            </div>

            {/* Grid List - Không còn thanh Sidebar nên mở rộng ra 3-4 cột tuỳ màn hình */}
            <ScrollArea className="flex-1 pr-3">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4 pb-2">
                    {norms.map(norm => (
                        <Card key={norm.id} className="hover:shadow-md transition-all border-l-4 group border-l-blue-400">
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                                <Badge variant="secondary" className="font-mono font-bold bg-slate-100 text-slate-700 border-slate-200 shrink-0">
                                    {norm.code}
                                </Badge>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(norm)}><Edit className="h-3.5 w-3.5" /></Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleDelete(norm.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 pt-0">
                                <div className="text-base font-bold mb-1 line-clamp-2 text-slate-800" title={norm.name}>{norm.name}</div>
                                <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                                    <span>Đơn vị tính: <span className="font-semibold text-slate-700">{norm.unit}</span></span>
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
                            <p>Không tìm thấy định mức nào.</p>
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
                        <span className="text-sm font-medium text-slate-600">
                            Trang {page} / {totalPages}
                        </span>
                        <div className="flex gap-1">
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                                <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                                <ChevronRight className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* ================= DIALOG FORM ================= */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 flex flex-col">
                    <DialogHeader className="p-6 pb-2 border-b bg-slate-50/50 sticky top-0 z-10 shrink-0">
                        <DialogTitle className="text-xl text-slate-800">{editingNorm ? "Cập nhật định mức" : "Thêm định mức mới"}</DialogTitle>
                    </DialogHeader>
                    <div className="p-6 flex-1">
                        <NormForm initialData={editingNorm} resources={resources} onSuccess={() => { setIsOpen(false); toast.success("Thành công"); }} />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}