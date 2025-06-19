"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-context"
import { Loader2 } from "lucide-react"

interface PermissionGuardProps {
  permissionCode: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function PermissionGuard({ permissionCode, children, fallback }: PermissionGuardProps) {
  const { user, isLoading, checkPermission } = useAuth()
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const router = useRouter()

  useEffect(() => {
    const checkUserPermission = async () => {
      if (!user) {
        setHasPermission(false)
        return
      }

      const result = await checkPermission(permissionCode)
      setHasPermission(result)
    }

    if (!isLoading) {
      checkUserPermission()
    }
  }, [user, isLoading, permissionCode, checkPermission])

  if (isLoading || hasPermission === null) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasPermission) {
    return (
      fallback || (
        <div className="flex flex-col items-center justify-center h-full p-4">
          <h2 className="text-xl font-bold mb-2">Không có quyền truy cập</h2>
          <p className="text-muted-foreground text-center">
            Bạn không có quyền truy cập vào tính năng này. Vui lòng liên hệ quản trị viên để được hỗ trợ.
          </p>
        </div>
      )
    )
  }

  return <>{children}</>
}
