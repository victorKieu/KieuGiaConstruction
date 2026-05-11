"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Settings, Map, Building2, Plus, Edit, Trash2, Save, MapPin, Route, Loader2, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

export default function HRMSettingPage() {
    const supabase = createClient();
    const [loading, setLoading] = useState(true);

    // Data State
    const [projects, setProjects] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);
    const [companySetting, setCompanySetting] = useState({ id: "", attendance_radius: 50, geocode: "" });

    // UI State
    const [isSavingGeneral, setIsSavingGeneral] = useState(false);
    const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
    const [isSavingRoute, setIsSavingRoute] = useState(false);

    // Form State (Dùng "office" đại diện cho giá trị null trong DB)
    const [routeForm, setRouteForm] = useState({ id: "", fromId: "office", toId: "", distance: "" });

    // Thêm State mới để lưu danh sách định mức
    const [quotas, setQuotas] = useState<any[]>([]);
    const [isSavingQuotas, setIsSavingQuotas] = useState(false);

    // Lấy dữ liệu khởi tạo
    const fetchData = async () => {
        setLoading(true);
        try {
            // 1. Lấy danh sách dự án
            const { data: projData } = await supabase.from('projects').select('id, name').order('name');
            if (projData) setProjects(projData);

            // 2. Lấy Cấu hình chung (Giả sử bảng company_settings chỉ có 1 dòng)
            const { data: compData } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
            if (compData) setCompanySetting({ id: compData.id, attendance_radius: compData.attendance_radius || 50, geocode: compData.geocode || "" });

            // 3. Lấy Danh sách Từ điển Tuyến đường
            const { data: routeData } = await supabase.from('route_distances').select(`
                *,
                from_project:projects!from_project_id(name),
                to_project:projects!to_project_id(name)
            `).order('created_at', { ascending: false });
            if (routeData) setRoutes(routeData);

            // Lấy Bảng Định mức
            const { data: quotaData } = await supabase.from('sys_quotas').select('*').order('code');
            if (quotaData) setQuotas(quotaData);

        } catch (error) {
            console.error(error);
            toast.error("Lỗi khi tải dữ liệu cài đặt.");
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    // --------------------------------------------------------
    // XỬ LÝ: Cấu hình chung
    // --------------------------------------------------------
    const handleSaveGeneralSettings = async () => {
        if (!companySetting.id) return toast.error("Chưa có cấu hình công ty cơ bản.");
        setIsSavingGeneral(true);
        const { error } = await supabase.from('company_settings').update({
            attendance_radius: companySetting.attendance_radius,
            geocode: companySetting.geocode
        }).eq('id', companySetting.id);

        setIsSavingGeneral(false);
        if (error) toast.error("Lỗi khi lưu cấu hình.");
        else toast.success("Đã cập nhật cấu hình chấm công chung.");
    };

    // --------------------------------------------------------
    // XỬ LÝ: Từ điển Tuyến đường
    // --------------------------------------------------------
    const getProjectName = (id: string | null) => {
        if (!id) return <span className="font-bold text-blue-600 dark:text-blue-400">Văn phòng</span>;
        const p = projects.find(p => p.id === id);
        return p ? p.name : "Không xác định";
    };

    const handleOpenAddRoute = () => {
        setRouteForm({ id: "", fromId: "office", toId: projects.length > 0 ? projects[0].id : "", distance: "" });
        setIsRouteModalOpen(true);
    };

    const handleSaveQuotas = async () => {
        setIsSavingQuotas(true);
        try {
            // Chạy cập nhật từng dòng thay đổi vào database
            for (const q of quotas) {
                await supabase.from('sys_quotas').update({ value: q.value }).eq('id', q.id);
            }
            toast.success("Đã cập nhật Bảng định mức chung.");
        } catch (error) {
            toast.error("Có lỗi khi lưu định mức.");
        }
        setIsSavingQuotas(false);
    };

    const handleSaveRoute = async () => {
        if (routeForm.fromId === routeForm.toId) return toast.error("Điểm xuất phát và Điểm đến không được trùng nhau!");
        if (!routeForm.distance || parseFloat(routeForm.distance) <= 0) return toast.error("Vui lòng nhập khoảng cách hợp lệ.");

        const from_project_id = routeForm.fromId === "office" ? null : routeForm.fromId;
        const to_project_id = routeForm.toId === "office" ? null : routeForm.toId;
        const distance_km = parseFloat(routeForm.distance);

        setIsSavingRoute(true);
        try {
            if (routeForm.id) {
                // Cập nhật
                const { error } = await supabase.from('route_distances').update({ from_project_id, to_project_id, distance_km }).eq('id', routeForm.id);
                if (error) throw error;
                toast.success("Đã cập nhật tuyến đường.");
            } else {
                // Thêm mới (Cần bọc Try-Catch vì có UNIQUE constraint trong DB)
                const { error } = await supabase.from('route_distances').insert({ from_project_id, to_project_id, distance_km });
                if (error) {
                    if (error.code === '23505') throw new Error("Tuyến đường này đã tồn tại trong hệ thống!");
                    throw error;
                }
                toast.success("Đã thêm tuyến đường mới.");
            }
            setIsRouteModalOpen(false);
            fetchData(); // Tải lại danh sách
        } catch (error: any) {
            toast.error(error.message || "Lỗi khi lưu tuyến đường.");
        }
        setIsSavingRoute(false);
    };

    const handleDeleteRoute = async (id: string) => {
        if (!window.confirm("Bạn có chắc chắn muốn xóa tuyến đường này?")) return;
        const { error } = await supabase.from('route_distances').delete().eq('id', id);
        if (error) toast.error("Lỗi khi xóa.");
        else {
            toast.success("Đã xóa tuyến đường.");
            setRoutes(routes.filter(r => r.id !== id));
        }
    };

    if (loading) return <div className="flex h-[50vh] items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="space-y-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div>
                <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center">
                    <Settings className="w-6 h-6 mr-2 text-slate-500" /> Cài đặt Nhân sự (HRM)
                </h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Cấu hình các tham số lõi cho phân hệ Chấm công, Tiền lương và Vận hành.
                </p>
            </div>

            <Tabs defaultValue="routes" className="w-full">
                <TabsList className="grid w-full grid-cols-3 md:w-[600px]">
                    <TabsTrigger value="routes"><Route className="w-4 h-4 mr-2" /> Tuyến đường</TabsTrigger>
                    <TabsTrigger value="quotas"><DollarSign className="w-4 h-4 mr-2" /> Bảng Định Mức</TabsTrigger>
                    <TabsTrigger value="general"><Map className="w-4 h-4 mr-2" /> Cấu hình Chấm công</TabsTrigger>
                </TabsList>

                {/* TAB 1: TỪ ĐIỂN TUYẾN ĐƯỜNG (DI CHUYỂN) */}
                <TabsContent value="routes" className="mt-4">
                    <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                        <CardHeader className="flex flex-row items-center justify-between bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                            <div>
                                <CardTitle className="text-lg font-bold text-slate-700 dark:text-slate-200">Định mức Khoảng cách</CardTitle>
                                <CardDescription>Hệ thống sẽ dùng dữ liệu này để tính tự động Số Km công tác phí cho kỹ sư.</CardDescription>
                            </div>
                            <Button onClick={handleOpenAddRoute} className="bg-blue-600 hover:bg-blue-700 text-white">
                                <Plus className="w-4 h-4 mr-2" /> Thêm Tuyến
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {routes.length === 0 ? (
                                <div className="p-12 text-center text-slate-500 flex flex-col items-center">
                                    <Route className="w-12 h-12 mb-3 text-slate-300" />
                                    <p>Chưa có tuyến đường nào được thiết lập.</p>
                                </div>
                            ) : (
                                <Table>
                                    <TableHeader className="bg-slate-100 dark:bg-slate-800/50">
                                        <TableRow>
                                            <TableHead className="font-bold w-[35%]">Điểm xuất phát</TableHead>
                                            <TableHead className="font-bold w-[35%]">Điểm đến</TableHead>
                                            <TableHead className="font-bold text-center">Khoảng cách (Km)</TableHead>
                                            <TableHead className="font-bold text-right">Thao tác</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {routes.map(r => (
                                            <TableRow key={r.id}>
                                                <TableCell className="font-medium">{getProjectName(r.from_project_id)}</TableCell>
                                                <TableCell className="font-medium">{getProjectName(r.to_project_id)}</TableCell>
                                                <TableCell className="text-center font-bold text-emerald-600">{r.distance_km} km</TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" onClick={() => handleDeleteRoute(r.id)}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: CẤU HÌNH CHẤM CÔNG CHUNG */}
                <TabsContent value="general" className="mt-4">
                    <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm max-w-2xl">
                        <CardHeader className="bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                            <CardTitle className="text-lg font-bold text-slate-700 dark:text-slate-200">Thông số Hệ thống</CardTitle>
                            <CardDescription>Cài đặt bán kính và tọa độ gốc của công ty.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700 dark:text-slate-300 flex items-center">
                                    <MapPin className="w-4 h-4 mr-2 text-red-500" /> Tọa độ Văn phòng chính (Vĩ độ, Kinh độ)
                                </Label>
                                <Input
                                    placeholder="Ví dụ: 10.762622, 106.660172"
                                    value={companySetting.geocode}
                                    onChange={e => setCompanySetting({ ...companySetting, geocode: e.target.value })}
                                    className="font-mono bg-slate-50 dark:bg-slate-950"
                                />
                                <p className="text-xs text-slate-500">Đây là mốc GPS dùng để chấm công cho nhân sự khối văn phòng.</p>
                            </div>

                            <div className="space-y-2">
                                <Label className="font-bold text-slate-700 dark:text-slate-300 flex items-center">
                                    <Building2 className="w-4 h-4 mr-2 text-blue-500" /> Bán kính chấm công hợp lệ (Mét)
                                </Label>
                                <Input
                                    type="number"
                                    value={companySetting.attendance_radius}
                                    onChange={e => setCompanySetting({ ...companySetting, attendance_radius: Number(e.target.value) })}
                                    className="font-mono bg-slate-50 dark:bg-slate-950 w-48"
                                />
                                <p className="text-xs text-slate-500">Khoảng cách tối đa (mét) cho phép nhân viên đứng cách tâm dự án/VP để quét mặt.</p>
                            </div>

                            <Button onClick={handleSaveGeneralSettings} disabled={isSavingGeneral} className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto">
                                {isSavingGeneral ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu Cấu hình
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>
                {/* TAB: BẢNG ĐỊNH MỨC CHUNG */}
                <TabsContent value="quotas" className="mt-4">
                    <Card className="border-slate-200 dark:border-slate-800 dark:bg-slate-900 shadow-sm max-w-4xl">
                        <CardHeader className="bg-amber-50/50 dark:bg-amber-900/10 border-b dark:border-slate-800">
                            <CardTitle className="text-lg font-bold text-amber-700 dark:text-amber-500">Hệ số & Định mức Công ty</CardTitle>
                            <CardDescription>Các thông số tài chính được áp dụng chung cho toàn hệ thống khi tính lương và phụ cấp.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6 pt-6">
                            {quotas.length === 0 ? (
                                <div className="text-center text-slate-500 py-10">Chưa có dữ liệu định mức.</div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {quotas.map((q, index) => (
                                        <div key={q.id} className="space-y-2 bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-800 relative">
                                            <span className="absolute top-4 right-4 text-[10px] font-mono font-bold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                                                {q.code}
                                            </span>
                                            <Label className="font-bold text-slate-700 dark:text-slate-300">{q.name}</Label>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    type="number"
                                                    value={q.value}
                                                    onChange={(e) => {
                                                        const newQuotas = [...quotas];
                                                        newQuotas[index].value = Number(e.target.value);
                                                        setQuotas(newQuotas);
                                                    }}
                                                    className="font-mono font-bold text-lg text-emerald-600 bg-white dark:bg-slate-900"
                                                />
                                                <span className="text-sm font-medium text-slate-500 whitespace-nowrap min-w-[80px]">{q.unit}</span>
                                            </div>
                                            <p className="text-xs text-slate-500 leading-relaxed">{q.description}</p>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
                                <Button onClick={handleSaveQuotas} disabled={isSavingQuotas} className="bg-amber-600 hover:bg-amber-700 text-white w-full sm:w-auto">
                                    {isSavingQuotas ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu Bảng Định Mức
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* MODAL THÊM TUYẾN ĐƯỜNG MỚI */}
            <Dialog open={isRouteModalOpen} onOpenChange={setIsRouteModalOpen}>
                <DialogContent className="sm:max-w-[450px] dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                    <DialogHeader>
                        <DialogTitle className="flex items-center text-blue-600 dark:text-blue-400">
                            <Route className="w-5 h-5 mr-2" /> Thêm định mức Tuyến đường
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Từ Điểm (Xuất phát)</Label>
                            <Select value={routeForm.fromId} onValueChange={v => setRouteForm({ ...routeForm, fromId: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="office" className="font-bold text-blue-600">🏢 Văn phòng Công ty</SelectItem>
                                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Đến Điểm (Đích)</Label>
                            <Select value={routeForm.toId} onValueChange={v => setRouteForm({ ...routeForm, toId: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="office" className="font-bold text-blue-600">🏢 Văn phòng Công ty</SelectItem>
                                    {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>Khoảng cách (Km)</Label>
                            <Input
                                type="number"
                                step="0.1"
                                placeholder="VD: 15.5"
                                value={routeForm.distance}
                                onChange={e => setRouteForm({ ...routeForm, distance: e.target.value })}
                                className="font-mono font-bold text-emerald-600"
                            />
                            <p className="text-xs text-slate-500">Tra cứu Google Maps và nhập số Km vào đây.</p>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsRouteModalOpen(false)}>Hủy</Button>
                        <Button onClick={handleSaveRoute} disabled={isSavingRoute} className="bg-blue-600 hover:bg-blue-700">
                            {isSavingRoute ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu Tuyến
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}