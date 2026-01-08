"use client";

import { useState } from "react";
import { Plus, Search, Edit, Trash2, Box, Layers, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { deleteNorm } from "@/lib/action/normActions";
import { deleteDictionary } from "@/lib/action/dictionaryActions"; // Để xóa Group nếu cần
import NormForm from "@/components/dictionaries/norms/NormForm";
import { toast } from "sonner";
import { cn } from "@/lib/utils/utils";

// Nhận thêm props groups
export default function NormClient({ norms, groups }: { norms: any[], groups: any[] }) {
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null); // Filter state
    const [isOpen, setIsOpen] = useState(false);
    const [editingNorm, setEditingNorm] = useState<any>(null);

    // Logic lọc dữ liệu
    const filteredNorms = norms.filter(n => {
        const matchSearch = n.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchGroup = selectedGroupId ? n.group_id === selectedGroupId : true;
        return matchSearch && matchGroup;
    });

    const handleDelete = async (id: string) => {
        if (confirm("Bạn có chắc chắn muốn xóa?")) {
            await deleteNorm(id);
            toast.success("Đã xóa");
        }
    };

    return (
        <div className="flex h-full gap-6">

            {/* --- LEFT SIDEBAR: LIST GROUPS --- */}
            <div className="w-64 flex-shrink-0 bg-white rounded-lg border shadow-sm flex flex-col">
                <div className="p-4 border-b">
                    <h2 className="font-bold flex items-center gap-2">
                        <Layers className="w-4 h-4 text-blue-600" /> Nhóm Định Mức
                    </h2>
                    <p className="text-xs text-muted-foreground mt-1">Lọc theo nhóm công việc</p>
                </div>
                <ScrollArea className="flex-1 p-2">
                    <div className="space-y-1">
                        <Button
                            variant="ghost"
                            className={cn("w-full justify-start", !selectedGroupId && "bg-slate-100 font-bold")}
                            onClick={() => setSelectedGroupId(null)}
                        >
                            <Box className="w-4 h-4 mr-2" /> Tất cả
                        </Button>
                        {groups.map(g => (
                            <Button
                                key={g.id}
                                variant="ghost"
                                className={cn("w-full justify-start text-sm", selectedGroupId === g.id && "bg-blue-50 text-blue-700 font-bold")}
                                onClick={() => setSelectedGroupId(g.id)}
                            >
                                <span className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: g.color || '#ccc' }}></span>
                                {g.name}
                            </Button>
                        ))}
                    </div>
                </ScrollArea>
                <div className="p-4 border-t bg-slate-50 rounded-b-lg">
                    <p className="text-xs text-muted-foreground">
                        💡 Để thêm nhóm mới, vui lòng vào mục <b>Admin / Từ điển dữ liệu</b> và chọn category <b>NORM_GROUP</b>.
                    </p>
                </div>
            </div>

            {/* --- RIGHT CONTENT: LIST NORMS --- */}
            <div className="flex-1 flex flex-col space-y-4">
                {/* Toolbar */}
                <div className="flex justify-between items-center bg-white p-3 rounded-lg border shadow-sm">
                    <div className="relative w-96">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Tìm mã hiệu, tên công tác..."
                            className="pl-8"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button onClick={() => { setEditingNorm(null); setIsOpen(true); }} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" /> Thêm định mức mới
                    </Button>
                </div>

                {/* Grid List */}
                <ScrollArea className="h-[calc(100vh-200px)]">
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 pb-10">
                        {filteredNorms.map(norm => (
                            <Card key={norm.id} className="hover:shadow-md transition-shadow border-l-4" style={{ borderLeftColor: norm.group?.color || '#cbd5e1' }}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="font-mono font-bold bg-slate-100 text-slate-700 border-slate-200">
                                            {norm.code}
                                        </Badge>
                                        {norm.group && (
                                            <Badge variant="outline" className="text-[10px] h-5" style={{ color: norm.group.color, borderColor: norm.group.color }}>
                                                {norm.group.name}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingNorm(norm); setIsOpen(true); }}>
                                            <Edit className="h-3.5 w-3.5 text-blue-500" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDelete(norm.id)}>
                                            <Trash2 className="h-3.5 w-3.5 text-red-500" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0">
                                    <div className="text-base font-bold mb-1 line-clamp-2" title={norm.name}>{norm.name}</div>
                                    <div className="text-xs text-muted-foreground mb-3">Đơn vị: {norm.unit}</div>

                                    {/* Mini Table Hao Phí */}
                                    <div className="bg-slate-50/50 p-2 rounded text-xs space-y-1 border">
                                        {norm.details?.length === 0 ? <span className="italic text-slate-400">Chưa khai báo hao phí</span> :
                                            norm.details.map((d: any, idx: number) => (
                                                <div key={idx} className="flex justify-between border-b border-dashed border-slate-200 last:border-0 py-1">
                                                    <span>{d.material_name} <span className="text-slate-400">({d.material_code})</span></span>
                                                    <span className="font-mono font-bold">{d.quantity} {d.unit}</span>
                                                </div>
                                            ))
                                        }
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                        {filteredNorms.length === 0 && (
                            <div className="col-span-full text-center py-10 text-muted-foreground">
                                Không tìm thấy định mức nào phù hợp.
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>

            {/* Modal Form */}
            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingNorm ? "Cập nhật định mức" : "Thêm định mức mới"}</DialogTitle>
                    </DialogHeader>

                    {/* Truyền groups vào Form */}
                    <NormForm
                        initialData={editingNorm}
                        groups={groups}
                        onSuccess={() => { setIsOpen(false); toast.success("Đã lưu thành công"); }}
                    />
                </DialogContent>
            </Dialog>
        </div>
    );
}