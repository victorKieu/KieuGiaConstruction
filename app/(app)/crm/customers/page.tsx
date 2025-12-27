import type { Metadata } from "next";
import { CustomersFilterAndList } from "@/components/crm/customers-filter-and-list";
import { Suspense } from "react";
import { CardListSkeleton } from "@/components/ui/skeletons/card-list-skeleton";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
    title: "Quản lý khách hàng | CRM",
};

interface PageProps {
    searchParams: Promise<{
        page?: string;
        query?: string;
        status?: string; // Nhận thêm status từ URL
    }>;
}

export default async function CustomersPage({ searchParams }: PageProps) {
    const params = await searchParams;

    const currentPage = Number(params.page) || 1;
    const query = params.query || "";
    const status = params.status || "all";

    return (
        <div className="flex flex-col h-full space-y-4 p-4 md:p-8 pt-6">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Danh Sách khách hàng</h2>

            {/* Key giúp Suspense re-render khi URL thay đổi */}
            <Suspense key={query + currentPage + status} fallback={<CardListSkeleton count={5} />}>
                <CustomersFilterAndList
                    currentPage={currentPage}
                    query={query}
                    status={status}
                />
            </Suspense>
        </div>
    );
}