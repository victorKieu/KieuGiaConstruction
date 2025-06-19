import { NextRequest, NextResponse } from 'next/server'
import { registerUser } from '@/lib/auth/register'
import { completeProfile } from '@/lib/auth/complete-profile'

// Ví dụ: API đăng ký khách hàng
export async function POST(req: NextRequest) {
  const body = await req.json()

  // 1. Đăng ký auth user + users row
  const { authUser } = await registerUser({
    email: body.email,
    password: body.password,
    role: 'customer'
  })

  // 2. Tạo customers profile + cập nhật profile_id
  await completeProfile({
    auth_user_id: authUser.id,
    role: 'customer',
    profileData: {
      name: body.fullName,
      phone: body.phone,
      // ... các trường khác
    }
  })

  return NextResponse.json({ success: true })
}