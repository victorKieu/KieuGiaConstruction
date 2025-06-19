"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, AlertTriangle, Clock, RefreshCw } from "lucide-react"
import Header from "@/components/header"
import { Button } from "@/components/ui/button"

interface TableStatus {
  name: string
  displayName: string
  status: string
  message: string
  count: number | null
}

interface SystemStatusClientProps {
  supabaseStatus: {
    status: string
    message: string
    latency: number | null
  }
  tableStatuses: TableStatus[]
  authStatus: {
    status: string
    message: string
  }
}

export default function SystemStatusClient({ supabaseStatus, tableStatuses, authStatus }: SystemStatusClientProps) {
  // Hiển thị biểu tượng trạng thái
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "online":
        return <CheckCircle2 className="w-5 h-5 text-green-500" />
      case "error":
        return <XCircle className="w-5 h-5 text-red-500" />
      case "warning":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />
      case "rate_limited":
        return <Clock className="w-5 h-5 text-orange-500" />
      default:
        return <RefreshCw className="w-5 h-5 text-gray-500 animate-spin" />
    }
  }

  return (
    <>
      <Header title="Trạng thái hệ thống" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold">Trạng thái hệ thống</h1>
          <Button onClick={() => window.location.reload()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Làm mới
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                {getStatusIcon(supabaseStatus.status)}
                <span className="ml-2">Kết nối Supabase</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{supabaseStatus.message}</p>
              {supabaseStatus.latency !== null && (
                <p className="text-sm mt-1">
                  Độ trễ: <span className="font-medium">{supabaseStatus.latency}ms</span>
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center">
                {getStatusIcon(authStatus.status)}
                <span className="ml-2">Xác thực</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">{authStatus.message}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Thông tin hệ thống</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Phiên bản</span>
                  <span className="text-sm font-medium">1.0.0</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Môi trường</span>
                  <span className="text-sm font-medium">Production</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">Thời gian kiểm tra</span>
                  <span className="text-sm font-medium">{new Date().toLocaleString("vi-VN")}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Trạng thái bảng dữ liệu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Bảng</th>
                    <th className="text-left py-3 px-4 font-medium">Trạng thái</th>
                    <th className="text-left py-3 px-4 font-medium">Số bản ghi</th>
                    <th className="text-left py-3 px-4 font-medium">Thông tin</th>
                  </tr>
                </thead>
                <tbody>
                  {tableStatuses.map((table) => (
                    <tr key={table.name} className="border-b">
                      <td className="py-3 px-4 font-medium">{table.displayName}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center">
                          {getStatusIcon(table.status)}
                          <span className="ml-2">
                            {table.status === "online"
                              ? "Hoạt động"
                              : table.status === "error"
                                ? "Lỗi"
                                : table.status === "rate_limited"
                                  ? "Giới hạn tốc độ"
                                  : "Đang kiểm tra"}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">{table.count !== null ? table.count : "-"}</td>
                      <td className="py-3 px-4 text-sm text-gray-500">{table.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Hướng dẫn xử lý lỗi</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-medium mb-1">Lỗi "Too Many Requests"</h3>
                  <p className="text-sm text-gray-500">
                    Lỗi này xảy ra khi bạn đã đạt đến giới hạn tốc độ truy vấn của Supabase. Hãy thử lại sau vài phút
                    hoặc tối ưu hóa các truy vấn của bạn để giảm số lượng yêu cầu.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Lỗi kết nối</h3>
                  <p className="text-sm text-gray-500">
                    Kiểm tra kết nối internet của bạn và đảm bảo rằng dịch vụ Supabase đang hoạt động. Nếu vấn đề vẫn
                    tiếp tục, hãy liên hệ với quản trị viên hệ thống.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Lỗi xác thực</h3>
                  <p className="text-sm text-gray-500">
                    Đăng xuất và đăng nhập lại vào hệ thống. Nếu vấn đề vẫn tiếp tục, hãy liên hệ với quản trị viên để
                    kiểm tra quyền truy cập của bạn.
                  </p>
                </div>
                <div>
                  <h3 className="font-medium mb-1">Nhiều phiên bản GoTrueClient</h3>
                  <p className="text-sm text-gray-500">
                    Cảnh báo "Multiple GoTrueClient instances" có thể xuất hiện nếu nhiều client Supabase được tạo ra.
                    Điều này đã được khắc phục bằng cách sử dụng mẫu singleton cho client.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
