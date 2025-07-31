import Link from "next/link"
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart, LineChart, PieChart, Plus, FileText } from "lucide-react"
import { formatDate } from "@/lib/utils/utils"

export default async function ReportsPage() {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

  const { data: reportTemplates } = await supabase.from("report_templates").select("*").order("name")

  const { data: reports } = await supabase
    .from("reports")
    .select("*, report_templates(name)")
    .order("created_at", { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Báo cáo</h1>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="w-4 h-4 mr-2" />
            Tạo báo cáo mới
          </Link>
        </Button>
      </div>

      <Tabs defaultValue="templates" className="space-y-4">
        <TabsList>
          <TabsTrigger value="templates">Mẫu báo cáo</TabsTrigger>
          <TabsTrigger value="reports">Báo cáo đã tạo</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {reportTemplates?.map((template) => (
              <Card key={template.id} className="hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div>
                    <CardTitle>{template.name}</CardTitle>
                    <CardDescription>{template.description || "Không có mô tả"}</CardDescription>
                  </div>
                  {template.type === "project_progress" ? (
                    <BarChart className="w-8 h-8 text-muted-foreground" />
                  ) : template.type === "project_finance" ? (
                    <LineChart className="w-8 h-8 text-muted-foreground" />
                  ) : template.type === "hr_report" ? (
                    <PieChart className="w-8 h-8 text-muted-foreground" />
                  ) : (
                    <FileText className="w-8 h-8 text-muted-foreground" />
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Loại báo cáo:</span>
                      <span>{template.type}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Hệ thống:</span>
                      <span>{template.is_system ? "Có" : "Không"}</span>
                    </div>
                    <Button className="w-full mt-4" asChild>
                      <Link href={`/reports/generate/${template.id}`}>Tạo báo cáo</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

            {(!reportTemplates || reportTemplates.length === 0) && (
              <div className="col-span-full text-center py-12">
                <p className="text-muted-foreground">Chưa có mẫu báo cáo nào.</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Báo cáo gần đây</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Tên báo cáo</th>
                      <th className="text-left py-3 px-4 font-medium">Loại</th>
                      <th className="text-left py-3 px-4 font-medium">Mẫu</th>
                      <th className="text-left py-3 px-4 font-medium">Ngày tạo</th>
                      <th className="text-left py-3 px-4 font-medium">Trạng thái</th>
                      <th className="text-left py-3 px-4 font-medium">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports?.map((report) => (
                      <tr key={report.id} className="border-b">
                        <td className="py-3 px-4 font-medium">{report.name}</td>
                        <td className="py-3 px-4">{report.type}</td>
                        <td className="py-3 px-4">{report.report_templates?.name || "-"}</td>
                        <td className="py-3 px-4">{formatDate(report.created_at)}</td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              report.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : report.status === "processing"
                                  ? "bg-blue-100 text-blue-800"
                                  : report.status === "failed"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                            }`}
                          >
                            {report.status === "completed"
                              ? "Hoàn thành"
                              : report.status === "processing"
                                ? "Đang xử lý"
                                : report.status === "failed"
                                  ? "Thất bại"
                                  : report.status || "Không xác định"}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/reports/${report.id}`}>Xem</Link>
                          </Button>
                        </td>
                      </tr>
                    ))}

                    {(!reports || reports.length === 0) && (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-muted-foreground">
                          Chưa có báo cáo nào. Hãy tạo báo cáo mới!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
