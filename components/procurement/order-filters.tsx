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
        <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/30 rounded-lg border items-end">

            {/* Lọc Dự Án */}
            <div className="w-full sm:w-[250px] space-y-1">
                <Label className="text-xs text-muted-foreground">Lọc theo Dự án</Label>
                <Select
                    value={currentProjectId}
                    onValueChange={(val) => onFilterChange("projectId", val)}
                >
                    <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Tất cả dự án" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">-- Tất cả dự án --</SelectItem>
                        {projects.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                                {p.code ? `[${p.code}] ` : ""}{p.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            {/* Lọc Nhà Cung Cấp */}
            <div className="w-full sm:w-[250px] space-y-1">
                <Label className="text-xs text-muted-foreground">Lọc theo Nhà cung cấp</Label>
                <Select
                    value={currentSupplierId}
                    onValueChange={(val) => onFilterChange("supplierId", val)}
                >
                    <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Tất cả NCC" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">-- Tất cả NCC --</SelectItem>
                        {suppliers.map((s) => (
                            <SelectItem key={s.id} value={s.id}>
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
                    className="text-muted-foreground hover:text-red-500"
                    title="Xóa bộ lọc"
                >
                    <X className="h-4 w-4" />
                </Button>
            )}
        </div>
    );
}