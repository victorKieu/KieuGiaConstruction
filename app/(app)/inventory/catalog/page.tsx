"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Folder, Filter, MoreHorizontal, Pencil, Trash2, Loader2, Settings } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Import Actions
import {
    getMaterialGroups,
    getMaterials,
    createMaterialGroupAction,
    createMaterialAction,
    updateMaterialAction,
    deleteMaterialAction,
    // ✅ Import thêm hàm update group
    updateMaterialGroupAction
} from "@/lib/action/catalog";
import { getDictionaryItems } from "@/lib/action/dictionaryActions";

export default function CatalogPage() {
    const [groups, setGroups] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [units, setUnits] = useState<any[]>([]);

    const [selectedGroup, setSelectedGroup] = useState("all");
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(false);

    // Form states
    const [openGroupDialog, setOpenGroupDialog] = useState(false);
    const [openMatDialog, setOpenMatDialog] = useState(false);

    // Edit/Delete states Material
    const [openEditDialog, setOpenEditDialog] = useState(false);
    const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
    const [selectedItem, setSelectedItem] = useState<any>(null);

    // ✅ State mới: Edit Group
    const [editingGroup, setEditingGroup] = useState<any>(null);
    const [openEditGroupDialog, setOpenEditGroupDialog] = useState(false);

    // Data load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [g, m, u] = await Promise.all([
            getMaterialGroups(),
            getMaterials(),
            getDictionaryItems("UNIT")
        ]);
        setGroups(g);
        setMaterials(m);
        setUnits(u);
    };

    // Filter logic
    const filteredMaterials = materials.filter(m => {
        const matchGroup = selectedGroup === "all" || m.group_id === selectedGroup;
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase());
        return matchGroup && matchSearch;
    });

    // --- HANDLERS GROUP ---
    const handleCreateGroup = async (e: any) => {
        e.preventDefault();
        const form = new FormData(e.target);
        const res = await createMaterialGroupAction({
            code: form.get("code") as string,
            name: form.get("name") as string,
            description: form.get("description") as string
        });
        if (res.success) { toast.success(res.message); setOpenGroupDialog(false); loadData(); }
        else toast.error(res.error);
    };

    // ✅ Hàm xử lý cập nhật nhóm
    const handleUpdateGroup = async (e: any) => {
        e.preventDefault();
        if (!editingGroup) return;
        setLoading(true);

        const form = new FormData(e.target);
        const res = await updateMaterialGroupAction(editingGroup.id, {
            code: form.get("code") as string,
            name: form.get("name") as string,
            description: form.get("description") as string
        });

        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            setOpenEditGroupDialog(false);
            setEditingGroup(null);
            loadData();
        }
        else {
            toast.error(res.error);
        }
    };

    // --- HANDLERS MATERIAL ---
    const handleCreateMaterial = async (e: any) => {
        e.preventDefault();
        const form = new FormData(e.target);

        const res = await createMaterialAction({
            group_id: form.get("group_id"),
            code: form.get("code"),
            name: form.get("name"),
            unit: form.get("unit"),
            specs: form.get("specs"),
            supplier_ref: form.get("supplier_ref"),
            ref_price: form.get("ref_price")
        });
        if (res.success) { toast.success(res.message); setOpenMatDialog(false); loadData(); }
        else toast.error(res.error);
    };

    const openEdit = (item: any) => {
        setSelectedItem(item);
        setOpenEditDialog(true);
    };

    const handleUpdateMaterial = async (e: any) => {
        e.preventDefault();
        if (!selectedItem) return;
        setLoading(true);
        const form = new FormData(e.target);
        const res = await updateMaterialAction(selectedItem.id, {
            group_id: form.get("group_id"),
            code: form.get("code"),
            name: form.get("name"),
            unit: form.get("unit"),
            specs: form.get("specs"),
            supplier_ref: form.get("supplier_ref"),
            ref_price: form.get("ref_price")
        });
        setLoading(false);
        if (res.success) { toast.success(res.message); setOpenEditDialog(false); loadData(); }
        else toast.error(res.error);
    };

    const confirmDelete = (item: any) => {
        setSelectedItem(item);
        setOpenDeleteAlert(true);
    };

    const handleDeleteMaterial = async () => {
        if (!selectedItem) return;
        setLoading(true);
        const res = await deleteMaterialAction(selectedItem.id);
        setLoading(false);
        if (res.success) { toast.success(res.message); setOpenDeleteAlert(false); loadData(); }
        else toast.error(res.error);
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-800">Danh mục Vật tư & Thiết bị</h2>
                    <p className="text-muted-foreground">Quản lý mã hàng chuẩn (Master Data) cho toàn hệ thống.</p>
                </div>

                <div className="flex gap-2">
                    {/* Nút tạo Nhóm */}
                    <Dialog open={openGroupDialog} onOpenChange={setOpenGroupDialog}>
                        <DialogTrigger asChild><Button variant="outline"><Folder className="mr-2 h-4 w-4" /> Thêm Nhóm</Button></DialogTrigger>
                        <DialogContent>
                            <DialogHeader><DialogTitle>Tạo Nhóm Vật Tư Mới</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreateGroup} className="space-y-4">
                                <div><Label>Mã nhóm</Label><Input name="code" placeholder="VD: G01" required /></div>
                                <div><Label>Tên nhóm</Label><Input name="name" placeholder="VD: Xi măng" required /></div>
                                <div><Label>Mô tả</Label><Textarea name="description" /></div>
                                <Button type="submit" className="w-full">Lưu</Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Nút tạo Vật tư */}
                    <Dialog open={openMatDialog} onOpenChange={setOpenMatDialog}>
                        <DialogTrigger asChild><Button className="bg-blue-600 hover:bg-blue-700"><Plus className="mr-2 h-4 w-4" /> Thêm Vật Tư Mới</Button></DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader><DialogTitle>Tạo Mã Vật Tư Mới</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreateMaterial} className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Thuộc nhóm <span className="text-red-500">*</span></Label>
                                    <Select name="group_id" required defaultValue={selectedGroup !== 'all' ? selectedGroup : undefined}>
                                        <SelectTrigger><SelectValue placeholder="Chọn nhóm..." /></SelectTrigger>
                                        <SelectContent>
                                            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.code} - {g.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Mã hàng <span className="text-red-500">*</span></Label><Input name="code" placeholder="VD: XM-HT-40" required /></div>

                                <div>
                                    <Label>Đơn vị tính <span className="text-red-500">*</span></Label>
                                    <Select name="unit" required>
                                        <SelectTrigger><SelectValue placeholder="Chọn ĐVT" /></SelectTrigger>
                                        <SelectContent>
                                            {units.length > 0 ? (
                                                units.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)
                                            ) : (
                                                <SelectItem value="cai">Cái (Mặc định)</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="col-span-2"><Label>Tên hàng hóa <span className="text-red-500">*</span></Label><Input name="name" placeholder="VD: Xi măng Hà Tiên PCB40" required /></div>
                                <div className="col-span-2"><Label>Thông số / Quy cách</Label><Textarea name="specs" placeholder="VD: PCB40, TCVN..." /></div>
                                <div><Label>NCC ưu tiên (Ref)</Label><Input name="supplier_ref" /></div>
                                <div><Label>Giá tham khảo</Label><Input name="ref_price" type="number" /></div>
                                <div className="col-span-2 pt-2"><Button type="submit" className="w-full bg-blue-600">Lưu Vật Tư</Button></div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex gap-4 items-start">
                {/* Cột Trái: Danh sách Nhóm */}
                <Card className="w-64 shrink-0 bg-slate-50 border-slate-200 sticky top-4">
                    <CardHeader className="pb-2"><CardTitle className="text-sm uppercase text-slate-500">Nhóm hàng</CardTitle></CardHeader>
                    <CardContent className="p-2 space-y-1">
                        <Button variant={selectedGroup === 'all' ? "secondary" : "ghost"} className="w-full justify-start font-normal" onClick={() => setSelectedGroup('all')}>
                            <Filter className="mr-2 h-4 w-4" /> Tất cả
                        </Button>

                        {groups.map(g => (
                            <div key={g.id} className={`group flex items-center justify-between w-full rounded-md hover:bg-slate-100 ${selectedGroup === g.id ? "bg-slate-100" : ""}`}>
                                <Button
                                    variant="ghost"
                                    className={`flex-1 justify-start font-normal hover:bg-transparent ${selectedGroup === g.id ? "bg-transparent text-blue-600" : "text-slate-600"}`}
                                    onClick={() => setSelectedGroup(g.id)}
                                >
                                    <Folder className={`mr-2 h-4 w-4 ${selectedGroup === g.id ? "text-blue-600" : "text-slate-400"}`} />
                                    <span className="truncate">{g.name}</span>
                                </Button>
                                {/* ✅ Nút Sửa Nhóm (Hiện khi hover) */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 mr-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Chặn click vào nút cha
                                        setEditingGroup(g);
                                        setOpenEditGroupDialog(true);
                                    }}
                                >
                                    <Settings className="h-3.5 w-3.5 text-slate-400 hover:text-blue-600" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Cột Phải: Danh sách Vật tư */}
                <div className="flex-1 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Tìm mã, tên vật tư..." className="pl-8 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
                    </div>

                    <Card className="border-slate-200">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-slate-50">
                                    <TableHead className="w-[120px]">Mã hàng</TableHead>
                                    <TableHead>Tên hàng hóa</TableHead>
                                    <TableHead>Thông số</TableHead>
                                    <TableHead>ĐVT</TableHead>
                                    <TableHead>NCC (Ref)</TableHead>
                                    <TableHead className="text-right">Giá tham khảo</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="text-center h-24 text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>
                                ) : (
                                    filteredMaterials.map(m => (
                                        <TableRow key={m.id} className="group">
                                            <TableCell className="font-mono font-bold text-slate-700">{m.code}</TableCell>
                                            <TableCell>
                                                <div className="font-medium text-blue-700 group-hover:text-blue-800 cursor-pointer" onClick={() => openEdit(m)}>{m.name}</div>
                                                <div className="text-xs text-muted-foreground">{m.group?.name}</div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={m.specs}>{m.specs}</TableCell>
                                            <TableCell>{m.unit}</TableCell>
                                            <TableCell>{m.supplier_ref || "-"}</TableCell>
                                            <TableCell className="text-right">{new Intl.NumberFormat("vi-VN").format(m.ref_price)} đ</TableCell>
                                            <TableCell>
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"><MoreHorizontal className="h-4 w-4" /></Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Thao tác</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => openEdit(m)}><Pencil className="mr-2 h-4 w-4" /> Sửa thông tin</DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => confirmDelete(m)} className="text-red-600"><Trash2 className="mr-2 h-4 w-4" /> Xóa</DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </div>

            {/* --- DIALOG SỬA VẬT TƯ --- */}
            <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader><DialogTitle>Cập nhật Vật tư: {selectedItem?.code}</DialogTitle></DialogHeader>
                    {selectedItem && (
                        <form onSubmit={handleUpdateMaterial} className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label>Thuộc nhóm</Label>
                                <Select name="group_id" defaultValue={selectedItem.group_id}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>{groups.map(g => <SelectItem key={g.id} value={g.id}>{g.code} - {g.name}</SelectItem>)}</SelectContent>
                                </Select>
                            </div>
                            <div><Label>Mã hàng</Label><Input name="code" defaultValue={selectedItem.code} required /></div>

                            <div>
                                <Label>Đơn vị tính</Label>
                                <Select name="unit" defaultValue={selectedItem.unit}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        {units.length > 0 ? (
                                            units.map(u => <SelectItem key={u.id} value={u.name}>{u.name}</SelectItem>)
                                        ) : (
                                            <SelectItem value={selectedItem.unit}>{selectedItem.unit}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2"><Label>Tên hàng hóa</Label><Input name="name" defaultValue={selectedItem.name} required /></div>
                            <div className="col-span-2"><Label>Thông số / Quy cách</Label><Textarea name="specs" defaultValue={selectedItem.specs} /></div>
                            <div><Label>NCC ưu tiên (Ref)</Label><Input name="supplier_ref" defaultValue={selectedItem.supplier_ref} /></div>
                            <div><Label>Giá tham khảo</Label><Input name="ref_price" type="number" defaultValue={selectedItem.ref_price} /></div>

                            <div className="col-span-2 flex justify-end gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)}>Hủy</Button>
                                <Button type="submit" className="bg-blue-600" disabled={loading}>{loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Lưu thay đổi"}</Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* --- ✅ DIALOG SỬA NHÓM VẬT TƯ --- */}
            <Dialog open={openEditGroupDialog} onOpenChange={setOpenEditGroupDialog}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Chỉnh sửa Nhóm Vật tư</DialogTitle></DialogHeader>
                    {editingGroup && (
                        <form onSubmit={handleUpdateGroup} className="space-y-4">
                            <div>
                                <Label>Mã nhóm</Label>
                                <Input name="code" defaultValue={editingGroup.code} required />
                            </div>
                            <div>
                                <Label>Tên nhóm</Label>
                                <Input name="name" defaultValue={editingGroup.name} required />
                            </div>
                            <div>
                                <Label>Mô tả</Label>
                                <Textarea name="description" defaultValue={editingGroup.description || ""} />
                            </div>
                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => setOpenEditGroupDialog(false)}>Hủy</Button>
                                <Button type="submit" className="bg-blue-600" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu thay đổi"}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* --- ALERT XÓA VẬT TƯ --- */}
            <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận xóa vật tư?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn đang xóa <span className="font-bold text-red-600">{selectedItem?.name}</span> ({selectedItem?.code}).<br />
                            Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMaterial} className="bg-red-600 hover:bg-red-700" disabled={loading}>
                            {loading ? "Đang xử lý..." : "Xóa vĩnh viễn"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}