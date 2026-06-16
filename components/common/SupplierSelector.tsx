"use client";

import React, { useState, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Check, ChevronsUpDown, Loader2, Search, Building2 } from "lucide-react";

interface Supplier {
    id: string;
    name: string;
    phone?: string;
    tax_code?: string;
}

interface Props {
    selectedId?: string;
    onSelect: (id: string, supplier: Supplier | null) => void;
    placeholder?: string;
}

export function SupplierSelector({ selectedId, onSelect, placeholder = "Tìm kiếm Nhà cung cấp..." }: Props) {
    const [open, setOpen] = useState(false);
    const [suppliers, setSuppliers] = useState<Supplier[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const wrapperRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();

    // Lấy dữ liệu NCC từ DB (Thay 'code' bằng 'tax_code' hoặc 'phone' để không bị lỗi)
    useEffect(() => {
        const fetchSuppliers = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('suppliers')
                .select('id, name, phone, tax_code');

            if (!error && data) {
                setSuppliers(data);
            }
            setLoading(false);
        };
        fetchSuppliers();
    }, []);

    // Xử lý click ra ngoài để đóng Dropdown
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const filteredSuppliers = suppliers.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.phone?.includes(search) ||
        s.tax_code?.includes(search)
    );

    const selectedSupplier = suppliers.find(s => s.id === selectedId);

    return (
        <div ref={wrapperRef} className="relative w-full">
            <div
                className="flex items-center justify-between w-full h-10 px-3 py-2 text-sm bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-md cursor-pointer hover:border-indigo-400 focus:ring-2 focus:ring-indigo-500"
                onClick={() => setOpen(!open)}
            >
                <span className={`truncate ${!selectedSupplier ? "text-slate-500" : "text-slate-900 dark:text-slate-100 font-medium"}`}>
                    {selectedSupplier ? selectedSupplier.name : placeholder}
                </span>
                {loading ? <Loader2 className="w-4 h-4 animate-spin text-slate-400" /> : <ChevronsUpDown className="w-4 h-4 text-slate-400 opacity-50" />}
            </div>

            {open && (
                <div className="absolute z-[100] w-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg overflow-hidden animate-in fade-in zoom-in-95">
                    <div className="flex items-center px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                        <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                        <input
                            className="w-full bg-transparent outline-none text-sm dark:text-slate-200"
                            placeholder="Gõ tên, SĐT hoặc Mã số thuế..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            autoFocus
                        />
                    </div>
                    <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                        {filteredSuppliers.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">Không tìm thấy Nhà cung cấp nào.</div>
                        ) : (
                            filteredSuppliers.map((supplier) => (
                                <div
                                    key={supplier.id}
                                    className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-indigo-50 dark:hover:bg-indigo-900/30 ${selectedId === supplier.id ? 'bg-indigo-50/50 dark:bg-indigo-900/20' : ''}`}
                                    onClick={() => {
                                        onSelect(supplier.id, supplier);
                                        setSearch("");
                                        setOpen(false);
                                    }}
                                >
                                    <div className="flex flex-col">
                                        <span className={`font-medium ${selectedId === supplier.id ? 'text-indigo-700 dark:text-indigo-400' : 'text-slate-700 dark:text-slate-300'}`}>
                                            {supplier.name}
                                        </span>
                                        {(supplier.phone || supplier.tax_code) && (
                                            <span className="text-xs text-slate-500 mt-0.5">
                                                {supplier.phone ? `📞 ${supplier.phone}` : ''} {supplier.tax_code ? ` 🏢 MST: ${supplier.tax_code}` : ''}
                                            </span>
                                        )}
                                    </div>
                                    {selectedId === supplier.id && <Check className="w-4 h-4 text-indigo-600" />}
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}