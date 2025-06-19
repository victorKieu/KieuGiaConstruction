import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Khởi tạo Supabase client (chỉ sử dụng cho server, dùng service role key nếu cần)
const supabase = createSupabaseServerClient()

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { email, password, role, profile } = body;
  // role: 'customer' | 'employee'
  // profile: { name, phone, ... }

  // 1. Đăng ký auth user
  const { data: signUpData, error: signUpError } = await supabase.auth.admin.createUser({
    email,
    password,
    user_metadata: { role }
  });
  if (signUpError || !signUpData?.user) {
    return NextResponse.json({ error: signUpError?.message || "Cannot create user" }, { status: 400 });
  }
  const auth_user_id = signUpData.user.id;

  // 2. Tạo row ở bảng users
  const { data: usersData, error: usersError } = await supabase
    .from("users")
    .insert([
      {
        auth_user_id,
        role,
        status: "active"
        // profile_id sẽ cập nhật sau
      }
    ])
    .select()
    .single();
  if (usersError || !usersData) {
    return NextResponse.json({ error: usersError?.message || "Cannot create users row" }, { status: 400 });
  }

  // 3. Tạo profile chi tiết
  const profileTable = role === "customer" ? "customers" : "employees";
  const { data: profileData, error: profileError } = await supabase
    .from(profileTable)
    .insert([profile])
    .select()
    .single();
  if (profileError || !profileData) {
    return NextResponse.json({ error: profileError?.message || "Cannot create profile" }, { status: 400 });
  }

  // 4. Cập nhật profile_id vào bảng users
  const { error: updateError } = await supabase
    .from("users")
    .update({ profile_id: profileData.id })
    .eq("auth_user_id", auth_user_id);
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    auth_user_id,
    user: usersData,
    profile: profileData
  });
}