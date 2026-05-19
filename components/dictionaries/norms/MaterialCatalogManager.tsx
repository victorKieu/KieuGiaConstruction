"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Database, Plus, Search, Trash2, Edit2, Loader2, Save, X, Badge } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency } from "@/lib/utils/utils";

export function MaterialCatalogManager() {
    const supabase = createClient();
    const [open, setOpen] = useState(false);
    const [addOpen, setAddOpen] = useState(false);
    const [materials, setMaterials] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editData, setEditData] = useState<any>({});
    const [newMat, setNewMat] = useState({ code: "", name: "", unit: "kg", group_code: "VL", unit_price: 0 });

    const fetchData = async () => {
        setLoading(true);
        let query = supabase.from('resources').select('*').order('code');
        if (search) query = query.or(`name.ilike.%${search}%,code.ilike.%${search}%`);
        const { data } = await query;
        setMaterials(data || []);
        setLoading(false);
    };

    useEffect(() => { if (open) fetchData(); }, [open, search]);

    const handleSave = async (id: string) => {
        const payload = {
            code: editData.code,
            name: editData.name,
            unit: editData.unit,
            group_code: editData.group_code,
            unit_price: Number(editData.unit_price) || 0
        };
        const { error } = await supabase.from('resources').update(payload).eq('id', id);
        if (error) toast.error("Lỗi: " + error.message);
        else { toast.success("Đã lưu!"); setEditingId(null); fetchData(); }
    };

    const handleAdd = async () => {
        if (!newMat.code || !newMat.name) return toast.error("Nhập Mã và Tên!");
        const { error } = await supabase.from('resources').insert(newMat);
        if (error) toast.error("Lỗi: " + error.message);
        else { toast.success("Thêm thành công!"); setAddOpen(false); setNewMat({ code: "", name: "", unit: "kg", group_code: "VL", unit_price: 0 }); fetchData(); }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="h-9 border-slate-300 font-bold"><Database className="w-4 h-4 mr-2" /> Danh mục vật tư lõi</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl h-[80vh] flex flex-col dark:bg-slate-900">
                <DialogHeader><DialogTitle>Quản lý Danh mục Vật tư, Nhân công, Máy</DialogTitle></DialogHeader>

                <div className="flex gap-2 mb-4">
                    <Input placeholder="Tìm kiếm..." className="h-9" value={search} onChange={e => setSearch(e.target.value)} />
                    <Button onClick={() => setAddOpen(true)} className="bg-blue-600 text-white"><Plus className="w-4 h-4 mr-1" /> Thêm mới</Button>
                </div>

                <div className="flex-1 overflow-auto custom-scrollbar">
                    <Table>
                        <TableHeader className="sticky top-0 bg-white dark:bg-slate-900 shadow-sm z-10">
                            <TableRow>
                                <TableHead className="w-24">Mã</TableHead>
                                <TableHead>Tên</TableHead>
                                <TableHead className="w-20">ĐVT</TableHead>
                                <TableHead className="w-28">Nhóm</TableHead>
                                <TableHead className="w-32 text-right">Đơn giá</TableHead>
                                <TableHead className="w-20 text-center">Thao tác</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {materials.map(m => (
                                <TableRow key={m.id}>
                                    <TableCell>{editingId === m.id ? <Input defaultValue={m.code} onChange={e => setEditData({ ...editData, code: e.target.value })} /> : m.code}</TableCell>
                                    <TableCell>{editingId === m.id ? <Input defaultValue={m.name} onChange={e => setEditData({ ...editData, name: e.target.value })} /> : m.name}</TableCell>
                                    <TableCell>{editingId === m.id ? <Input defaultValue={m.unit} onChange={e => setEditData({ ...editData, unit: e.target.value })} /> : m.unit}</TableCell>
                                    <TableCell>
                                        {editingId === m.id ? (
                                            <Select defaultValue={m.group_code} onValueChange={v => setEditData({ ...editData, group_code: v })}>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="VL">Vật liệu</SelectItem>
                                                    <SelectItem value="NC">Nhân công</SelectItem>
                                                    <SelectItem value="M">Máy</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        ) : (
                                            <Badge variant="outline">{m.group_code === 'VL' ? 'Vật liệu' : m.group_code === 'NC' ? 'Nhân công' : 'Máy'}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">{editingId === m.id ? <Input type="number" defaultValue={m.unit_price} onChange={e => setEditData({ ...editData, unit_price: e.target.value })} /> : formatCurrency(m.unit_price)}</TableCell>
                                    <TableCell className="flex justify-center gap-1">
                                        {editingId === m.id ? (
                                            <Button size="sm" variant="ghost" onClick={() => handleSave(m.id)}><Save className="w-4 h-4 text-green-600" /></Button>
                                        ) : (
                                            <Button size="sm" variant="ghost" onClick={() => { setEditingId(m.id); setEditData(m); }}><Edit2 className="w-4 h-4" /></Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                <Dialog open={addOpen} onOpenChange={setAddOpen}>
                    <DialogContent className="dark:bg-slate-900">
                        <DialogHeader><DialogTitle>Thêm mới vật tư/nhân công/máy</DialogTitle></DialogHeader>
                        <div className="space-y-3">
                            <Input placeholder="Mã" onChange={e => setNewMat({ ...newMat, code: e.target.value })} />
                            <Input placeholder="Tên" onChange={e => setNewMat({ ...newMat, name: e.target.value })} />
                            <Input placeholder="Đơn vị" onChange={e => setNewMat({ ...newMat, unit: e.target.value })} />
                            <Select onValueChange={v => setNewMat({ ...newMat, group_code: v })}>
                                <SelectTrigger><SelectValue placeholder="Chọn nhóm..." /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="VL">Vật liệu</SelectItem>
                                    <SelectItem value="NC">Nhân công</SelectItem>
                                    <SelectItem value="M">Máy</SelectItem>
                                </SelectContent>
                            </Select>
                            <Input type="number" placeholder="Đơn giá" onChange={e => setNewMat({ ...newMat, unit_price: parseFloat(e.target.value) })} />
                        </div>
                        <DialogFooter><Button onClick={handleAdd}>Lưu</Button></DialogFooter>
                    </DialogContent>
                </Dialog>
            </DialogContent>
        </Dialog>
    );
}