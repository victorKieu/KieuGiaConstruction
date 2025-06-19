"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"

interface HomeRedirectProps {
  isAuthenticated: boolean
}

export function HomeRedirect({ isAuthenticated }: HomeRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    // Redirect dựa trên trạng thái đăng nhập
    if (isAuthenticated) {
      router.push("/dashboard")
    } else {
      router.push("/login")
    }
  }, [isAuthenticated, router])

  // Hiển thị trạng thái loading trong khi chờ redirect
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
      <p className="text-muted-foreground">Đang chuyển hướng...</p>
    </div>
  )
}
