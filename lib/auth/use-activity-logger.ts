"use client"

import { useCallback } from "react"
import { supabase } from '@/lib/supabase/client'
import { useAuth } from "./auth-context"

type EntityType =
  | "project"
  | "employee"
  | "customer"
  | "material"
  | "supplier"
  | "asset"
  | "report"
  | "user"
  | "permission"
  | "role"

type ActionType =
  | "create"
  | "update"
  | "delete"
  | "view"
  | "login"
  | "logout"
  | "export"
  | "import"
  | "approve"
  | "reject"

interface LogActivityParams {
  action: ActionType
  entityType: EntityType
  entityId?: string
  details?: Record<string, any>
}

export function useActivityLogger() {
  const { user } = useAuth()
  //const supabase = createClient()

  const logActivity = useCallback(
    async ({ action, entityType, entityId, details }: LogActivityParams) => {
      if (!user) return

      try {
        const { error } = await supabase.from("activity_logs").insert({
          user_id: user.id,
          action,
          entity_type: entityType,
          entity_id: entityId,
          details,
          ip_address: "client-side", // Không thể lấy IP thực từ client
          user_agent: navigator.userAgent,
        })

        if (error) {
          console.error("Failed to log activity:", error)
        }
      } catch (error) {
        console.error("Error logging activity:", error)
      }
    },
    [user, supabase],
  )

  return { logActivity }
}
