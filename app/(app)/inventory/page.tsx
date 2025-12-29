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
    Search,
    Archive
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
import { getAllWarehouses } from "@/lib/action/inventory";
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
        const data = await getAllWarehouses();
        setWarehouses(data);
    };

    // Hàm tạo kho mới (Kho thủ công/Kho tổng)
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

    // Hàm Đóng/Mở kho
    const toggleStatus = async (id: string, currentStatus: string, name: string) => {
        const newStatus = currentStatus === 'active' ? 'closed' : 'active';
        const actionName = newStatus === 'closed' ? 'Đóng' : 'Mở lại';

        // Xác nhận đơn giản
        if (!confirm(`Bạn có chắc muốn ${actionName} kho "${name}" không?`)) return;

        const res = await updateWarehouseStatusAction(id, newStatus);
        if (res.success) {
            toast.success(res.message);
            loadWarehouses();
        } else {
            toast.error(res.error);
        }
    };

    // Filter tìm kiếm
    const filtered = warehouses.filter(w =>
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.project?.name.toLowerCase().includes(search.toLowerCase()) ||
        w.project?.code?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">

            {/* HEADER */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Quản lý Kho bãi</h2>
                    <p className="text-muted-foreground">Theo dõi tồn kho, điều chuyển vật tư giữa các công trình.</p>
                </div>

                <div className="flex gap-2">
                    {/* Nút sang trang Danh mục (Catalog) */}
                    <Button variant="outline" asChild>
                        <Link href="/inventory/catalog">
                            <Archive className="mr-2 h-4 w-4 text-orange-600" /> Danh mục Vật tư
                        </Link>
                    </Button>

                    {/* Nút Tạo Kho Mới */}
                    <Dialog open={openCreate} onOpenChange={setOpenCreate}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700">
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
            <div className="flex items-center gap-2 bg-white p-2 rounded-md border w-fit">
                <Search className="h-4 w-4 text-muted-foreground ml-2" />
                <Input
                    placeholder="Tìm theo tên kho, tên dự án..."
                    className="border-none shadow-none focus-visible:ring-0 w-[300px]"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {/* LIST WAREHOUSES */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filtered.length === 0 ? (
                    <div className="col-span-full text-center py-10 text-muted-foreground">
                        Không tìm thấy kho nào.
                    </div>
                ) : (
                    filtered.map((w) => {
                        const isClosed = w.status === 'closed';
                        return (
                            <Card
                                key={w.id}
                                className={`hover:shadow-md transition-all duration-200 group relative overflow-hidden ${isClosed ? 'opacity-70 bg-gray-50' : 'bg-white'}`}
                            >
                                {/* Thanh màu trạng thái bên trái */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${isClosed ? 'bg-gray-400' : (w.project_id ? 'bg-blue-600' : 'bg-purple-600')}`} />

                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 pl-6">
                                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                                        {w.project_id ? "KHO DỰ ÁN" : "KHO TỔNG / CÔNG TY"}
                                        {isClosed && <Badge variant="destructive" className="h-5 px-1.5 text-[10px]">ĐÃ ĐÓNG</Badge>}
                                    </CardTitle>

                                    {/* Nút Đóng/Mở kho - Đã sửa lỗi TypeScript tại đây */}
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => toggleStatus(w.id, w.status, w.name)}
                                        title={isClosed ? "Mở lại kho" : "Đóng kho này"} // Chuyển title ra đây
                                    >
                                        {isClosed ? (
                                            <Lock className="h-3.5 w-3.5 text-gray-400 group-hover:text-green-600" />
                                        ) : (
                                            <Unlock className="h-3.5 w-3.5 text-gray-300 group-hover:text-red-500" />
                                        )}
                                    </Button>
                                </CardHeader>

                                <CardContent className="pl-6">
                                    <div className="text-lg font-bold mb-1 truncate text-slate-800 group-hover:text-blue-700 transition-colors" title={w.name}>
                                        {w.name}
                                    </div>

                                    {w.project ? (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mb-4 h-5">
                                            <Building2 className="h-3 w-3" />
                                            <span className="truncate">{w.project.code} - {w.project.name}</span>
                                        </div>
                                    ) : (
                                        <div className="text-xs text-muted-foreground flex items-center gap-1 mb-4 h-5">
                                            <Warehouse className="h-3 w-3" /> Kho trung tâm
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-dashed">
                                        <Badge variant="secondary" className="font-normal">
                                            <Package className="h-3 w-3 mr-1" /> {w.items_count || 0} loại vật tư
                                        </Badge>

                                        <Button size="sm" variant={isClosed ? "outline" : "default"} asChild className={isClosed ? "" : "bg-slate-900 hover:bg-blue-700"}>
                                            <Link href={`/inventory/${w.id}`}>
                                                Chi tiết <ArrowRight className="ml-1 h-3 w-3" />
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