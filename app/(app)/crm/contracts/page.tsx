import Link from "next/link";
import { Suspense } from "react";
import { Plus, FileText, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContractList } from "@/components/crm/contracts/contract-list";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function ContractsPage() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Quản lý Hợp đồng</h2>
                        <p className="text-muted-foreground">
                            Theo dõi trạng thái hợp đồng, giá trị và tiến độ thi công.
                        </p>
                    </div>
                    <Button asChild>
                        <Link href="/crm/contracts/new">
                            <Plus className="mr-2 h-4 w-4" /> Tạo hợp đồng
                        </Link>
                    </Button>
                </div>

                {/* Filter Bar (Placeholder cho search sau này) */}
                <div className="flex items-center gap-2 my-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            type="search"
                            placeholder="Tìm theo số HĐ, tên khách hàng..."
                            className="pl-8 w-full"
                        />
                    </div>
                    <Button variant="outline" size="icon">
                        <FileText className="h-4 w-4" />
                    </Button>
                </div>

                {/* List Content */}
                <Suspense fallback={<TableLoading />}>
                    <ContractList />
                </Suspense>
            </div>
        </div>
    );
}

function TableLoading() {
    return (
        <div className="space-y-4">
            <div className="rounded-md border h-[400px] bg-muted/10 animate-pulse" />
        </div>
    )
}