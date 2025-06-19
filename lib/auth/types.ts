export type UserRole = "admin" | "project_manager" | "hr_manager" | "accountant" | "inventory_manager" | "employee"

export interface UserPermission {
  id: string
  name: string
  code: string
  module: string
}

export interface UserSession {
  id: string
  email: string
  name?: string
  role?: UserRole
  permissions?: UserPermission[]
}

export interface AuthState {
  user: UserSession | null
  isLoading: boolean
  error: string | null
}

export interface PermissionCheck {
  hasPermission: boolean
  isLoading: boolean
}
