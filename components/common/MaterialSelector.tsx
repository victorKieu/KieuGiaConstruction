"use client";

import React, { useState, useEffect } from "react";
import { Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/utils";

// ✅ DÒNG QUAN TRỌNG: Phải có chữ 'export' để file khác dùng được
export interface MasterMaterial {
    id: string;
    code: string;
    name: string;
    unit: string;
    ref_price: number; // Giá tham khảo
    unit_price?: number; // Fallback cho cấu trúc cũ
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
        const searchTerm = query.trim();
        if (!searchTerm) return;

        setLoading(true);
        // Tìm kiếm tương đối (ilike) trong bảng materials
        const { data, error } = await supabase
            .from('materials')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,code.ilike.%${searchTerm}%`)
            .limit(20);

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
            ref_price: material.ref_price || material.unit_price || 0
        };

        onSelect(selectedMat);
        setOpen(false);
        toast.success(`Đã chọn: ${selectedMat.code}`);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button variant="ghost" size="sm" className="h-7 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200">
                        <Search className="w-3 h-3 mr-1.5" /> Tìm mã
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Tra cứu Danh mục Vật tư (Master Data)</DialogTitle>
                </DialogHeader>

                <div className="flex gap-2 my-2">
                    <Input
                        value={query || ""}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Nhập Mã hoặc Tên vật tư..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        autoFocus
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Tìm"}
                    </Button>
                </div>

                <div className="max-h-[300px] overflow-y-auto space-y-2 border-t pt-2">
                    {results.length > 0 ? (
                        results.map((r) => (
                            <div
                                key={r.id}
                                onClick={() => handleSelect(r)}
                                className="p-3 border rounded hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-colors"
                            >
                                <div>
                                    <div className="font-bold text-sm text-blue-700">{r.code}</div>
                                    <div className="text-sm font-medium">{r.name}</div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        ĐVT: {r.unit} • Giá tham khảo: <span className="font-bold text-green-600">
                                            {formatCurrency(r.ref_price || r.unit_price || 0)}
                                        </span>
                                    </div>
                                </div>
                                <Button size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                    Chọn
                                </Button>
                            </div>
                        ))
                    ) : (
                        !loading && <p className="text-center text-slate-500 py-4 text-sm">Chưa có kết quả tìm kiếm.</p>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}