import { Suspense } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { ArrowRight, Download, FileText, Plus } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cookies } from "next/headers";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  return (
    <div className="flex flex-col">
      <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold tracking-tight">Danh Sách Hợp đồng</h2>
          <Button asChild>
            <Link href="/crm/contracts/new">
              <Plus className="mr-2 h-4 w-4" /> Thêm hợp đồng mới
            </Link>
          </Button>
        </div>

        <Tabs defaultValue="all" className="space-y-4">
          <TabsList>
            <TabsTrigger value="all">Tất cả</TabsTrigger>
            <TabsTrigger value="active">Đang hiệu lực</TabsTrigger>
            <TabsTrigger value="draft">Bản nháp</TabsTrigger>
            <TabsTrigger value="expired">Hết hạn</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            <Suspense fallback={<ContractsLoading />}>
              <ContractsList />
            </Suspense>
          </TabsContent>

          <TabsContent value="active" className="space-y-4">
            <Suspense fallback={<ContractsLoading />}>
              <ContractsList status="active" />
            </Suspense>
          </TabsContent>

          <TabsContent value="draft" className="space-y-4">
            <Suspense fallback={<ContractsLoading />}>
              <ContractsList status="draft" />
            </Suspense>
          </TabsContent>

          <TabsContent value="expired" className="space-y-4">
            <Suspense fallback={<ContractsLoading />}>
              <ContractsList status="expired" />
            </Suspense>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

async function ContractsList({ status }: { status?: string }) {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

  let query = supabase.from("contracts").select(`
      id, 
      title, 
      description, 
      contract_value, 
      start_date, 
      end_date, 
      status, 
      created_at,
      file_url,
      customer_id,
      customers (name)
    `)

  if (status) {
    query = query.eq("status", status)
  }

  const { data: contracts, error } = await query.order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching contracts:", error)
    return <div>Đã xảy ra lỗi khi tải dữ liệu</div>
  }

  if (!contracts || contracts.length === 0) {
    return (
      <div className="text-center py-10">
        <h3 className="text-lg font-medium">Không có hợp đồng nào</h3>
        <p className="text-muted-foreground mt-2">Thêm hợp đồng mới để bắt đầu</p>
        <Button className="mt-4" asChild>
          <Link href="/crm/contracts/new">Thêm hợp đồng mới</Link>
        </Button>
      </div>
    )
  }

  const statusColors: Record<string, string> = {
    draft: "bg-gray-100 text-gray-800",
    active: "bg-green-100 text-green-800",
    expired: "bg-amber-100 text-amber-800",
    terminated: "bg-red-100 text-red-800",
  }

  const statusLabels: Record<string, string> = {
    draft: "Bản nháp",
    active: "Đang hiệu lực",
    expired: "Hết hạn",
    terminated: "Đã hủy",
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {contracts.map((contract) => {
        const statusColor = statusColors[contract.status] || "bg-gray-100 text-gray-800"
        const statusLabel = statusLabels[contract.status] || contract.status

        return (
          <Card key={contract.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">{contract.title}</CardTitle>
                </div>
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor}`}>
                  {statusLabel}
                </span>
              </div>
              <CardDescription className="flex justify-between items-center">
                        <span>
                            {contract.customers && Array.isArray(contract.customers) && contract.customers.length > 0
                                ? contract.customers[0].name
                                : "Khách hàng không xác định"}
                        </span>
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-2 space-y-3">
              <p className="text-sm line-clamp-2">{contract.description}</p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Giá trị</p>
                  <p className="font-medium">
                    {new Intl.NumberFormat("vi-VN", {
                      style: "currency",
                      currency: "VND",
                      maximumFractionDigits: 0,
                    }).format(contract.contract_value)}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Thời hạn</p>
                  <p className="font-medium">
                    {format(new Date(contract.start_date), "dd/MM/yyyy", { locale: vi })} -{" "}
                    {format(new Date(contract.end_date), "dd/MM/yyyy", { locale: vi })}
                  </p>
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0 pb-2 flex justify-between text-xs text-muted-foreground">
              <span>Tạo lúc: {format(new Date(contract.created_at), "PPp", { locale: vi })}</span>
            </CardContent>
            <CardContent className="pt-0 pb-4 flex justify-between">
              {contract.file_url && (
                <Button variant="outline" size="sm" className="gap-1">
                  <Download className="h-3 w-3" /> Tải xuống
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1" asChild>
                <Link href={`/crm/contracts/${contract.id}`}>
                  Chi tiết <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

function ContractsLoading() {
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
                  <Skeleton className="h-4 w-[120px]" />
                </div>
              </div>
            </CardContent>
            <CardContent className="pt-0 pb-2">
              <Skeleton className="h-3 w-[120px]" />
            </CardContent>
            <CardContent className="pt-0 pb-4 flex justify-between">
              <Skeleton className="h-8 w-[80px] rounded-md" />
              <Skeleton className="h-8 w-[80px] rounded-md" />
            </CardContent>
          </Card>
        ))}
    </div>
  )
}
