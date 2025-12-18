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

export default function CrmDashboardPage() {
    return (
        <div className="flex flex-col h-full">
            <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
                <div className="flex items-center justify-between space-y-2">
                    <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
                </div>

                <Tabs defaultValue="overview" className="space-y-4">
                    <TabsList>
                        <TabsTrigger value="overview">Tổng quan</TabsTrigger>
                        <TabsTrigger value="analytics">Phân tích</TabsTrigger>
                        <TabsTrigger value="reports">Báo cáo</TabsTrigger>
                    </TabsList>

                    {/* --- TAB: TỔNG QUAN --- */}
                    <TabsContent value="overview" className="space-y-4">
                        <Suspense fallback={<StatsLoading />}>
                            <CrmStats />
                        </Suspense>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                            <DashboardCard
                                title="Cơ hội bán hàng"
                                description="Theo dõi tiến trình các cơ hội bán hàng theo giai đoạn"
                                className="col-span-4"
                            >
                                <Suspense fallback={<ChartSkeleton height="h-[250px]" />}>
                                    <SalesPipeline />
                                </Suspense>
                            </DashboardCard>

                            <DashboardCard
                                title="Khách hàng gần đây"
                                description="Khách hàng mới và cập nhật gần đây"
                                className="col-span-3"
                            >
                                <Suspense fallback={<ListSkeleton count={5} />}>
                                    <RecentCustomers />
                                </Suspense>
                            </DashboardCard>
                        </div>

                        <div className="grid gap-4 grid-cols-1">
                            <DashboardCard
                                title="Hoạt động sắp tới"
                                description="Các cuộc gọi, cuộc họp và nhiệm vụ đã lên lịch"
                            >
                                <Suspense fallback={<ListSkeleton count={3} />}>
                                    <UpcomingActivities />
                                </Suspense>
                            </DashboardCard>
                        </div>
                    </TabsContent>

                    {/* --- TAB: PHÂN TÍCH --- */}
                    <TabsContent value="analytics" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <DashboardCard title="Phân bổ nguồn" description="Tỷ lệ khách hàng theo kênh" contentClassName="h-[300px]">
                                <SourcePieChart />
                            </DashboardCard>

                            <DashboardCard title="Doanh số theo cấp" description="Phân tích doanh số nhóm KH" contentClassName="h-[300px]">
                                <SalesByLevelChart />
                            </DashboardCard>

                            <DashboardCard title="Tương tác tuần" description="Số lượt gọi, gặp, báo giá" contentClassName="h-[300px]">
                                <WeeklyInteractionChart />
                            </DashboardCard>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <DashboardCard title="Cảnh báo chăm sóc" description="Khách hàng chưa được chăm sóc đúng hạn">
                                <AlertTable />
                            </DashboardCard>

                            <DashboardCard title="Hiệu suất giới thiệu" description="Khách hàng và CTV giới thiệu thành công">
                                <ReferralTable />
                            </DashboardCard>
                        </div>
                    </TabsContent>

                    {/* --- TAB: BÁO CÁO --- */}
                    <TabsContent value="reports" className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            <DashboardCard title="Hợp đồng" description="Thống kê trạng thái và giá trị" contentClassName="h-[300px]">
                                <ContractReportChart />
                            </DashboardCard>

                            <DashboardCard title="Dự báo doanh thu" description="Ước lượng từ các cơ hội mở" contentClassName="h-[300px]">
                                <OpportunityForecastChart />
                            </DashboardCard>

                            <DashboardCard title="Phân khúc" description="Phân tích theo nhóm khách hàng" contentClassName="h-[300px]">
                                <CustomerSegmentChart />
                            </DashboardCard>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <DashboardCard title="KPI Nhân viên" description="Hiệu suất bán hàng và CSKH">
                                <KpiDashboardTable />
                            </DashboardCard>

                            <DashboardCard title="Cảnh báo đến hạn" description="Hợp đồng và hoạt động cần xử lý">
                                <ReminderAlertsTable />
                            </DashboardCard>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    )
}

// --- REUSABLE COMPONENT (Giảm lặp code) ---
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
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                {description && <CardDescription>{description}</CardDescription>}
            </CardHeader>
            <CardContent className={contentClassName || "pl-2"}>
                {children}
            </CardContent>
        </Card>
    )
}

// --- SKELETONS (Clean & Generic) ---
function StatsLoading() {
    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {Array(4).fill(0).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-[70px]" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-7 w-[100px] mb-1" />
                        <Skeleton className="h-4 w-[120px]" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

function ListSkeleton({ count = 5 }: { count?: number }) {
    return (
        <div className="space-y-4">
            {Array(count).fill(0).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-[60%]" />
                        <Skeleton className="h-3 w-[40%]" />
                    </div>
                </div>
            ))}
        </div>
    )
}

function ChartSkeleton({ height = "h-[300px]" }: { height?: string }) {
    return (
        <div className={`${height} flex items-center justify-center w-full`}>
            <Skeleton className="h-[90%] w-[90%] rounded-md" />
        </div>
    )
}