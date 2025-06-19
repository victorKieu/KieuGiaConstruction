"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Application error:", error)
  }, [error])

  // Kiểm tra xem lỗi có phải là lỗi redirect không
  if (error.message === "NEXT_REDIRECT" || error.message.includes("redirect")) {
    // Nếu là lỗi redirect, không hiển thị gì cả và để Next.js xử lý redirect
    return null
  }

  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-xl">Đã xảy ra lỗi</CardTitle>
          <CardDescription>Hệ thống đã gặp lỗi khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-red-50 border border-red-200 rounded-md p-4 text-sm text-red-800">
            <p className="font-medium">Thông tin lỗi:</p>
            <p className="mt-1">{error.message || "Lỗi không xác định"}</p>
            {error.digest && (
              <p className="mt-1">
                Mã lỗi: <code className="bg-red-100 px-1 py-0.5 rounded">{error.digest}</code>
              </p>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={reset} className="flex items-center">
            <RefreshCw className="mr-2 h-4 w-4" />
            Thử lại
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
