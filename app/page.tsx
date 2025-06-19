export const dynamic = 'force-dynamic';

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { HomeRedirect } from "@/components/home-redirect"

export default async function Home() {
    try {
        const supabase = await createSupabaseServerClient() // Sử dụng await nếu cần

        const {
            data: { session },
            error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
            console.error("Error getting session:", sessionError)
            return (
                <div className="container mx-auto py-10">
                    <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                        <h2 className="text-lg font-semibold text-red-700">Đã xảy ra lỗi</h2>
                        <p className="text-red-600">Không thể kết nối đến máy chủ. Vui lòng thử lại sau.</p>
                        <p className="text-sm text-red-500 mt-2">Chi tiết lỗi: {sessionError.message}</p>
                    </div>
                </div>
            )
        }

        return <HomeRedirect isAuthenticated={!!session} />

    } catch (error) {
        console.error("Unexpected error:", error)
        return (
            <div className="container mx-auto py-10">
                <div className="p-4 bg-red-50 border border-red-200 rounded-md">
                    <h2 className="text-lg font-semibold text-red-700">Đã xảy ra lỗi không mong muốn</h2>
                    <p className="text-red-600">Vui lòng thử lại sau hoặc liên hệ quản trị viên.</p>
                </div>
            </div>
        )
    }
}