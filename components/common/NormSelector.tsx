"use client";

import React, { useState, useEffect } from "react";
import { Check, ChevronsUpDown, Loader2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { createClient } from "@/lib/supabase/client";

interface Norm {
    id: string;
    code: string;
    name: string;
    unit: string;
}

interface NormSelectorProps {
    value?: string | null;
    onSelect: (code: string) => void;
}

export function NormSelector({ value, onSelect }: NormSelectorProps) {
    const [open, setOpen] = useState(false);
    const [search, setSearch] = useState("");
    const [norms, setNorms] = useState<Norm[]>([]);
    const [loading, setLoading] = useState(false);
    const supabase = createClient();

    // Tự động tìm kiếm khi mở popup hoặc gõ chữ
    useEffect(() => {
        if (open) {
            // Delay nhẹ để tránh gọi API liên tục khi gõ nhanh (Debounce)
            const delayDebounceFn = setTimeout(() => {
                fetchNorms(search);
            }, 300);
            return () => clearTimeout(delayDebounceFn);
        }
    }, [open, search]);

    const fetchNorms = async (query: string) => {
        setLoading(true);
        let q = supabase.from('norms').select('*').limit(50); // Lấy tối đa 50 kết quả cho nhẹ

        if (query) {
            // Tìm theo mã HOẶC tên công tác
            q = q.or(`code.ilike.%${query}%,name.ilike.%${query}%`);
        }

        const { data, error } = await q;
        if (!error && data) {
            setNorms(data);
        }
        setLoading(false);
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={`w-full justify-between h-8 px-2 text-xs font-mono shadow-sm ${!value ? 'border-orange-400 bg-orange-50 text-orange-700 hover:bg-orange-100 hover:text-orange-800' : 'text-blue-700 font-semibold'}`}
                >
                    <span className="truncate">{value ? value : "Chọn / Gõ mã..."}</span>
                    <ChevronsUpDown className="ml-2 h-3 w-3 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0 shadow-lg border-slate-200" align="end">
                <div className="flex items-center border-b px-3 bg-slate-50">
                    <Search className="mr-2 h-4 w-4 shrink-0 text-slate-500" />
                    <Input
                        placeholder="Gõ mã (VD: AF.111) hoặc Tên công tác..."
                        className="flex-1 border-0 bg-transparent py-3 text-sm outline-none shadow-none focus-visible:ring-0 px-0"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="max-h-[300px] overflow-y-auto p-1">
                    {loading ? (
                        <div className="flex items-center justify-center p-6 text-sm text-slate-500">
                            <Loader2 className="h-5 w-5 animate-spin mr-2 text-blue-500" /> Đang tra cứu dữ liệu...
                        </div>
                    ) : norms.length === 0 ? (
                        <div className="p-6 text-center text-sm text-slate-500 italic">
                            Không tìm thấy mã định mức phù hợp.
                        </div>
                    ) : (
                        norms.map((norm) => (
                            <div
                                key={norm.id}
                                className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm hover:bg-blue-50 transition-colors ${value === norm.code ? 'bg-blue-50/50' : ''}`}
                                onClick={() => {
                                    onSelect(norm.code);
                                    setOpen(false);
                                    setSearch(""); // Reset search khi chọn xong
                                }}
                            >
                                <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center">
                                    {value === norm.code && <Check className="h-4 w-4 text-blue-600" />}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-blue-700">{norm.code}</span>
                                        <span className="text-[10px] bg-slate-100 px-1.5 rounded text-slate-600 border">ĐVT: {norm.unit}</span>
                                    </div>
                                    <span className="text-xs text-slate-600 mt-0.5" title={norm.name}>{norm.name}</span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </PopoverContent>
        </Popover>
    );
}