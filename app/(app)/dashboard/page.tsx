import { createSupabaseServerClient } from "@/lib/supabase/server";
import Dashboard from '@/components/dashboard/Dashboard'
import { cookies } from "next/headers";

export default async function DashboardPage() {

    // --- PHẦN 1: Lấy User ---
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Lỗi xác thực</h1>
                    <p className="text-muted-foreground mb-4">{userError?.message || "Bạn cần đăng nhập."}</p>
                </div>
            </div>
        )
    }

    // --- PHẦN 2: Lấy Role ---
    const { data: userRole, error: roleError } = await supabase
        .from('user_profiles')
        .select('type_id')
        .eq('id', user.id)
        .maybeSingle();

    if (roleError) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Không lấy được vai trò người dùng</h1>
                    <p className="text-muted-foreground mb-4">{roleError.message}</p>
                </div>
            </div>
        );
    }

    // --- PHẦN 3: Fetch dữ liệu (Chỉ 1 lần gọi RPC duy nhất) ---
    const { data: dashboardData, error: rpcError } = await supabase
        .rpc('get_dashboard_data_by_role', {
            p_user_id: user.id,
            p_user_role: userRole?.type_id ?? 'default' // 'default' là vai trò dự phòng
        });

    if (rpcError) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Lỗi lấy dữ liệu dashboard (RPC)</h1>
                    <p className="text-muted-foreground mb-4">{rpcError.message}</p>
                </div>
            </div>
        );
    }

    // --- PHẦN 4: Truyền dữ liệu xuống Client Component ---
    return (
        <Dashboard
            // Dữ liệu đã được RPC trả về đúng cấu trúc JSON
            overviewStats={dashboardData.overviewStats}
            designConsulting={dashboardData.designConsulting}
            constructionSupervision={dashboardData.constructionSupervision}
            civilProjects={dashboardData.civilProjects}
            industrialProjects={dashboardData.industrialProjects}
            warrantyTasks={dashboardData.warrantyTasks}
            customerManagement={dashboardData.customerManagement}
            inventoryLevels={dashboardData.inventoryLevels}
            user={user}
            userRole={userRole?.type_id}
        />
    )
}