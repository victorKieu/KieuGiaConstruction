import { createSupabaseServerClient } from "@/lib/supabase/server";
import Dashboard from '@/components/dashboard/Dashboard'
import { cookies } from "next/headers";

export default async function DashboardPage() {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    // 1. Lấy thông tin user đang đăng nhập
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Lỗi xác thực</h1>
                    <p className="text-muted-foreground mb-4">{userError.message}</p>
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Truy cập bị từ chối</h1>
                    <p className="text-muted-foreground mb-4">Bạn cần đăng nhập để xem trang dashboard.</p>
                </div>
            </div>
        )
    }

    // 2. Lấy role/phân quyền user (ví dụ từ bảng user_roles)
    const { data: userRole, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
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

    // 3. Fetch dữ liệu dashboard tuỳ theo quyền
    let overviewStats = null,
        designConsulting: unknown[] = [],
        constructionSupervision: unknown[] = [],
        civilProjects: unknown[] = [],
        industrialProjects: unknown[] = [],
        warrantyTasks: unknown[] = [],
        customerManagement = null,
        inventoryLevels: unknown[] = [];

    try {
        if (userRole?.role === 'admin') {
            overviewStats = (await supabase.from('overview_statistics').select('*').single()).data;
            designConsulting = (await supabase.from('design_consulting').select('task, status, deadline').order('deadline', { ascending: true }).limit(5)).data ?? [];
            constructionSupervision = (await supabase.from('construction_supervision_status').select('*')).data ?? [];
            civilProjects = (await supabase.from('civil_construction_projects').select('*')).data ?? [];
            industrialProjects = (await supabase.from('industrial_construction_projects').select('*')).data ?? [];
            warrantyTasks = (await supabase.from('warranty_tasks').select('*')).data ?? [];
            customerManagement = (await supabase
                .from('customers')
                .select(`
                    total_customers: count(*),
                    new_inquiries: count(id)
                `)
                .single()
            ).data;
            inventoryLevels = (await supabase.from('inventory').select('item_name, level')).data ?? [];
        } else {
            overviewStats = (await supabase.from('overview_statistics').select('*').eq('user_id', user.id).single()).data;
            designConsulting = (await supabase.from('design_consulting').select('task, status, deadline').eq('user_id', user.id).order('deadline', { ascending: true }).limit(5)).data ?? [];
            constructionSupervision = (await supabase.from('construction_supervision_status').select('*').eq('user_id', user.id)).data ?? [];
            civilProjects = (await supabase.from('civil_construction_projects').select('*').eq('owner_id', user.id)).data ?? [];
            industrialProjects = (await supabase.from('industrial_construction_projects').select('*').eq('owner_id', user.id)).data ?? [];
            warrantyTasks = (await supabase.from('warranty_tasks').select('*').eq('user_id', user.id)).data ?? [];
            customerManagement = (await supabase
                .from('customers')
                .select(`
                    total_customers: count(*),
                    new_inquiries: count(id)
                `)
                .eq('staff_id', user.id)
                .single()
            ).data;
            inventoryLevels = (await supabase.from('inventory').select('item_name, level').eq('manager_id', user.id)).data ?? [];
        }
    } catch (error: any) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Lỗi lấy dữ liệu dashboard</h1>
                    <p className="text-muted-foreground mb-4">{error?.message || "Không xác định được lỗi."}</p>
                </div>
            </div>
        );
    }

    // 4. Truyền dữ liệu đã được phân quyền xuống Dashboard client
    return (
        <Dashboard
            overviewStats={overviewStats}
            designConsulting={designConsulting}
            constructionSupervision={constructionSupervision}
            civilProjects={civilProjects}
            industrialProjects={industrialProjects}
            warrantyTasks={warrantyTasks}
            customerManagement={customerManagement}
            inventoryLevels={inventoryLevels}
            user={user}
            userRole={userRole?.role}
        />
    )
}