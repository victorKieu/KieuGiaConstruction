import { Suspense } from "react"
import type { Metadata } from "next"

// UI Components
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

// Business Components
import { CrmStats } from "@/components/crm/crm-stats"
import { RecentCustomers } from "@/components/crm/recent-customers"
import { SalesPipeline } from "@/components/crm/sales-pipeline"
import { UpcomingActivities } from "@/components/crm/upcoming-activities"

// Chart Components
import { SourcePieChart } from "@/components/crm/charts/SourcePieChart"
import { SalesByLevelChart } from "@/components/crm/charts/SalesByLevelChart"
import { WeeklyInteractionChart } from "@/components/crm/charts/WeeklyInteractionChart"
import { AlertTable } from "@/components/crm/charts/AlertTable"
import { ReferralTable } from "@/components/crm/charts/ReferralTable"
import { ContractReportChart } from "@/components/crm/charts/ContractReportChart"
import { OpportunityForecastChart } from "@/components/crm/charts/OpportunityForecastChart"
import { CustomerSegmentChart } from "@/components/crm/charts/CustomerSegmentChart"
import { KpiDashboardTable } from "@/components/crm/charts/KpiDashboardTable"
import { ReminderAlertsTable } from "@/components/crm/charts/ReminderAlertsTable"

export const metadata: Metadata = {
    title: "CRM Dashboard | Kieu Gia Construction",
    description: "Quản lý khách hàng và cơ hội bán hàng",
}

// ✅ ĐẢM BẢO ĐÂY LÀ EXPORT DEFAULT DUY NHẤT
export default function CrmDashboardPage() {
    return (
        <div className="flex flex-col h-full bg-background">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h2>
                </div>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList className="bg-muted/50 border border-border">
                        <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                        <TabsTrigger value="analytics">Phân tích</TabsTrigger>
                        <TabsTrigger value="reports">Báo cáo</TabsTrigger>
                    </TabsList>

                    {/* --- TAB: TỔNG QUAN --- */}
                    <TabsContent value="overview" className="space-y-4 outline-none">
                        <Suspense fallback={<StatsLoading />}>
                            <CrmStats />
                        </Suspense>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <DashboardCard
                                title="Cơ hội bán hàng"
                                description="Tiến trình theo giai đoạn"
                                className="col-span-4"
                            >
                                <Suspense fallback={<ChartSkeleton height="h-[300px]" />}>
                                    <SalesPipeline />
                                </Suspense>
                            </DashboardCard>

                            <DashboardCard
                                title="Khách hàng mới"
                                description="Cập nhật gần đây"
                                className="col-span-3"
                            >
                                <Suspense fallback={<ListSkeleton count={5} />}>
                                    <RecentCustomers />
                                </Suspense>
                            </DashboardCard>
                        </div>

                        <div className="grid gap-4">
                            <DashboardCard
                                title="Hoạt động sắp tới"
                                description="Lịch làm việc trong 7 ngày tới"
                            >
                                <Suspense fallback={<ListSkeleton count={3} />}>
                                    <UpcomingActivities />
                                </Suspense>
                            </DashboardCard>
                        </div>
                    </TabsContent>

                    {/* --- TAB: PHÂN TÍCH --- */}
                    <TabsContent value="analytics" className="space-y-4 outline-none">
                        <div className="grid gap-4 md:grid-cols-3">
                            <DashboardCard title="Nguồn khách" contentClassName="h-[300px]">
                                <Suspense fallback={<ChartSkeleton />}>
                                    <SourcePieChart />
                                </Suspense>
                            </DashboardCard>
                            <DashboardCard title="Doanh số cấp độ" contentClassName="h-[300px]">
                                <Suspense fallback={<ChartSkeleton />}>
                                    <SalesByLevelChart />
                                </Suspense>
                            </DashboardCard>
                            <DashboardCard title="Tương tác tuần" contentClassName="h-[300px]">
                                <Suspense fallback={<ChartSkeleton />}>
                                    <WeeklyInteractionChart />
                                </Suspense>
                            </DashboardCard>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <DashboardCard title="Cảnh báo chăm sóc">
                                <Suspense fallback={<ChartSkeleton height="h-[400px]" />}>
                                    <AlertTable />
                                </Suspense>
                            </DashboardCard>
                            <DashboardCard title="Hiệu suất giới thiệu">
                                <Suspense fallback={<ChartSkeleton height="h-[400px]" />}>
                                    <ReferralTable />
                                </Suspense>
                            </DashboardCard>
                        </div>
                    </TabsContent>

                    {/* --- TAB: BÁO CÁO --- */}
                    <TabsContent value="reports" className="space-y-4 outline-none">
                        <div className="grid gap-4 md:grid-cols-3">
                            <Suspense fallback={<ChartSkeleton />}>
                                <ContractReportChart />
                            </Suspense>
                            <Suspense fallback={<ChartSkeleton />}>
                                <OpportunityForecastChart />
                            </Suspense>
                            <Suspense fallback={<ChartSkeleton />}>
                                <CustomerSegmentChart />
                            </Suspense>
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <DashboardCard title="KPI Nhân viên">
                                <KpiDashboardTable />
                            </DashboardCard>
                            <DashboardCard title="Cảnh báo đến hạn">
                                <ReminderAlertsTable />
                            </DashboardCard>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

// --- HELPERS (Nên để dưới cùng hoặc tách file) ---

interface DashboardCardProps {
    title: string
    description?: string
    children: React.ReactNode
    className?: string
    contentClassName?: string
}

function DashboardCard({ title, description, children, className, contentClassName }: DashboardCardProps) {
    return (
        <Card className={className}>
            <CardHeader className="pb-3">
                <CardTitle className="text-lg font-bold">{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className={contentClassName || "px-4 pb-4"}>
                {children}
            </CardContent>
        </Card>
    )
}

function StatsLoading() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
                <Card key={i} className="animate-pulse">
                    <CardHeader className="pb-2"><Skeleton className="h-4 w-20" /></CardHeader>
                    <CardContent><Skeleton className="h-8 w-24" /></CardContent>
                </Card>
            ))}
        </div>
    )
}

function ListSkeleton({ count }: { count: number }) {
    return (
        <div className="space-y-4 p-2">
            {[...Array(count)].map((_, i) => (
                <div key={i} className="flex gap-4 items-center">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2"><Skeleton className="h-4 w-1/2" /><Skeleton className="h-3 w-1/3" /></div>
                </div>
            ))}
        </div>
    )
}

function ChartSkeleton({ height = "h-[300px]" }: { height?: string }) {
    return <div className={`${height} w-full`}><Skeleton className="h-full w-full rounded-lg" /></div>
}