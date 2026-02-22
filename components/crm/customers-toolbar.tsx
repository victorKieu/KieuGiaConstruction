"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useDebouncedCallback } from "use-debounce"; // Cần cài: npm i use-debounce
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

export function CustomersToolbar() {
    const searchParams = useSearchParams();
    const pathname = usePathname();
    const { replace } = useRouter();

    // Lấy giá trị hiện tại từ URL
    const currentStatus = searchParams.get("status") || "all";

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
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4">
            {/* Tabs Trạng thái - Bên trái */}
            <Tabs
                value={currentStatus}
                onValueChange={handleStatusChange}
                className="w-full md:w-auto"
            >
                {/* ✅ FIX: bg-muted/60 để màu nền TabsList dịu hơn trong dark mode */}
                <TabsList className="grid w-full grid-cols-4 md:w-auto bg-muted/60 p-1">
                    <TabsTrigger value="all">Tất cả</TabsTrigger>
                    <TabsTrigger value="active">Đang hoạt động</TabsTrigger>
                    <TabsTrigger value="inactive">Ngừng</TabsTrigger>
                    <TabsTrigger value="lead">Tiềm năng</TabsTrigger>
                </TabsList>
            </Tabs>

            {/* Công cụ bên phải: Search + Button */}
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto items-center">
                {/* Search Box */}
                <div className="relative w-full sm:w-[250px] lg:w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Tìm tên, SĐT..."
                        // ✅ FIX: bg-background để input nổi bật trên nền card
                        className="w-full pl-9 bg-background border-input"
                        defaultValue={searchParams.get("query")?.toString()}
                        onChange={(e) => handleSearch(e.target.value)}
                    />
                </div>

                {/* Nút thêm mới */}
                <Button asChild className="w-full sm:w-auto shadow-sm">
                    <Link href="/crm/customers/new">
                        <Plus className="mr-2 h-4 w-4" />
                        Thêm mới
                    </Link>
                </Button>
            </div>
        </div>
    );
}