import { Button } from "@/components/ui/button"
import { ShieldAlert } from "lucide-react"
import Link from "next/link"

interface AccessDeniedProps {
  message?: string
  showHomeButton?: boolean
}

export function AccessDenied({
  message = "Bạn không có quyền truy cập vào trang này.",
  showHomeButton = true,
}: AccessDeniedProps) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="flex flex-col items-center text-center max-w-md">
        <div className="p-4 rounded-full bg-red-100 mb-4">
          <ShieldAlert className="h-12 w-12 text-red-600" />
        </div>
        <h1 className="text-2xl font-bold mb-2">Truy cập bị từ chối</h1>
        <p className="text-muted-foreground mb-6">{message}</p>
        {showHomeButton && (
          <Button asChild>
            <Link href="/">Quay lại trang chủ</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
