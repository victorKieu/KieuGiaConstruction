"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

interface HomeRedirectProps {
  isAuthenticated: boolean
}

export default function HomeRedirect({ isAuthenticated }: HomeRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    // Sử dụng setTimeout để đảm bảo redirect xảy ra sau khi component đã mount
    const redirectTimer = setTimeout(() => {
      if (isAuthenticated) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
    }, 100)

    return () => clearTimeout(redirectTimer)
  }, [isAuthenticated, router])

  return (
    <Card className="w-full max-w-md p-6">
      <CardContent className="flex flex-col items-center justify-center py-10">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-center text-muted-foreground">
          {isAuthenticated ? "Đang chuyển hướng đến Dashboard..." : "Đang chuyển hướng đến trang đăng nhập..."}
        </p>
      </CardContent>
    </Card>
  )
}
