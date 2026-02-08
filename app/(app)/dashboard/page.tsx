"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
    LayoutDashboard, Building2, TrendingUp, AlertTriangle,
    PackagePlus, PackageMinus, ArrowRight, Wallet,
    Briefcase, CheckCircle2, Clock, CalendarClock, PieChart,
    Users, UserPlus, Handshake, Percent
} from "lucide-react";
import { format } from "date-fns";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

// Import biểu đồ
import { SourcePieChart } from "@/components/crm/charts/SourcePieChart";

// ✅ 1. Import formatCurrency từ utils
import { formatCurrency } from "@/lib/utils/utils";

import {
    getDashboardSummary, getLowStockItems, getRecentWarehouseActivity,
    getProductionStats, getCRMStats, getRecentCustomers,
    getCustomerSourceStats
} from "@/lib/action/dashboard";

export default function DashboardPage() {
    const [summary, setSummary] = useState<any>(null);
    const [prodStats, setProdStats] = useState<any>(null);
    const [lowStock, setLowStock] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);

    const [crmStats, setCrmStats] = useState<any>(null);
    const [recentCustomers, setRecentCustomers] = useState<any[]>([]);
    const [sourceStats, setSourceStats] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            try {
                const [sum, prod, low, act, crm, cus, src] = await Promise.all([
                    getDashboardSummary(),
                    getProductionStats(),
                    getLowStockItems(),
                    getRecentWarehouseActivity(),
                    getCRMStats(),
                    getRecentCustomers(),
                    getCustomerSourceStats()
                ]);
                setSummary(sum);
                setProdStats(prod);
                setLowStock(low);
                setActivities(act);
                setCrmStats(crm);
                setRecentCustomers(cus);
                setSourceStats(src || []);
            } catch (error) {
                console.error("Lỗi tải Dashboard:", error);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, []);

    // ❌ Đã xóa hàm formatMoney cục bộ để dùng hàm chung

    // Tính toán tài chính
    const revenue = Number(prodStats?.total_revenue || 0);
    const cost = Number(prodStats?.total_cost || 0);
    const profit = revenue - cost;
    const costPercentage = revenue > 0 ? (cost / revenue) * 100 : 0;

    // Helper badge CRM
    const getCustomerStatusBadge = (status: string) => {
        const normalizedStatus = status ? status.toLowerCase() : "";

        switch (normalizedStatus) {
            case 'new':
                return <Badge variant="outline" className="border-blue-500 text-blue-500 dark:text-blue-400">Mới</Badge>;

            case 'negotiating':
                return <Badge className="bg-orange-500 hover:bg-orange-600 dark:bg-orange-600">Đàm phán</Badge>;

            case 'signed':
                return <Badge className="bg-green-600 hover:bg-green-700 dark:bg-green-600">Đã ký HĐ</Badge>;

            case 'lost':
                return <Badge variant="destructive">Đã hủy</Badge>;

            case 'active':
                return <Badge className="bg-emerald-500 hover:bg-emerald-600 dark:bg-emerald-600">Hoạt động</Badge>;

            default:
                return <Badge variant="secondary">{status}</Badge>;
        }
    };

    if (loading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-1/3" /><div className="grid grid-cols-4 gap-4"><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /><Skeleton className="h-32" /></div></div>;

    return (
        <div className="flex-1 space-y-6 p-8 pt-6 bg-background min-h-screen">

            {/* HEADER */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-foreground">Trung tâm Điều hành</h2>
                    <p className="text-muted-foreground">Tổng hợp tình hình Sản xuất, Tài chính & Kinh doanh.</p>
                </div>
                <div className="flex gap-2">
                    <Button asChild className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-700 text-white">
                        <Link href="/projects/new"><Building2 className="mr-2 h-4 w-4" /> Khởi tạo Dự án</Link>
                    </Button>
                </div>
            </div>

            {/* --- KHỐI 1: SẢN XUẤT (PROJECTS) --- */}
            <h3 className="text-lg font-semibold text-foreground mt-2">1. Tiến độ Sản xuất (Thi công)</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

                {/* CARD 1 */}
                {/* ✅ 2. Thêm class 'border' để hiển thị khung rõ ràng */}
                <Card className="border border-t-4 border-t-blue-600 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tổng dự án năm nay</CardTitle>
                        <Briefcase className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{prodStats?.total_projects || 0}</div>
                        <p className="text-xs text-muted-foreground">Công trình trong kế hoạch</p>
                    </CardContent>
                </Card>

                {/* CARD 2 */}
                <Card className="border border-t-4 border-t-green-600 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Đã hoàn thành</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-green-700 dark:text-green-500">{prodStats?.completed_projects || 0}</div>
                        <p className="text-xs text-muted-foreground">Dự án đã bàn giao</p>
                    </CardContent>
                </Card>

                {/* CARD 3 */}
                <Card className="border border-t-4 border-t-orange-500 shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Đang thi công</CardTitle>
                        <Clock className="h-4 w-4 text-orange-500 dark:text-orange-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">{prodStats?.active_projects || 0}</div>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">Sắp triển khai: <b>{prodStats?.planning_projects || 0}</b></span>
                        </div>
                    </CardContent>
                </Card>

                {/* CARD 4 */}
                <Card className={`border border-t-4 shadow-sm ${prodStats?.delayed_projects > 0 ? "border-t-red-600 bg-red-50 dark:bg-red-950/20" : "border-t-muted"}`}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className={`text-sm font-medium ${prodStats?.delayed_projects > 0 ? "text-red-700 dark:text-red-400" : ""}`}>Chậm tiến độ</CardTitle>
                        <CalendarClock className={`h-4 w-4 ${prodStats?.delayed_projects > 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${prodStats?.delayed_projects > 0 ? "text-red-700 dark:text-red-400" : ""}`}>{prodStats?.delayed_projects || 0}</div>
                        <p className={`text-xs ${prodStats?.delayed_projects > 0 ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground"}`}>
                            {prodStats?.delayed_projects > 0 ? "Cần xử lý gấp!" : "Tiến độ đảm bảo"}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* --- KHỐI 2: KINH DOANH & KHÁCH HÀNG (CRM) --- */}
            <h3 className="text-lg font-semibold text-foreground mt-4">2. Khách hàng & Kinh doanh (CRM)</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                {/* Cột trái: KPI + Biểu đồ tròn (Chiếm 4/7) */}
                <div className="col-span-4 space-y-4">
                    {/* Hàng KPI nhỏ */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* KPI 1 */}
                        {/* ✅ FIX: Thêm dark mode cho bg-indigo-50 */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex gap-2">
                                    <UserPlus className="h-4 w-4 text-blue-500 dark:text-blue-400" /> Tổng Khách hàng
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{crmStats?.total_customers || 0}</div>
                                <p className="text-xs text-muted-foreground">Data khách hàng tích lũy</p>
                            </CardContent>
                        </Card>

                        {/* KPI 2 */}
                        <Card>
                            <CardHeader className="pb-2">
                                <CardTitle className="text-sm font-medium flex gap-2">
                                    <UserPlus className="h-4 w-4 text-blue-500 dark:text-blue-400" /> Lead Mới (Tháng)
                                </CardTitle>
                            </CardHeader>
                            <CardContent><div className="text-2xl font-bold">{crmStats?.new_leads_month || 0}</div><p className="text-xs text-muted-foreground">Khách hàng mới tạo tháng này</p></CardContent>
                        </Card>

                        {/* KPI 3 */}
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><Handshake className="h-4 w-4 text-orange-500 dark:text-orange-400" /> Đang Đàm phán</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{crmStats?.negotiating_count || 0}</div><p className="text-xs text-muted-foreground">Cơ hội ký hợp đồng cao</p></CardContent>
                        </Card>

                        {/* KPI 4 */}
                        <Card>
                            <CardHeader className="pb-2"><CardTitle className="text-sm font-medium flex gap-2"><Percent className="h-4 w-4 text-green-500 dark:text-green-400" /> Tỷ lệ Chốt đơn</CardTitle></CardHeader>
                            <CardContent><div className="text-2xl font-bold text-green-700 dark:text-green-500">{Number(crmStats?.conversion_rate || 0).toFixed(1)}%</div><p className="text-xs text-muted-foreground">Hiệu quả kinh doanh</p></CardContent>
                        </Card>
                    </div>

                    {/* Biểu đồ tròn */}
                    <div className="h-[300px]">
                        <SourcePieChart data={sourceStats} />
                    </div>
                </div>

                {/* Cột phải: Danh sách Khách mới (Chiếm 3/7) */}
                <Card className="col-span-3 h-full">
                    <CardHeader className="pb-3"><CardTitle className="text-base">Liên hệ mới nhất</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b dark:border-slate-800">
                                    <TableHead className="text-muted-foreground">Khách hàng</TableHead>
                                    <TableHead className="text-right text-muted-foreground">Trạng thái</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {recentCustomers.length === 0 ? <TableRow><TableCell colSpan={2} className="text-center h-20 text-muted-foreground">Chưa có khách hàng.</TableCell></TableRow> :
                                    recentCustomers.map(cus => (
                                        <TableRow key={cus.id} className="border-b dark:border-slate-800">
                                            <TableCell>
                                                <div className="font-medium truncate max-w-[150px]">{cus.name}</div>
                                                <div className="text-[10px] text-muted-foreground">{cus.phone || "Chưa có SĐT"}</div>
                                            </TableCell>
                                            <TableCell className="text-right">{getCustomerStatusBadge(cus.status)}</TableCell>
                                        </TableRow>
                                    ))
                                }
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>

            {/* --- KHỐI 3: TÀI CHÍNH (FINANCE) --- */}
            <h3 className="text-lg font-semibold text-foreground mt-4">3. Hiệu quả Tài chính</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="col-span-2">
                    <CardHeader>
                        <CardTitle>Tổng Doanh thu vs Chi phí Vật tư</CardTitle>
                        <CardDescription>So sánh giá trị hợp đồng và chi phí mua sắm vật tư (PO) năm nay.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">Chi phí Vật tư ({costPercentage.toFixed(1)}%)</span>
                                {/* ✅ 3. Sử dụng formatCurrency thay vì formatMoney */}
                                <span className="font-bold text-foreground">{formatCurrency(cost)}</span>
                            </div>
                            <Progress value={costPercentage} className="h-4 bg-secondary" indicatorClassName="bg-blue-600 dark:bg-blue-500" />
                        </div>

                        <div className="flex items-center justify-between pt-4 border-t dark:border-slate-800">
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng Doanh thu (Hợp đồng)</p>
                                {/* ✅ Sử dụng formatCurrency */}
                                <p className="text-2xl font-bold text-blue-700 dark:text-blue-400">{formatCurrency(revenue)}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-sm text-muted-foreground">Lợi nhuận gộp (Tạm tính)</p>
                                <p className={`text-2xl font-bold ${profit >= 0 ? "text-green-600 dark:text-green-500" : "text-red-600 dark:text-red-500"}`}>
                                    {/* ✅ Sử dụng formatCurrency */}
                                    {profit > 0 ? "+" : ""}{formatCurrency(profit)}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Card Gradient */}
                <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white dark:from-slate-950 dark:to-slate-900">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-slate-100">
                            <PieChart className="h-5 w-5" /> Tỷ suất Lợi nhuận
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-4xl font-bold mt-2">
                            {revenue > 0 ? ((profit / revenue) * 100).toFixed(1) : 0}%
                        </div>
                        <p className="text-slate-400 text-sm mt-2">Lợi nhuận gộp trên doanh thu.<br />(Chưa trừ nhân công & chi phí khác).</p>
                    </CardContent>
                </Card>
            </div>

            {/* --- KHỐI 4: VẬN HÀNH KHO --- */}
            <h3 className="text-lg font-semibold text-foreground mt-4">4. Kho bãi & Vật tư</h3>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4 shadow-sm">
                    <CardHeader>
                        <CardTitle>Biến động Kho bãi gần đây</CardTitle>
                        <CardDescription>Lịch sử nhập xuất 10 giao dịch mới nhất.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {activities.length === 0 ? <p className="text-sm text-muted-foreground">Chưa có dữ liệu.</p> :
                                activities.map((act) => (
                                    <div className="flex items-center" key={act.id}>
                                        <Avatar className="h-9 w-9">
                                            <AvatarFallback className={act.type === 'IN'
                                                ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                                : "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400"}>
                                                {act.type === 'IN' ? <PackagePlus className="h-5 w-5" /> : <PackageMinus className="h-5 w-5" />}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="ml-4 space-y-1">
                                            <p className="text-sm font-medium leading-none">
                                                {act.type === 'IN' ? "Nhập kho" : "Xuất kho"} <span className="text-muted-foreground">({act.code})</span>
                                            </p>
                                            <p className="text-xs text-muted-foreground">{act.desc}</p>
                                        </div>
                                        <div className="ml-auto font-medium text-xs text-muted-foreground">
                                            {format(new Date(act.date), "dd/MM HH:mm")}
                                        </div>
                                    </div>
                                ))
                            }
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3 shadow-sm border-red-100 dark:border-red-900/50">
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2 text-red-700 dark:text-red-400">
                            <AlertTriangle className="h-4 w-4" /> Vật tư sắp hết (Top 5)
                        </CardTitle>
                        <CardDescription>Cần lên kế hoạch mua sắm ngay.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent border-b dark:border-slate-800">
                                    <TableHead>Vật tư</TableHead>
                                    <TableHead className="text-right">Tồn</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lowStock.length === 0 ? <TableRow><TableCell colSpan={2} className="text-center text-muted-foreground h-20">Kho ổn định.</TableCell></TableRow> :
                                    lowStock.map(item => (
                                        <TableRow key={item.id} className="border-b dark:border-slate-800">
                                            <TableCell>
                                                <div className="font-medium">{item.item_name}</div>
                                                <div className="text-[10px] text-muted-foreground">{item.warehouse?.name}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-bold text-red-600 dark:text-red-400">
                                                {item.quantity_on_hand} <span className="text-[10px] font-normal text-muted-foreground">{item.unit}</span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                }
                            </TableBody>
                        </Table>
                    </CardContent>
                    <div className="p-4 border-t bg-muted/50 dark:border-slate-800">
                        <Button variant="outline" size="sm" className="w-full bg-background" asChild>
                            <Link href="/procurement/orders/new">Tạo Đơn Mua Hàng Ngay</Link>
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    );
}