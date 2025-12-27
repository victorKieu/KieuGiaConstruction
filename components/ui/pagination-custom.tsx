"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils/utils";

interface PaginationProps {
    totalPages: number;
    currentPage: number;
}

export function Pagination({ totalPages, currentPage }: PaginationProps) {
    const pathname = usePathname();
    const searchParams = useSearchParams();

    // Hàm tạo URL cho trang mới (giữ nguyên các tham số filter khác)
    const createPageURL = (pageNumber: number | string) => {
        const params = new URLSearchParams(searchParams);
        params.set("page", pageNumber.toString());
        return `${pathname}?${params.toString()}`;
    };

    // Nếu chỉ có 1 trang hoặc không có dữ liệu thì ẩn phân trang
    if (totalPages <= 1) return null;

    return (
        <div className="flex items-center gap-2">
            {/* Nút Previous */}
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage <= 1}
                asChild={currentPage > 1}
            >
                {currentPage > 1 ? (
                    <Link href={createPageURL(currentPage - 1)}>
                        <ChevronLeft className="h-4 w-4" />
                    </Link>
                ) : (
                    <span><ChevronLeft className="h-4 w-4" /></span>
                )}
            </Button>

            {/* Thông tin số trang */}
            <div className="text-sm font-medium mx-2">
                Trang {currentPage} / {totalPages}
            </div>

            {/* Nút Next */}
            <Button
                variant="outline"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage >= totalPages}
                asChild={currentPage < totalPages}
            >
                {currentPage < totalPages ? (
                    <Link href={createPageURL(currentPage + 1)}>
                        <ChevronRight className="h-4 w-4" />
                    </Link>
                ) : (
                    <span><ChevronRight className="h-4 w-4" /></span>
                )}
            </Button>
        </div>
    );
}