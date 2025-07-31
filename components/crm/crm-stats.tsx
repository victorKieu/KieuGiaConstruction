"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import supabase from '@/lib/supabase/client';
import { Users, Briefcase, FileText, Calendar } from "lucide-react";

export function CrmStats() {
    const [stats, setStats] = useState({
        totalCustomers: 0,
        activeOpportunities: 0,
        totalContracts: 0,
        upcomingActivities: 0,
    });
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); // Thêm state để lưu lỗi

    useEffect(() => {
        async function fetchStats() {
            setIsLoading(true); // Đặt loading là true khi bắt đầu fetch

            try {
                // Fetch total customers
                const { count: customersCount, error: customersError } = await supabase
                    .from("customers")
                    .select("*", { count: "exact", head: true });

                if (customersError) {
                    const errorMessage = customersError.message || "Không thể lấy thông tin tổng số hợp đồng";
                    console.error("Lỗi khi lấy tổng số hợp đồng:", customersError.message);
                    throw new Error(errorMessage);
                }

                // Fetch active opportunities
                const { count: opportunitiesCount, error: opportunitiesError } = await supabase
                    .from("opportunities")
                    .select("*", { count: "exact", head: true })
                    .not("status", "eq", "closed");

                if (opportunitiesError) {
                    const errorMessage = opportunitiesError.message || "Không thể lấy thông tin cơ hội đang mở";
                    console.error("Lỗi khi lấy cơ hội đang mở:", opportunitiesError.message);
                    throw new Error(errorMessage);
                }
                
                // Fetch total contracts
                const { count: contractsCount, error: contractsError } = await supabase
                    .from("contracts")
                    .select("*", { count: "exact", head: true });

                if (contractsError) {
                    const errorMessage = contractsError.message || "Không thể lấy thông tin tổng số hợp đồng";
                    console.error("Lỗi khi lấy tổng số hợp đồng:", contractsError.message);
                    throw new Error(errorMessage);
                }

                // Fetch upcoming activities (next 7 days)
                const nextWeek = new Date();
                nextWeek.setDate(nextWeek.getDate() + 7);

                const { count: activitiesCount, error: activitiesError } = await supabase
                    .from("customer_activities")
                    .select(
                        "id,activity_type,title,description,scheduled_at,customer_id,customers(name)", // <-- REMOVED 'status', changed 'type' to 'activity_type'
                        { count: "exact", head: true }
                    )
                    .gte("scheduled_at", new Date().toISOString())
                    .lte("scheduled_at", nextWeek.toISOString())
                    .order("scheduled_at", { ascending: true })
                    .limit(5);

                if (activitiesError) {
                    const errorMessage = activitiesError.message || "Không thể lấy thông tin hoạt động sắp tới";
                    console.error("Lỗi khi lấy hoạt động sắp tới:", errorMessage);
                    throw new Error(errorMessage);
                }

                setStats({
                    totalCustomers: customersCount || 0,
                    activeOpportunities: opportunitiesCount || 0,
                    totalContracts: contractsCount || 0,
                    upcomingActivities: activitiesCount || 0,
                });
            } catch (error) {
                console.error("Error fetching CRM stats:", error);
                setError("Có lỗi xảy ra khi lấy thống kê. Vui lòng thử lại."); // Cập nhật thông báo lỗi
            } finally {
                setIsLoading(false); // Đặt loading là false khi hoàn thành
            }
        }

        fetchStats();
    }, []);

    if (isLoading) {
        return <div>Đang tải thống kê...</div>; // Cải thiện thông báo tải
    }

    if (error) {
        return <div className="text-red-500">{error}</div>; // Hiển thị thông báo lỗi cho người dùng
    }

    return (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng số khách hàng</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                    <p className="text-xs text-muted-foreground">Khách hàng đã đăng ký trong hệ thống</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Cơ hội đang mở</CardTitle>
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.activeOpportunities}</div>
                    <p className="text-xs text-muted-foreground">Cơ hội bán hàng đang được xử lý</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Tổng số hợp đồng</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.totalContracts}</div>
                    <p className="text-xs text-muted-foreground">Hợp đồng đã ký kết với khách hàng</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Hoạt động sắp tới</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold">{stats.upcomingActivities}</div>
                    <p className="text-xs text-muted-foreground">Hoạt động lên lịch trong 7 ngày tới</p>
                </CardContent>
            </Card>
        </div>
    );
}