import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import crypto from "crypto"

export async function POST(request: Request) {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    try {

    // Kiểm tra xác thực và quyền
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Kiểm tra quyền tạo người dùng
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single()

    if (userError || userData.role !== "admin") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 })
    }

    const body = await request.json();
    const { email, name, role, employeeId } = body

    // Xác thực dữ liệu đầu vào
    if (!email || !name) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Tạo mật khẩu ngẫu nhiên
    const password = crypto.randomBytes(12).toString("hex")

    // Tạo người dùng trong Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    // Tạo người dùng trong bảng users
    const { error: insertError } = await supabase.from("users").insert({
      id: authData.user.id,
      email,
      name,
      role,
      employee_id: employeeId,
      status: "active",
    })

    if (insertError) {
      // Nếu có lỗi, xóa người dùng đã tạo trong Auth
      await supabase.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    // Ghi log hoạt động
    await supabase.from("activity_logs").insert({
      user_id: session.user.id,
      action: "create",
      entity_type: "user",
      entity_id: authData.user.id,
      details: { email, name, role },
    })

    return NextResponse.json({
      success: true,
      user: {
        id: authData.user.id,
        email,
        name,
        role,
      },
      temporaryPassword: password,
    })
  } catch (error) {
    console.error("Server error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}