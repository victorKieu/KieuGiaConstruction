import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
      const cookieStore = await cookies(); // phải await
      const token = cookieStore.get("sb-access-token")?.value || null;
      const supabase = createSupabaseServerClient(token);

    // Kiểm tra xác thực
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { action, entityType, entityId, details } = body

    // Xác thực dữ liệu đầu vào
    if (!action || !entityType) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Lấy IP thực từ headers
    const forwardedFor = request.headers.get("x-forwarded-for")
    const ip = forwardedFor ? forwardedFor.split(",")[0] : "unknown"

    // Lấy user agent
    const userAgent = request.headers.get("user-agent") || "unknown"

    // Ghi log hoạt động
    const { data, error } = await supabase
      .from("activity_logs")
      .insert({
        user_id: session.user.id,
        action,
        entity_type: entityType,
        entity_id: entityId,
        details,
        ip_address: ip,
        user_agent: userAgent,
      })
      .select("id")

    if (error) {
      console.error("Error logging activity:", error)
      return NextResponse.json({ error: "Failed to log activity" }, { status: 500 })
    }

    return NextResponse.json({ success: true, id: data[0].id })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
