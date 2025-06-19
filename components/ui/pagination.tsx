"use client"

import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react"

interface PaginationProps {
    currentPage: number
    totalPages: number
    onPageChange: (page: number) => void
    maxVisiblePages?: number
}

export function Pagination({ currentPage, totalPages, onPageChange, maxVisiblePages = 5 }: PaginationProps) {
    if (totalPages <= 1) return null

    const getVisiblePages = () => {
        if (totalPages <= maxVisiblePages) {
            return Array.from({ length: totalPages }, (_, i) => i + 1)
        }
        const pages: (number | "ellipsis")[] = []
        pages.push(1)
        const sidePages = Math.floor((maxVisiblePages - 3) / 2)
        let startPage = Math.max(2, currentPage - sidePages)
        let endPage = Math.min(totalPages - 1, currentPage + sidePages)
        if (currentPage - startPage < sidePages) {
            endPage = Math.min(totalPages - 1, endPage + (sidePages - (currentPage - startPage)))
        }
        if (endPage - currentPage < sidePages) {
            startPage = Math.max(2, startPage - (sidePages - (endPage - currentPage)))
        }
        if (startPage > 2) pages.push("ellipsis")
        for (let i = startPage; i <= endPage; i++) pages.push(i)
        if (endPage < totalPages - 1) pages.push("ellipsis")
        pages.push(totalPages)
        return pages
    }

    const visiblePages = getVisiblePages()

    return (
        <div className="flex items-center justify-center space-x-1">
            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Trang trước"
            >
                <ChevronLeft className="h-4 w-4" />
            </Button>

            {visiblePages.map((page, index) =>
                page === "ellipsis" ? (
                    <Button key={`ellipsis-${index}`} variant="outline" size="icon" disabled>
                        <MoreHorizontal className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        onClick={() => onPageChange(page)}
                        aria-label={`Trang ${page}`}
                        aria-current={currentPage === page ? "page" : undefined}
                    >
                        {page}
                    </Button>
                ),
            )}

            <Button
                variant="outline"
                size="icon"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
            >
                <ChevronRight className="h-4 w-4" />
            </Button>
        </div>
    )
}