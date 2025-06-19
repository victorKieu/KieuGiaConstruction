'use server'
import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function register(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

    const supabase = await createSupabaseServerClient()
  const { error } = await supabase.auth.signUp({ email, password })

  if (error) return { error: error.message }

  // Đăng ký thành công, chuyển hướng sang trang xác nhận email
  redirect('/auth/confirm-email')
}