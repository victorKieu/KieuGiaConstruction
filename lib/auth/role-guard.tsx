"use client"

import type React from "react"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"
import { Loader2 } from "lucide-react"
import type { UserRole } from "./types"

interface RoleGuardProps {
  allowedRoles: UserRole[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!user) {
    return null
  }

  const hasRole = user.role && allowedRoles.includes(user.role)

  if (!hasRole) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <h2 className="text-xl font-bold mb-2">Không có quyền truy cập</h2>
          <p className="text-muted-foreground text-center">
            Bạn không có quyền truy cập vào trang này. Vui lòng liên hệ quản trị viên để được hỗ trợ.
          </p>
        </div>
      )
    )
  }

  return <>{children}</>
}
