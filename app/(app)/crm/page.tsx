import { Suspense } from "react"
import type { Metadata } from "next"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CrmStats } from "@/components/crm/crm-stats"
import { RecentCustomers } from "@/components/crm/recent-customers"
import { SalesPipeline } from "@/components/crm/sales-pipeline"
import { UpcomingActivities } from "@/components/crm/upcoming-activities"
import { Skeleton } from "@/components/ui/skeleton"

export const metadata: Metadata = {
  title: "CRM Dashboard | Kieu Gia Construction",
  description: "Quản lý khách hàng và cơ hội bán hàng",
}

export default function CrmDashboardPage() {
  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="analytics">Phân tích</TabsTrigger>
            <TabsTrigger value="reports">Báo cáo</TabsTrigger>
          </TabsList>
          <TabsContent value="overview" className="space-y-4">
            <Suspense fallback={<StatsLoading />}>
              <CrmStats />
            </Suspense>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="col-span-4">
                <CardHeader>
                  <CardTitle>Cơ hội bán hàng</CardTitle>
                  <CardDescription>Theo dõi tiến trình các cơ hội bán hàng theo giai đoạn</CardDescription>
                </CardHeader>
                <CardContent className="pl-2">
                  <Suspense
                    fallback={
                      <div className="h-[300px] flex items-center justify-center">
                        <Skeleton className="h-[250px] w-full" />
                      </div>
                    }
                  >
                    <SalesPipeline />
                  </Suspense>
                </CardContent>
              </Card>
              <Card className="col-span-3">
                <CardHeader>
                  <CardTitle>Khách hàng gần đây</CardTitle>
                  <CardDescription>Khách hàng mới và cập nhật gần đây</CardDescription>
                </CardHeader>
                <CardContent>
                  <Suspense fallback={<CustomersLoading />}>
                    <RecentCustomers />
                  </Suspense>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Hoạt động sắp tới</CardTitle>
                <CardDescription>Các cuộc gọi, cuộc họp và nhiệm vụ đã lên lịch</CardDescription>
              </CardHeader>
              <CardContent>
                <Suspense fallback={<ActivitiesLoading />}>
                  <UpcomingActivities />
                </Suspense>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Phân tích</CardTitle>
                <CardDescription>Phân tích chi tiết về hiệu suất bán hàng và khách hàng</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Tính năng phân tích đang được phát triển</p>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Báo cáo</CardTitle>
                <CardDescription>Báo cáo chi tiết về hoạt động CRM</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px] flex items-center justify-center">
                <p className="text-muted-foreground">Tính năng báo cáo đang được phát triển</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function StatsLoading() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array(4)
        .fill(0)
        .map((_, i) => (
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

function CustomersLoading() {
  return (
    <div className="space-y-4">
      {Array(5)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-[150px]" />
              <Skeleton className="h-3 w-[100px]" />
            </div>
          </div>
        ))}
    </div>
  )
}

function ActivitiesLoading() {
  return (
    <div className="space-y-4">
      {Array(3)
        .fill(0)
        .map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-[200px]" />
              <Skeleton className="h-3 w-full" />
            </div>
            <Skeleton className="h-8 w-[100px]" />
          </div>
        ))}
    </div>
  )
}
