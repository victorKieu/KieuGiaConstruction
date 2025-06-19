import { NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/types/supabase"

// API route này sử dụng service role key để bỏ qua RLS
export async function POST(request: Request) {
  try {
    // Lấy projectId từ request body
    const { projectId } = await request.json()

    if (!projectId) {
      return NextResponse.json({ success: false, error: "ID dự án không được cung cấp" }, { status: 400 })
    }

    // Tạo admin client với service role key để bỏ qua RLS
    const supabaseAdmin = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    )

    // Xóa dự án bằng admin client
    const { error } = await supabaseAdmin.from("projects").delete().eq("id", projectId)

    if (error) {
      console.error("Lỗi khi xóa dự án:", error)
      return NextResponse.json({ success: false, error: `Không thể xóa dự án: ${error.message}` }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Lỗi xử lý yêu cầu:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Đã xảy ra lỗi khi xóa dự án",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
