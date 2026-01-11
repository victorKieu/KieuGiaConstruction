"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
    Warehouse,
    ArrowRight,
    Building2,
    Package,
    Plus,
    Lock,
    Unlock,
    Search
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

    const filtered = warehouses.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.project?.name?.toLowerCase().includes(search.toLowerCase()) ||
        w.project?.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800">Quản lý Kho bãi</h2>
                    <p className="text-muted-foreground">Theo dõi tồn kho, nhập xuất vật tư tại các dự án được phân công.</p>
                </div>

                <div className="flex gap-2">
                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                                <Plus className="mr-2 h-4 w-4" /> Tạo Kho Mới
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Tạo Kho Thủ Công (Kho Tổng)</DialogTitle>
                            </DialogHeader>
                            <form onSubmit={handleCreateWarehouse} className="space-y-4 py-2">
                                <div className="space-y-2">
                                    <Label>Tên kho <span className="text-red-500">*</span></Label>
                                    <Input name="name" required placeholder="VD: Kho Tổng - KCN Tân Bình" />
                                </div>
                                <div className="space-y-2">
                                    <Label>Địa chỉ <span className="text-red-500">*</span></Label>
                                    <Input name="address" required placeholder="Địa chỉ thực tế..." />
                                </div>
                                <div className="space-y-2">
                                    <Label>Mô tả / Ghi chú</Label>
                                    <Textarea name="description" placeholder="Kho chứa giàn giáo, máy móc lớn..." />
                                </div>
                                <Button type="submit" className="w-full bg-blue-600" disabled={loading}>
                                    {loading ? "Đang xử lý..." : "Lưu & Tạo kho"}
                                </Button>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            {/* SEARCH BAR */}
            <div className="flex items-center gap-2 bg-white p-2 rounded-md border w-fit shadow-sm">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                    placeholder="Tìm kho của bạn..."
                    className="border-none shadow-none focus-visible:ring-0 w-[300px]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* LIST WAREHOUSES */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filtered.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-16 bg-slate-50 border border-dashed rounded-xl">
                        <Warehouse className="w-12 h-12 text-slate-300 mb-3" />
                        <h3 className="text-lg font-medium text-slate-900">Không tìm thấy kho nào</h3>
                        <p className="text-slate-500 text-sm mt-1">Bạn chưa được gán vào dự án nào hoặc chưa có kho được tạo.</p>
                    </div>
                ) : (
                    filtered.map((w) => {
                        const isClosed = w.status === 'closed';
                        return (
                            <Card
                                key={w.id}
                                className={`hover:shadow-md transition-all duration-200 group relative overflow-hidden border-slate-200 flex flex-col ${isClosed ? 'opacity-70 bg-gray-50' : 'bg-white'}`}
                            >
                                {/* Thanh màu trạng thái bên trái */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isClosed ? 'bg-gray-400' : (w.project_id ? 'bg-blue-600' : 'bg-purple-600')}`} />

                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        {w.project_id ? "KHO DỰ ÁN" : "KHO TỔNG / CÔNG TY"}
                                        {isClosed && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">ĐÃ ĐÓNG</Badge>}
                                    </CardTitle>

                                    {/* Nút Đóng/Mở kho */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={() => toggleStatus(w.id, w.status, w.name)}
                                        title={isClosed ? "Mở lại kho" : "Đóng kho này"}
                                    >
                                        {isClosed ? (
                                            <Lock className="h-3.5 w-3.5 text-gray-400 group-hover:text-green-600" />
                                        ) : (
                                            <Unlock className="h-3.5 w-3.5 text-gray-300 group-hover:text-red-500" />
                                        )}
                                    </Button>
                                </CardHeader>

                                <CardContent className="pl-6 flex-1 flex flex-col">
                                    {/* ✅ SỬA Ở ĐÂY: Bỏ truncate, dùng break-words để hiện hết tên */}
                                    <div className="text-lg font-bold mb-1 text-slate-800 group-hover:text-blue-700 transition-colors break-words leading-tight">
                                        {w.name}
                                    </div>

                                    {w.project ? (
                                        <div className="text-xs text-muted-foreground flex items-start gap-1.5 mb-4">
                                            <Building2 className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                                            <span className="font-medium break-words">{w.project.code} - {w.project.name}</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-4">
                                            <Warehouse className="h-3.5 w-3.5" /> Kho trung tâm
                                        </div>
                                    )}

                                    <div className="mt-auto flex items-center justify-between pt-4 border-t border-dashed border-slate-100">
                                        <Badge variant="secondary" className="font-normal bg-slate-100 text-slate-600 hover:bg-slate-200">
                                            <Package className="h-3 w-3 mr-1.5" /> {w.items_count || 0} loại vật tư
                                        </Badge>

                                        <Button size="sm" variant={isClosed ? "outline" : "default"} asChild className={isClosed ? "" : "bg-slate-900 hover:bg-blue-700 shadow-sm"}>
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