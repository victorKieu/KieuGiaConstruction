"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Search, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/utils";
import { Badge } from "@/components/ui/badge";

// ✅ Cập nhật Interface khớp với bảng materials
export interface MasterMaterial {
    id: string;
    code: string;
    name: string;
    unit: string;
    ref_price: number;
    unit_price?: number;
    specs?: string; // Cột quy cách trong bảng materials
}

interface MaterialSelectorProps {
    onSelect: (material: MasterMaterial) => void;
    trigger?: React.ReactNode;
    defaultSearch?: string;
}

export function MaterialSelector({ onSelect, trigger, defaultSearch = "" }: MaterialSelectorProps) {
    const supabase = createClient();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(defaultSearch);
    const [results, setResults] = useState<MasterMaterial[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open && query && results.length === 0) {
            handleSearch();
        }
    }, [open]);

    const handleSearch = async () => {
        const searchTerm = query.replace(/["']/g, '').replace(/,/g, ' ').trim();
        if (!searchTerm) return;

        setLoading(true);
        // ✅ Gọi đúng bảng 'materials'
        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .or(`name.ilike."%${searchTerm}%",code.ilike."%${searchTerm}%"`)
            .limit(30);

        if (error) {
            console.error("Lỗi tìm kiếm vật tư:", error);
            toast.error("Không tìm thấy dữ liệu master data");
        } else {
            setResults(data || []);
        }
        setLoading(false);
    };

    const handleSelect = (material: any) => {
        const selectedMat: MasterMaterial = {
            id: material.id,
            code: material.code,
            name: material.name,
            unit: material.unit,
            ref_price: material.ref_price || material.unit_price || 0,
            specs: material.specs // Lấy đúng cột specs
        };

        onSelect(selectedMat);
        setOpen(false);
        toast.success(`Đã chọn: ${selectedMat.code}`);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50 dark:border-blue-800"
                    >
                        <Search className="w-3 h-3 mr-1.5" /> Tìm mã
                    </Button>
                )}
            </DialogTrigger>

            <DialogContent className="sm:max-w-[650px] dark:bg-slate-950 dark:border-slate-800">
                <DialogHeader>
                    <DialogTitle className="dark:text-slate-100">Tra cứu Danh mục Vật tư (Master Data)</DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 my-2">
                    <Input
                        value={query || ""}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Nhập Mã hoặc Tên vật tư..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        autoFocus
                        className="dark:bg-slate-900 dark:border-slate-800 dark:text-slate-100"
                    />
                    <Button onClick={handleSearch} disabled={loading} className="w-[100px]">
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Tìm kiếm"}
                    </Button>
                </div>

                <div className="max-h-[350px] overflow-y-auto space-y-2 border-t pt-3 dark:border-slate-800 custom-scrollbar pr-1">
                    {results.length > 0 ? (
                        results.map((r) => (
                            <div
                                key={r.id}
                                onClick={() => handleSelect(r)}
                                className="p-3 border rounded-lg cursor-pointer flex justify-between items-center group transition-all border-slate-200 hover:bg-blue-50/50 hover:border-blue-300 dark:border-slate-800 dark:hover:bg-slate-900/80 dark:hover:border-blue-900/50 shadow-sm hover:shadow"
                            >
                                <div className="flex-1 pr-4">
                                    <div className="flex items-center gap-2 mb-1">
                                        <Badge variant="outline" className="font-bold text-blue-700 bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800 rounded-sm px-1.5 py-0">
                                            {r.code}
                                        </Badge>
                                    </div>

                                    <div className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-tight">
                                        {r.name}
                                    </div>

                                    {/* ✅ HIỂN THỊ THÔNG SỐ (CỘT SPECS TỪ BẢNG MATERIALS) */}
                                    {r.specs && (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1.5 flex items-start gap-1.5 bg-slate-50 dark:bg-slate-900/50 p-1.5 rounded border border-slate-100 dark:border-slate-800">
                                            <Info className="w-3.5 h-3.5 mt-0.5 text-blue-500 shrink-0" />
                                            <span className="italic line-clamp-2">{r.specs}</span>
                                        </div>
                                    )}

                                    <div className="text-xs text-slate-600 dark:text-slate-400 mt-2 flex items-center gap-4">
                                        <span>ĐVT: <strong className="text-slate-800 dark:text-slate-200">{r.unit}</strong></span>
                                        <span>
                                            Giá tham khảo: <strong className="text-emerald-600 dark:text-emerald-400">
                                                {formatCurrency(r.ref_price || r.unit_price || 0)}
                                            </strong>
                                        </span>
                                    </div>
                                </div>
                                <Button size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity bg-blue-600 hover:bg-blue-700 text-white shrink-0 shadow-sm">
                                    Chọn mã
                                </Button>
                            </div>
                        ))
                    ) : (
                        !loading && (
                            <div className="flex flex-col items-center justify-center py-8 text-slate-500 dark:text-slate-400 space-y-2">
                                <Search className="w-8 h-8 opacity-20" />
                                <p className="text-sm">Không tìm thấy vật tư nào phù hợp.</p>
                            </div>
                        )
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}