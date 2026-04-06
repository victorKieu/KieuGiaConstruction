"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
    Warehouse,
    ArrowRight,
    Building2,
    Package,
    Plus,
    Lock,
    Unlock,
    Search,
    Filter
} from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";

// Import Server Actions
import { getMyAuthorizedWarehouses } from "@/lib/action/inventory";
import { createWarehouseAction, updateWarehouseStatusAction } from "@/lib/action/catalog";

export default function InventoryPage() {
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [search, setSearch] = useState("");

    // ✅ 1. Thêm State Filter (Mặc định là 'active')
    const [statusFilter, setStatusFilter] = useState<string>("active");

    const [openCreate, setOpenCreate] = useState(false);
    const [loading, setLoading] = useState(false);

    // Load dữ liệu khi vào trang
    useEffect(() => {
        loadWarehouses();
    }, []);

    const loadWarehouses = async () => {
        const data = await getMyAuthorizedWarehouses();
        setWarehouses(data);
    };

    const handleCreateWarehouse = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        const form = new FormData(e.currentTarget);

        const res = await createWarehouseAction({
            name: form.get("name") as string,
            address: form.get("address") as string,
            description: form.get("description") as string
        });

        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            setOpenCreate(false);
            loadWarehouses();
        } else {
            toast.error(res.error);
        }
    };

    const toggleStatus = async (id: string, currentStatus: string, name: string) => {
        const newStatus = currentStatus === 'active' ? 'closed' : 'active';
        const actionName = newStatus === 'closed' ? 'Đóng' : 'Mở lại';

        if (!confirm(`Bạn có chắc muốn ${actionName} kho "${name}" không?`)) return;

        const res = await updateWarehouseStatusAction(id, newStatus);
        if (res.success) {
            toast.success(res.message);
            loadWarehouses();
        } else {
            toast.error(res.error);
        }
    };

    // ✅ 2. Cập nhật logic Filter (Kết hợp Search + Status)
    const filtered = warehouses.filter(w => {
        // Lọc theo từ khóa
        const matchSearch =
            w.name.toLowerCase().includes(search.toLowerCase()) ||
            w.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
            w.project?.code?.toLowerCase().includes(search.toLowerCase());

        // Lọc theo trạng thái
        let matchStatus = true;
        if (statusFilter !== 'all') {
            matchStatus = w.status === statusFilter;
        }

        return matchSearch && matchStatus;
    });

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors duration-500">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">Quản lý Kho bãi</h2>
                    <p className="text-sm md:text-base text-muted-foreground dark:text-slate-400 mt-1 transition-colors">Theo dõi tồn kho, nhập xuất vật tư tại các dự án được phân công.</p>
                </div>

                <div className="flex gap-2">
                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                                <Plus className="mr-2 h-4 w-4" /> Tạo Kho Mới
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800 transition-colors">
                            <DialogHeader>
                                <DialogTitle className="dark:text-slate-100">Tạo Kho Thủ Công (Kho Tổng)</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateWarehouse} className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label className="dark:text-slate-300">Tên kho <span className="text-red-500">*</span></Label>
                                    <Input name="name" required placeholder="VD: Kho Tổng - KCN Tân Bình" className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="dark:text-slate-300">Địa chỉ <span className="text-red-500">*</span></Label>
                                    <Input name="address" required placeholder="Địa chỉ thực tế..." className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="dark:text-slate-300">Mô tả / Ghi chú</Label>
                                    <Textarea name="description" placeholder="Kho chứa giàn giáo, máy móc lớn..." className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors" />
                                </div>
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors" disabled={loading}>
                                    {loading ? "Đang xử lý..." : "Lưu & Tạo kho"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* ✅ 3. THANH CÔNG CỤ (SEARCH + FILTER) */}
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                {/* Search Bar */}
                <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-2 rounded-md border border-slate-200 dark:border-slate-800 w-full sm:w-fit shadow-sm transition-colors">
                    <Search className="h-4 w-4 text-slate-400 dark:text-slate-500 ml-2" />
                    <Input
                        placeholder="Tìm theo tên kho, dự án..."
                        className="border-none shadow-none focus-visible:ring-0 w-full sm:w-[300px] bg-transparent dark:text-slate-100 dark:placeholder:text-slate-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                    <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="h-10 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 py-2 text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer shadow-sm transition-colors"
                    >
                        <option value="active">🟢 Đang hoạt động</option>
                        <option value="closed">🔴 Đã đóng / Ngừng</option>
                        <option value="all">📂 Tất cả trạng thái</option>
                    </select>
                </div>
            </div>

            {/* LIST WAREHOUSES */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl transition-colors">
                        <Warehouse className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-3 transition-colors" />
                        <h3 className="text-lg font-medium text-slate-900 dark:text-slate-200 transition-colors">Không tìm thấy kho nào</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1 transition-colors">
                            {statusFilter === 'active'
                                ? "Không có kho nào đang hoạt động khớp với tìm kiếm."
                                : "Danh sách trống hoặc không khớp bộ lọc."}
                        </p>
                    </div>
                ) : (
                    filtered.map((w) => {
                        const isClosed = w.status === 'closed';
                        return (
                            <Card
                                key={w.id}
                                className={`hover:shadow-md transition-all duration-200 group relative overflow-hidden flex flex-col border border-slate-200 dark:border-slate-800 ${isClosed
                                        ? 'opacity-70 bg-gray-50 dark:bg-slate-900/40'
                                        : 'bg-white dark:bg-slate-900'
                                    }`}
                            >
                                {/* Thanh màu trạng thái bên trái */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isClosed ? 'bg-slate-400 dark:bg-slate-600' : (w.project_id ? 'bg-blue-600 dark:bg-blue-500' : 'bg-purple-600 dark:bg-purple-500')}`} />

                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6 transition-colors">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2 transition-colors">
                                        {w.project_id ? "KHO DỰ ÁN" : "KHO TỔNG / CÔNG TY"}
                                        {isClosed && <Badge variant="destructive" className="h-5 px-1.5 text-[10px] dark:bg-red-900/50 dark:text-red-300 dark:border-red-800">ĐÃ ĐÓNG</Badge>}
                                    </CardTitle>

                                    {/* Nút Đóng/Mở kho */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity dark:hover:bg-slate-800"
                                        onClick={() => toggleStatus(w.id, w.status, w.name)}
                                        title={isClosed ? "Mở lại kho" : "Đóng kho này"}
                                    >
                                        {isClosed ? (
                                            <Lock className="h-3.5 w-3.5 text-slate-400 dark:text-slate-500 group-hover:text-green-600 dark:group-hover:text-green-400" />
                                        ) : (
                                            <Unlock className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 group-hover:text-red-500 dark:group-hover:text-red-400" />
                                        )}
                                    </Button>
                                </CardHeader>

                                <CardContent className="pl-6 flex-1 flex flex-col transition-colors">
                                    <div className="text-lg font-bold mb-1 text-slate-800 dark:text-slate-100 group-hover:text-blue-700 dark:group-hover:text-blue-400 transition-colors break-words leading-tight">
                                        {w.name}
                                    </div>

                                    {w.project ? (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-1.5 mb-4 transition-colors">
                                            <Building2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                            <span className="font-medium break-words">{w.project.code} - {w.project.name}</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-4 transition-colors">
                                            <Warehouse className="h-3.5 w-3.5" /> Kho trung tâm
                                        </div>
                                    )}

                                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-dashed border-slate-100 dark:border-slate-800 transition-colors">
                                        <Badge variant="secondary" className="font-normal bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                                            <Package className="h-3 w-3 mr-1.5" /> {w.items_count || 0} loại vật tư
                                        </Badge>

                                        <Button
                                            size="sm"
                                            variant={isClosed ? "outline" : "default"}
                                            asChild
                                            className={isClosed ? "dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors" : "bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 dark:hover:bg-blue-700 text-white shadow-sm transition-colors"}
                                        >
                                            <Link href={`/inventory/${w.id}`}>
                                                Truy cập <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                                            </Link>
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })
                )}
            </div>
        </div>
    );
}