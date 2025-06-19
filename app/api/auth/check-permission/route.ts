import { createRouteHandlerClient } from "@supabase/ssr"
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const supabase = createRouteHandlerClient({ cookies })

    // Kiểm tra xác thực
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ hasPermission: false }, { status: 200 })
    }

    const body = await request.json()
    const { permissionCode } = body

    if (!permissionCode) {
      return NextResponse.json({ error: "Permission code is required" }, { status: 400 })
    }

    // Lấy thông tin người dùng
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (userError) {
      return NextResponse.json({ hasPermission: false }, { status: 200 })
    }

    // Admin luôn có tất cả các quyền
    if (userData.role === "admin") {
      return NextResponse.json({ hasPermission: true }, { status: 200 })
    }

    // Kiểm tra quyền từ vai trò
    const { data: rolePermissions, error: roleError } = await supabase
      .from("role_permissions")
      .select("permissions(code)")
      .eq("role_id", userData.role)
      .contains("permissions.code", permissionCode)

    if (!roleError && rolePermissions && rolePermissions.length > 0) {
      return NextResponse.json({ hasPermission: true }, { status: 200 })
    }

    // Kiểm tra quyền trực tiếp của người dùng
    const { data: userPermissions, error: permError } = await supabase
      .from("user_permissions")
      .select("permissions(code)")
      .eq("user_id", session.user.id)
      .contains("permissions.code", permissionCode)

    if (!permError && userPermissions && userPermissions.length > 0) {
      return NextResponse.json({ hasPermission: true }, { status: 200 })
    }

    return NextResponse.json({ hasPermission: false }, { status: 200 })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ hasPermission: false }, { status: 200 })
  }
}
