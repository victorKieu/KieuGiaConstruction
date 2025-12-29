"use client";

import { useState, useEffect } from "react";
import { Plus, Search, Folder, Package, Filter } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { getMaterialGroups, getMaterials, createMaterialGroupAction, createMaterialAction } from "@/lib/action/catalog";

export default function CatalogPage() {
    const [groups, setGroups] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);
    const [selectedGroup, setSelectedGroup] = useState("all");
    const [search, setSearch] = useState("");

    // Form states
    const [openGroupDialog, setOpenGroupDialog] = useState(false);
    const [openMatDialog, setOpenMatDialog] = useState(false);

    // Data load
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const [g, m] = await Promise.all([getMaterialGroups(), getMaterials()]);
        setGroups(g);
        setMaterials(m);
    };

    // Filter logic
    const filteredMaterials = materials.filter(m => {
        const matchGroup = selectedGroup === "all" || m.group_id === selectedGroup;
        const matchSearch = m.name.toLowerCase().includes(search.toLowerCase()) || m.code.toLowerCase().includes(search.toLowerCase());
        return matchGroup && matchSearch;
    });

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
            ref_price: Number(form.get("ref_price"))
        });
        if (res.success) { toast.success(res.message); setOpenMatDialog(false); loadData(); }
        else toast.error(res.error);
    };

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Danh mục Vật tư & Thiết bị</h2>
                <div className="flex gap-2">
                    {/* Nút tạo Nhóm */}
                    <Dialog open={openGroupDialog} onOpenChange={setOpenGroupDialog}>
                        <DialogTrigger asChild><Button variant="outline"><Folder className="mr-2 h-4 w-4" /> Thêm Nhóm (Cha)</Button></DialogTrigger>
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
                        <DialogTrigger asChild><Button className="bg-blue-600"><Plus className="mr-2 h-4 w-4" /> Thêm Vật Tư (Con)</Button></DialogTrigger>
                        <DialogContent className="max-w-2xl">
                            <DialogHeader><DialogTitle>Tạo Mã Vật Tư Mới</DialogTitle></DialogHeader>
                            <form onSubmit={handleCreateMaterial} className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label>Thuộc nhóm <span className="text-red-500">*</span></Label>
                                    <Select name="group_id" required>
                                        <SelectTrigger><SelectValue placeholder="Chọn nhóm..." /></SelectTrigger>
                                        <SelectContent>
                                            {groups.map(g => <SelectItem key={g.id} value={g.id}>{g.code} - {g.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div><Label>Mã hàng</Label><Input name="code" placeholder="VD: XM-HT-40" required /></div>
                                <div><Label>Đơn vị tính</Label><Input name="unit" placeholder="VD: Bao / Cái" required /></div>

                                <div className="col-span-2"><Label>Tên hàng hóa</Label><Input name="name" placeholder="VD: Xi măng Hà Tiên PCB40" required /></div>

                                <div className="col-span-2"><Label>Thông số / Quy cách</Label><Textarea name="specs" placeholder="VD: PCB40, TCVN..." /></div>

                                <div><Label>NCC ưu tiên (Tùy chọn)</Label><Input name="supplier_ref" /></div>
                                <div><Label>Giá tham khảo</Label><Input name="ref_price" type="number" /></div>

                                <div className="col-span-2 pt-2"><Button type="submit" className="w-full bg-blue-600">Lưu Vật Tư</Button></div>
                            </form>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="flex gap-4">
                {/* Cột Trái: Danh sách Nhóm */}
                <Card className="w-64 shrink-0 h-fit">
                    <CardHeader><CardTitle className="text-sm">Nhóm hàng</CardTitle></CardHeader>
                    <CardContent className="p-2 space-y-1">
                        <Button variant={selectedGroup === 'all' ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setSelectedGroup('all')}>
                            <Filter className="mr-2 h-4 w-4" /> Tất cả
                        </Button>
                        {groups.map(g => (
                            <Button key={g.id} variant={selectedGroup === g.id ? "secondary" : "ghost"} className="w-full justify-start" onClick={() => setSelectedGroup(g.id)}>
                                <Folder className="mr-2 h-4 w-4 text-yellow-500" /> {g.name}
                            </Button>
                        ))}
                    </CardContent>
                </Card>

                {/* Cột Phải: Danh sách Vật tư */}
                <div className="flex-1 space-y-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input placeholder="Tìm mã, tên vật tư..." className="pl-8" value={search} onChange={(e) => setSearch(e.target.value)} />
                        </div>
                    </div>

                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Mã hàng</TableHead>
                                    <TableHead>Tên hàng hóa</TableHead>
                                    <TableHead>Thông số</TableHead>
                                    <TableHead>ĐVT</TableHead>
                                    <TableHead>NCC (Ref)</TableHead>
                                    <TableHead className="text-right">Giá tham khảo</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMaterials.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="text-center h-24 text-muted-foreground">Chưa có dữ liệu</TableCell></TableRow>
                                ) : (
                                    filteredMaterials.map(m => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-mono font-bold">{m.code}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{m.name}</div>
                                                <div className="text-xs text-muted-foreground">{m.group?.name}</div>
                                            </TableCell>
                                            <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={m.specs}>{m.specs}</TableCell>
                                            <TableCell>{m.unit}</TableCell>
                                            <TableCell>{m.supplier_ref || "-"}</TableCell>
                                            <TableCell className="text-right">{new Intl.NumberFormat("vi-VN").format(m.ref_price)} đ</TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </div>
            </div>
        </div>
    );
}