import Link from "next/link";
import { Suspense } from "react";
import { Plus, LayoutGrid, List } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PipelineBoard } from "@/components/crm/opportunities/pipeline-board";

export const dynamic = "force-dynamic";

export default function OpportunitiesPage() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="text-3xl font-bold tracking-tight">Cơ hội bán hàng</h2>
                        <p className="text-muted-foreground">
                            Quản lý quy trình bán hàng và dự báo doanh thu.
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline">Xuất Excel</Button>
                        <Button asChild>
                            <Link href="/crm/opportunities/new">
                                <Plus className="mr-2 h-4 w-4" /> Tạo cơ hội mới
                            </Link>
                        </Button>
                    </div>
                </div>

                {/* View Switcher (Kanban vs List) */}
                <Tabs defaultValue="kanban" className="space-y-4 h-full">
                    <div className="flex items-center justify-between">
                        <TabsList>
                            <TabsTrigger value="kanban" className="gap-2">
                                <LayoutGrid className="h-4 w-4" /> Kanban
                            </TabsTrigger>
                            <TabsTrigger value="list" className="gap-2">
                                <List className="h-4 w-4" /> Danh sách
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <TabsContent value="kanban" className="h-full border-none p-0">
                        <Suspense fallback={<PipelineLoading />}>
                            <PipelineBoard />
                        </Suspense>
                    </TabsContent>

                    <TabsContent value="list">
                        <div className="flex items-center justify-center h-64 border rounded-md bg-muted/10">
                            <p className="text-muted-foreground">Chế độ xem danh sách đang được phát triển...</p>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function PipelineLoading() {
    return (
        <div className="flex gap-4 overflow-hidden">
            {[1, 2, 3, 4].map(i => (
                <div key={i} className="min-w-[300px] h-[500px] bg-muted/20 rounded-lg animate-pulse" />
            ))}
        </div>
    )
}