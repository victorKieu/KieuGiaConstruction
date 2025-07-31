import { createSupabaseServerClient } from "@/lib/supabase/server";
import SystemStatusClient from "./system-status-client"
import { cookies } from "next/headers";

export default async function SystemStatusPage() {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

  // Kiểm tra kết nối Supabase
  let supabaseStatus = { status: "unknown", message: "Đang kiểm tra...", latency: null }

  try {
    const startTime = Date.now()
    const { data, error } = await supabase.from("system_status").select("*").limit(1)
    const endTime = Date.now()

    if (error) {
      if (error.message.includes("Too Many")) {
        supabaseStatus = {
          status: "rate_limited",
          message: "Đã đạt giới hạn tốc độ truy vấn. Vui lòng thử lại sau.",
          latency: null,
        }
      } else {
        supabaseStatus = {
          status: "error",
          message: error.message,
          latency: null,
        }
      }
    } else {
      supabaseStatus = {
        status: "online",
        message: "Kết nối thành công",
        latency: endTime - startTime,
      }
    }
  } catch (err) {
    supabaseStatus = {
      status: "error",
      message: err instanceof Error ? err.message : "Lỗi không xác định",
      latency: null,
    }
  }

  // Kiểm tra các bảng chính
  const tables = [
    { name: "users", displayName: "Người dùng" },
    { name: "projects", displayName: "Dự án" },
    { name: "employees", displayName: "Nhân viên" },
    { name: "customers", displayName: "Khách hàng" },
    { name: "permissions", displayName: "Quyền hạn" },
    { name: "roles", displayName: "Vai trò" },
  ]

  const tableStatuses = await Promise.all(
    tables.map(async (table) => {
      try {
        const { count, error } = await supabase.from(table.name).select("*", { count: "exact", head: true })

        if (error) {
          if (error.message.includes("Too Many")) {
            return {
              ...table,
              status: "rate_limited",
              message: "Đã đạt giới hạn tốc độ truy vấn",
              count: null,
            }
          }
          return {
            ...table,
            status: "error",
            message: error.message,
            count: null,
          }
        }

        return {
          ...table,
          status: "online",
          message: "Hoạt động bình thường",
          count,
        }
      } catch (err) {
        return {
          ...table,
          status: "error",
          message: err instanceof Error ? err.message : "Lỗi không xác định",
          count: null,
        }
      }
    }),
  )

  // Lấy thông tin phiên đăng nhập
  let authStatus = { status: "unknown", message: "Đang kiểm tra..." }

  try {
    const { data, error } = await supabase.auth.getSession()

    if (error) {
      authStatus = {
        status: "error",
        message: error.message,
      }
    } else if (data.session) {
      authStatus = {
        status: "online",
        message: "Phiên đăng nhập hợp lệ",
      }
    } else {
      authStatus = {
        status: "warning",
        message: "Chưa đăng nhập",
      }
    }
  } catch (err) {
    authStatus = {
      status: "error",
      message: err instanceof Error ? err.message : "Lỗi không xác định",
    }
  }

  return <SystemStatusClient supabaseStatus={supabaseStatus} tableStatuses={tableStatuses} authStatus={authStatus} />
}
