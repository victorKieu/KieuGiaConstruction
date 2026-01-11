"use client";

import { useState } from "react";
import { Plus, Search, Edit, Trash2, Box, Layers, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteNorm } from "@/lib/action/normActions";
import NormForm from "@/components/dictionaries/norms/NormForm"; // 👈 Đảm bảo đường dẫn này đúng với nơi bạn lưu NormForm
import { toast } from "sonner";
import { cn } from "@/lib/utils/utils";

// Định nghĩa Interface cho các props nhận vào
interface NormClientProps {
    norms: any[];
    groups: any[];
    materials: any[]; // ✅ Nhận danh sách vật tư từ Catalog
}

export default function NormClient({ norms, groups, materials }: NormClientProps) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
    const [isOpen, setIsOpen] = useState(false);
    const [editingNorm, setEditingNorm] = useState<any>(null);

    // --- Logic Lọc dữ liệu ---
    const filteredNorms = norms.filter(n => {
        const matchSearch = n.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchGroup = selectedGroupId ? n.group_id === selectedGroupId : true;
        return matchSearch && matchGroup;
    });

    // --- Xử lý Xóa ---
    const handleDelete = async (id: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa định mức này không?")) {
            const res = await deleteNorm(id);
            if (res.success) {
                toast.success(res.message);
            } else {
                toast.error(res.error);
            }
        }
    };

    // --- Xử lý Mở Modal Sửa ---
    const handleEdit = (norm: any) => {
        setEditingNorm(norm);
        setIsOpen(true);
    };

    // --- Xử lý Mở Modal Thêm Mới ---
    const handleAddNew = () => {
        setEditingNorm(null);
        setIsOpen(true);
    };

    return (
        <div className="flex h-full gap-6">

            {/* ================= LEFT SIDEBAR: LIST GROUPS ================= */}
            <div className="w-64 flex-shrink-0 bg-white rounded-lg border shadow-sm flex flex-col h-full">
                <div className="p-4 border-b bg-slate-50 rounded-t-lg">
                    <h2 className="font-bold flex items-center gap-2 text-slate-800">
                        <Layers className="w-4 h-4 text-blue-600" /> Nhóm Định Mức
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Lọc theo nhóm công việc</p>
                </div>
                <ScrollArea className="flex-1 p-2">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            className={cn(
                                "w-full justify-start font-medium",
                                !selectedGroupId ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                            )}
                            onClick={() => setSelectedGroupId(null)}
                        >
                            <Box className="w-4 h-4 mr-2" /> Tất cả
                        </Button>
                        {groups.map(g => (
                            <Button
                                key={g.id}
                                variant="ghost"
                                className={cn(
                                    "w-full justify-start text-sm truncate",
                                    selectedGroupId === g.id ? "bg-blue-50 text-blue-700 font-bold" : "text-slate-600 hover:bg-slate-50"
                                )}
                                onClick={() => setSelectedGroupId(g.id)}
                                title={g.name}
                            >
                                <span className="w-2 h-2 rounded-full mr-2 shrink-0" style={{ backgroundColor: g.color || '#94a3b8' }}></span>
                                <span className="truncate">{g.name}</span>
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-3 border-t bg-slate-50/50 text-[10px] text-center text-muted-foreground">
                    {groups.length} nhóm định mức
                </div>
            </div>

            {/* ================= RIGHT CONTENT: LIST NORMS ================= */}
            <div className="flex-1 flex flex-col space-y-4 h-full overflow-hidden">
                {/* Toolbar */}
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm shrink-0">
                    <div className="relative w-96">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm mã hiệu, tên công tác..."
                            className="pl-8 bg-slate-50"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={handleAddNew} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
                        <Plus className="mr-2 h-4 w-4" /> Thêm định mức mới
                    </Button>
                </div>

                {/* Grid List */}
                <ScrollArea className="flex-1 pr-3">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-10">
                        {filteredNorms.map(norm => (
                            <Card key={norm.id} className="hover:shadow-md transition-all border-l-4 group" style={{ borderLeftColor: norm.group?.color || '#cbd5e1' }}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <Badge variant="secondary" className="font-mono font-bold bg-slate-100 text-slate-700 border-slate-200 shrink-0">
                                            {norm.code}
                                        </Badge>
                                        {norm.group && (
                                            <Badge variant="outline" className="text-[10px] h-5 px-1.5 truncate max-w-[150px]" style={{ color: norm.group.color, borderColor: norm.group.color }}>
                                                {norm.group.name}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-blue-600 hover:bg-blue-50" onClick={() => handleEdit(norm)}>
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:bg-red-50" onClick={() => handleDelete(norm.id)}>
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="text-base font-bold mb-1 line-clamp-1 text-slate-800" title={norm.name}>
                                        {norm.name}
                                    </div>
                                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-2">
                                        <span>Đơn vị tính: <span className="font-semibold text-slate-700">{norm.unit}</span></span>
                                    </div>

                                    {/* Mini Table Hao Phí (Hiển thị tối đa 5 dòng để gọn) */}
                                    <div className="bg-slate-50/80 p-2 rounded-md text-xs space-y-1 border border-slate-100">
                                        {(!norm.details || norm.details.length === 0) ? (
                                            <span className="italic text-slate-400 pl-1">Chưa khai báo hao phí</span>
                                        ) : (
                                            norm.details.slice(0, 5).map((d: any, idx: number) => (
                                                <div key={idx} className="flex justify-between border-b border-dashed border-slate-200 last:border-0 py-1 hover:bg-slate-100 px-1 rounded transition-colors">
                                                    <span className="truncate pr-2" title={d.material_name}>
                                                        {d.material_name} <span className="text-slate-400 font-mono">({d.material_code})</span>
                                                    </span>
                                                    <span className="font-mono font-bold text-slate-700 shrink-0">
                                                        {d.quantity} {d.unit}
                                                    </span>
                                                </div>
                                            ))
                                        )}
                                        {norm.details && norm.details.length > 5 && (
                                            <div className="text-center pt-1 text-slate-400 italic">...và {norm.details.length - 5} vật tư khác</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {filteredNorms.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground bg-white rounded-lg border border-dashed">
                                <Filter className="w-10 h-10 mb-2 opacity-20" />
                                <p>Không tìm thấy định mức nào phù hợp.</p>
                                <Button variant="link" onClick={() => { setSearchTerm(""); setSelectedGroupId(null); }}>
                                    Xóa bộ lọc
                                </Button>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* ================= DIALOG FORM ================= */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0 gap-0 flex flex-col">
                    <DialogHeader className="p-6 pb-2 border-b bg-slate-50/50 sticky top-0 z-10 shrink-0">
                        <DialogTitle className="text-xl text-slate-800">
                            {editingNorm ? "Cập nhật định mức" : "Thêm định mức mới"}
                        </DialogTitle>
                        <DialogDescription>
                            Khai báo mã hiệu, tên công việc và thành phần hao phí vật tư.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="p-6 flex-1">
                        {/* ✅ Form Component: Truyền đủ props */}
                        <NormForm
                            initialData={editingNorm}
                            groups={groups}
                            materials={materials} // Truyền danh sách vật tư vào để Combobox hoạt động
                            onSuccess={() => {
                                setIsOpen(false);
                                toast.success("Đã lưu định mức thành công");
                            }}
                        />
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}