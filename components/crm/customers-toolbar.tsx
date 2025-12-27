"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce"; // Cần cài: npm i use-debounce
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
// import { CustomerFilters } from "./customer-filters"; // Nếu muốn dùng thêm bộ lọc nâng cao

export function CustomersToolbar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Lấy giá trị hiện tại từ URL
    const currentStatus = searchParams.get("status") || "all";
    const currentSearch = searchParams.get("query") || "";

    // Hàm cập nhật URL
    const handleSearch = useDebouncedCallback((term: string) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", "1"); // Reset về trang 1 khi tìm kiếm
        if (term) {
            params.set("query", term);
        } else {
            params.delete("query");
        }
        replace(`${pathname}?${params.toString()}`);
    }, 300);

    const handleStatusChange = (status: string) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", "1");
        if (status && status !== "all") {
            params.set("status", status);
        } else {
            params.delete("status");
        }
        replace(`${pathname}?${params.toString()}`);
    };

    return (
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-6 w-full">
            {/* Tabs Trạng thái */}
            <Tabs value={currentStatus} onValueChange={handleStatusChange}>
                <TabsList>
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
                    <TabsTrigger value="inactive">Ngừng hoạt động</TabsTrigger>
                    <TabsTrigger value="lead">Tiềm năng</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Search Box */}
            <div className="relative w-full md:max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Tìm kiếm khách hàng..."
                    className="w-full pl-8"
                    defaultValue={currentSearch}
                    onChange={(e) => handleSearch(e.target.value)}
                />
            </div>

            {/* Nút thêm mới */}
            <Button asChild className="whitespace-nowrap h-10">
                <Link href="/crm/customers/new">
                    <Plus className="mr-2 h-4 w-4" />
                    Thêm khách hàng
                </Link>
            </Button>
        </div>
    );
}