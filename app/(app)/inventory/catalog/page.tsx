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

    // State mới: Edit Group
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

    const inputClass = "dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors";

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 transition-colors duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100 transition-colors">Danh mục Vật tư & Thiết bị</h2>
                    <p className="text-muted-foreground dark:text-slate-400 mt-1 transition-colors">Quản lý mã hàng chuẩn (Master Data) cho toàn hệ thống.</p>
                </div>

                <div className="flex gap-2">
                    {/* Nút tạo Nhóm */}
                    <Dialog open={openGroupDialog} onOpenChange={setOpenGroupDialog}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                                <Folder className="mr-2 h-4 w-4" /> Thêm Nhóm
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                            <DialogHeader><DialogTitle className="dark:text-slate-100">Tạo Nhóm Vật Tư Mới</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreateGroup} className="space-y-4">
                                <div><Label className="dark:text-slate-300">Mã nhóm</Label><Input name="code" placeholder="VD: G01" required className={inputClass} /></div>
                                <div><Label className="dark:text-slate-300">Tên nhóm</Label><Input name="name" placeholder="VD: Xi măng" required className={inputClass} /></div>
                                <div><Label className="dark:text-slate-300">Mô tả</Label><Textarea name="description" className={inputClass} /></div>
                                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors">Lưu</Button>
                            </form>
                        </DialogContent>
                    </Dialog>

                    {/* Nút tạo Vật tư */}
                    <Dialog open={openMatDialog} onOpenChange={setOpenMatDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-colors">
                                <Plus className="mr-2 h-4 w-4" /> Thêm Vật Tư Mới
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800 transition-colors">
                            <DialogHeader><DialogTitle className="dark:text-slate-100">Tạo Mã Vật Tư Mới</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreateMaterial} className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label className="dark:text-slate-300">Thuộc nhóm <span className="text-red-500">*</span></Label>
                                    <Select name="group_id" required defaultValue={selectedGroup !== 'all' ? selectedGroup : undefined}>
                                        <SelectTrigger className={inputClass}><SelectValue placeholder="Chọn nhóm..." /></SelectTrigger>
                                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                            {groups.map(g => <SelectItem key={g.id} value={g.id} className="dark:text-slate-200">{g.code} - {g.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label className="dark:text-slate-300">Mã hàng <span className="text-red-500">*</span></Label><Input name="code" placeholder="VD: XM-HT-40" required className={inputClass} /></div>

                                <div>
                                    <Label className="dark:text-slate-300">Đơn vị tính <span className="text-red-500">*</span></Label>
                                    <Select name="unit" required>
                                        <SelectTrigger className={inputClass}><SelectValue placeholder="Chọn ĐVT" /></SelectTrigger>
                                        <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                            {units.length > 0 ? (
                                                units.map(u => <SelectItem key={u.id} value={u.name} className="dark:text-slate-200">{u.name}</SelectItem>)
                                            ) : (
                                                <SelectItem value="cai" className="dark:text-slate-200">Cái (Mặc định)</SelectItem>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="col-span-2"><Label className="dark:text-slate-300">Tên hàng hóa <span className="text-red-500">*</span></Label><Input name="name" placeholder="VD: Xi măng Hà Tiên PCB40" required className={inputClass} /></div>
                                <div className="col-span-2"><Label className="dark:text-slate-300">Thông số / Quy cách</Label><Textarea name="specs" placeholder="VD: PCB40, TCVN..." className={inputClass} /></div>
                                <div><Label className="dark:text-slate-300">NCC ưu tiên (Ref)</Label><Input name="supplier_ref" className={inputClass} /></div>
                                <div><Label className="dark:text-slate-300">Giá tham khảo</Label><Input name="ref_price" type="number" className={inputClass} /></div>
                                <div className="col-span-2 pt-2"><Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white transition-colors">Lưu Vật Tư</Button></div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4 items-start">
                {/* Cột Trái: Danh sách Nhóm */}
                <Card className="w-full md:w-64 shrink-0 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 md:sticky md:top-4 transition-colors shadow-sm">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm uppercase text-slate-500 dark:text-slate-400 transition-colors">Nhóm hàng</CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1 max-h-[250px] md:max-h-none overflow-y-auto">
                        <Button
                            variant={selectedGroup === 'all' ? "secondary" : "ghost"}
                            className={`w-full justify-start font-normal transition-colors ${selectedGroup === 'all' ? 'dark:bg-slate-800 dark:text-slate-100' : 'dark:text-slate-300 dark:hover:bg-slate-800/50'}`}
                            onClick={() => setSelectedGroup('all')}
                        >
                            <Filter className="mr-2 h-4 w-4" /> Tất cả
                        </Button>

                        {groups.map(g => (
                            <div key={g.id} className={`group flex items-center justify-between w-full rounded-md transition-colors ${selectedGroup === g.id ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-100 dark:hover:bg-slate-800/50"}`}>
                                <Button
                                    variant="ghost"
                                    className={`flex-1 justify-start font-normal hover:bg-transparent ${selectedGroup === g.id ? "bg-transparent text-blue-600 dark:text-blue-400" : "text-slate-600 dark:text-slate-300"}`}
                                    onClick={() => setSelectedGroup(g.id)}
                                >
                                    <Folder className={`mr-2 h-4 w-4 ${selectedGroup === g.id ? "text-blue-600 dark:text-blue-400" : "text-slate-400 dark:text-slate-500"}`} />
                                    <span className="truncate">{g.name}</span>
                                </Button>
                                {/* Nút Sửa Nhóm (Hiện khi hover) */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 mr-1 opacity-0 group-hover:opacity-100 transition-opacity dark:hover:bg-slate-700"
                                    onClick={(e) => {
                                        e.stopPropagation(); // Chặn click vào nút cha
                                        setEditingGroup(g);
                                        setOpenEditGroupDialog(true);
                                    }}
                                >
                                    <Settings className="h-3.5 w-3.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400" />
                                </Button>
                            </div>
                        ))}
                    </CardContent>
                </Card>

                {/* Cột Phải: Danh sách Vật tư */}
                <div className="flex-1 space-y-4 w-full">
                    <div className="relative shadow-sm rounded-md">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground dark:text-slate-400" />
                        <Input
                            placeholder="Tìm mã, tên vật tư..."
                            className="pl-9 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 dark:text-slate-100 transition-colors"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>

                    <Card className="border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors">
                        <div className="overflow-x-auto">
                            <Table className="bg-white dark:bg-slate-950 transition-colors w-full min-w-[700px]">
                                <TableHeader>
                                    <TableRow className="bg-slate-50 dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                                        <TableHead className="w-[120px] font-bold text-slate-700 dark:text-slate-300">Mã hàng</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Tên hàng hóa</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">Thông số</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">ĐVT</TableHead>
                                        <TableHead className="font-bold text-slate-700 dark:text-slate-300">NCC (Ref)</TableHead>
                                        <TableHead className="text-right font-bold text-slate-700 dark:text-slate-300">Giá tham khảo</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                    {filteredMaterials.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-10 text-muted-foreground dark:text-slate-400 italic transition-colors">
                                                Chưa có dữ liệu vật tư nào.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredMaterials.map(m => (
                                            <TableRow key={m.id} className="group hover:bg-slate-50 dark:hover:bg-slate-800/50 border-none transition-colors">
                                                <TableCell className="font-mono font-bold text-slate-700 dark:text-slate-300 transition-colors">{m.code}</TableCell>
                                                <TableCell>
                                                    <div className="font-semibold text-blue-700 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 cursor-pointer transition-colors" onClick={() => openEdit(m)}>{m.name}</div>
                                                    <div className="text-xs text-muted-foreground dark:text-slate-500 mt-0.5 transition-colors">{m.group?.name}</div>
                                                </TableCell>
                                                <TableCell className="text-sm text-muted-foreground dark:text-slate-400 max-w-[200px] truncate transition-colors" title={m.specs}>{m.specs || "-"}</TableCell>
                                                <TableCell className="text-slate-700 dark:text-slate-300">{m.unit}</TableCell>
                                                <TableCell className="text-slate-700 dark:text-slate-300">{m.supplier_ref || "-"}</TableCell>
                                                <TableCell className="text-right font-medium text-slate-800 dark:text-slate-200 transition-colors">{new Intl.NumberFormat("vi-VN").format(m.ref_price)} đ</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity dark:text-slate-400 dark:hover:bg-slate-800">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                                                            <DropdownMenuLabel className="dark:text-slate-400">Thao tác</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => openEdit(m)} className="cursor-pointer dark:focus:bg-slate-800 dark:text-slate-200">
                                                                <Pencil className="mr-2 h-4 w-4" /> Sửa thông tin
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="dark:bg-slate-800" />
                                                            <DropdownMenuItem onClick={() => confirmDelete(m)} className="text-red-600 dark:text-red-400 cursor-pointer dark:focus:bg-slate-800">
                                                                <Trash2 className="mr-2 h-4 w-4" /> Xóa
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            </div>

            {/* --- DIALOG SỬA VẬT TƯ --- */}
            <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
                <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800 transition-colors">
                    <DialogHeader><DialogTitle className="dark:text-slate-100">Cập nhật Vật tư: <span className="font-mono text-blue-600 dark:text-blue-400">{selectedItem?.code}</span></DialogTitle></DialogHeader>
                    {selectedItem && (
                        <form onSubmit={handleUpdateMaterial} className="grid grid-cols-2 gap-4">
                            <div className="col-span-2">
                                <Label className="dark:text-slate-300">Thuộc nhóm</Label>
                                <Select name="group_id" defaultValue={selectedItem.group_id}>
                                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                                        {groups.map(g => <SelectItem key={g.id} value={g.id} className="dark:text-slate-200">{g.code} - {g.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div><Label className="dark:text-slate-300">Mã hàng</Label><Input name="code" defaultValue={selectedItem.code} required className={inputClass} /></div>

                            <div>
                                <Label className="dark:text-slate-300">Đơn vị tính</Label>
                                <Select name="unit" defaultValue={selectedItem.unit}>
                                    <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                                        {units.length > 0 ? (
                                            units.map(u => <SelectItem key={u.id} value={u.name} className="dark:text-slate-200">{u.name}</SelectItem>)
                                        ) : (
                                            <SelectItem value={selectedItem.unit} className="dark:text-slate-200">{selectedItem.unit}</SelectItem>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="col-span-2"><Label className="dark:text-slate-300">Tên hàng hóa</Label><Input name="name" defaultValue={selectedItem.name} required className={inputClass} /></div>
                            <div className="col-span-2"><Label className="dark:text-slate-300">Thông số / Quy cách</Label><Textarea name="specs" defaultValue={selectedItem.specs} className={inputClass} /></div>
                            <div><Label className="dark:text-slate-300">NCC ưu tiên (Ref)</Label><Input name="supplier_ref" defaultValue={selectedItem.supplier_ref} className={inputClass} /></div>
                            <div><Label className="dark:text-slate-300">Giá tham khảo</Label><Input name="ref_price" type="number" defaultValue={selectedItem.ref_price} className={inputClass} /></div>

                            <div className="col-span-2 flex justify-end gap-2 pt-4 border-t dark:border-slate-800 mt-2">
                                <Button type="button" variant="outline" onClick={() => setOpenEditDialog(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>{loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Lưu thay đổi"}</Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* --- DIALOG SỬA NHÓM VẬT TƯ --- */}
            <Dialog open={openEditGroupDialog} onOpenChange={setOpenEditGroupDialog}>
                <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800 transition-colors">
                    <DialogHeader><DialogTitle className="dark:text-slate-100">Chỉnh sửa Nhóm Vật tư</DialogTitle></DialogHeader>
                    {editingGroup && (
                        <form onSubmit={handleUpdateGroup} className="space-y-4">
                            <div>
                                <Label className="dark:text-slate-300">Mã nhóm</Label>
                                <Input name="code" defaultValue={editingGroup.code} required className={inputClass} />
                            </div>
                            <div>
                                <Label className="dark:text-slate-300">Tên nhóm</Label>
                                <Input name="name" defaultValue={editingGroup.name} required className={inputClass} />
                            </div>
                            <div>
                                <Label className="dark:text-slate-300">Mô tả</Label>
                                <Textarea name="description" defaultValue={editingGroup.description || ""} className={inputClass} />
                            </div>
                            <div className="flex justify-end gap-2 pt-4 border-t dark:border-slate-800 mt-2">
                                <Button type="button" variant="outline" onClick={() => setOpenEditGroupDialog(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy</Button>
                                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white" disabled={loading}>
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Lưu thay đổi"}
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* --- ALERT XÓA VẬT TƯ --- */}
            <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
                <AlertDialogContent className="dark:bg-slate-900 dark:border-slate-800 transition-colors">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="dark:text-slate-100">Xác nhận xóa vật tư?</AlertDialogTitle>
                        <AlertDialogDescription className="dark:text-slate-400">
                            Bạn đang xóa <span className="font-bold text-red-600 dark:text-red-400">{selectedItem?.name}</span> ({selectedItem?.code}).<br />
                            Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="border-t dark:border-slate-800 pt-4 mt-2">
                        <AlertDialogCancel className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">Hủy bỏ</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteMaterial} className="bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
                            {loading ? "Đang xử lý..." : "Xóa vĩnh viễn"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}