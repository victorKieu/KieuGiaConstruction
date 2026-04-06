"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

interface OrderFiltersProps {
    projects: any[]; // Danh sách dự án để chọn
    suppliers: any[]; // Danh sách NCC để chọn
}

export function OrderFilters({ projects, suppliers }: OrderFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    // Lấy giá trị hiện tại trên URL
    const currentProjectId = searchParams.get("projectId") || "";
    const currentSupplierId = searchParams.get("supplierId") || "";

    // Hàm xử lý khi chọn Filter
    const onFilterChange = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());

        if (value && value !== "all") {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        router.push(`/procurement/orders?${params.toString()}`);
    };

    // Hàm xóa hết lọc
    const clearFilters = () => {
        router.push("/procurement/orders");
    };

    const hasFilter = currentProjectId || currentSupplierId;

    return (
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-slate-200 dark:border-slate-800 items-end transition-colors duration-300 shadow-sm">

            {/* Lọc Dự Án */}
            <div className="w-full sm:w-[250px] space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors">Lọc theo Dự án</Label>
                <Select
                    value={currentProjectId}
                    onValueChange={(val) => onFilterChange("projectId", val)}
                >
                    <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-200 shadow-sm transition-colors">
                        <SelectValue placeholder="Tất cả dự án" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                        <SelectItem value="all" className="dark:text-slate-300 font-medium">-- Tất cả dự án --</SelectItem>
                        {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id} className="dark:text-slate-200">
                                {p.code ? <span className="text-slate-400 dark:text-slate-500 font-mono text-xs mr-1">[{p.code}]</span> : ""}{p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Lọc Nhà Cung Cấp */}
            <div className="w-full sm:w-[250px] space-y-1.5">
                <Label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 transition-colors">Lọc theo Nhà cung cấp</Label>
                <Select
                    value={currentSupplierId}
                    onValueChange={(val) => onFilterChange("supplierId", val)}
                >
                    <SelectTrigger className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-200 shadow-sm transition-colors">
                        <SelectValue placeholder="Tất cả NCC" />
                    </SelectTrigger>
                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                        <SelectItem value="all" className="dark:text-slate-300 font-medium">-- Tất cả NCC --</SelectItem>
                        {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id} className="dark:text-slate-200">
                                {s.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Nút Xóa Lọc */}
            {hasFilter && (
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={clearFilters}
                    className="text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors h-10 w-10 shrink-0"
                    title="Xóa bộ lọc"
                >
                    <X className="h-5 w-5" />
                </Button>
            )}
        </div>
    );
}