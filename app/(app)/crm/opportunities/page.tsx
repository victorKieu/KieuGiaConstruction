import { Suspense } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
//import { vi } from "date-fns/locale";
import { Plus } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
//import { format } from "date-fns";
import { OpportunitiesList } from "@/components/opportunities/opportunities-list"; // Import OpportunitiesList

export const dynamic = "force-dynamic";

export default function OpportunitiesPage() {
    return (
        <div className="flex flex-col">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between">
                    <h2 className="text-3xl font-bold tracking-tight">Cơ hội bán hàng</h2>
                    <Button asChild>
                        <Link href="/crm/opportunities/new">
                            <Plus className="mr-2 h-4 w-4" /> Thêm cơ hội mới
                        </Link>
                    </Button>
                </div>
                <Tabs defaultValue="all" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="all">Tất cả</TabsTrigger>
                        <TabsTrigger value="open">Đang mở</TabsTrigger>
                        <TabsTrigger value="won">Thành công</TabsTrigger>
                        <TabsTrigger value="lost">Thất bại</TabsTrigger>
                    </TabsList>
                    <TabsContent value="all" className="space-y-4">
                        <Suspense fallback={<OpportunitiesLoading />}>
                            <OpportunitiesList />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="open" className="space-y-4">
                        <Suspense fallback={<OpportunitiesLoading />}>
                            <OpportunitiesList status="open" />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="won" className="space-y-4">
                        <Suspense fallback={<OpportunitiesLoading />}>
                            <OpportunitiesList status="closed_won" />
                        </Suspense>
                    </TabsContent>
                    <TabsContent value="lost" className="space-y-4">
                        <Suspense fallback={<OpportunitiesLoading />}>
                            <OpportunitiesList status="closed_lost" />
                        </Suspense>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}

function OpportunitiesLoading() {
    return (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array(6)
                .fill(0)
                .map((_, i) => (
                    <Card key={i} className="animate-pulse">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <Skeleton className="h-5 w-[120px]" />
                                <Skeleton className="h-5 w-[80px] rounded-full" />
                            </div>
                            <div className="flex justify-between items-center pt-1">
                                <Skeleton className="h-4 w-[100px]" />
                                <Skeleton className="h-4 w-[80px]" />
                            </div>
                        </CardHeader>
                        <CardContent className="pb-2 space-y-3">
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-full" />
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Skeleton className="h-3 w-[40px] mb-1" />
                                    <Skeleton className="h-4 w-[80px]" />
                                </div>
                                <div>
                                    <Skeleton className="h-3 w-[40px] mb-1" />
                                    <Skeleton className="h-4 w-[60px]" />
                                </div>
                            </div>
                        </CardContent>
                        <CardContent className="pt-0 pb-2">
                            <Skeleton className="h-2 w-full rounded-full" />
                        </CardContent>
                        <CardContent className="pt-0 pb-2">
                            <Skeleton className="h-3 w-[120px]" />
                        </CardContent>
                        <CardContent className="pt-0 pb-4 flex justify-end">
                            <Skeleton className="h-8 w-[80px] rounded-md" />
                        </CardContent>
                    </Card>
                ))}
        </div>
    );
}