"use client";

import { useState } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Trash2, ChevronDown, ChevronRight, Save } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { searchNorms, addEstimateItem, updateItemDimensions } from "@/lib/action/detailed-estimation";
import { formatCurrency } from "@/lib/utils/utils";
import { toast } from "sonner";

// Group items theo section_name
const groupBySection = (items: any[]) => {
    return items.reduce((groups: any, item) => {
        const section = item.section_name || "Hạng mục chung";
        if (!groups[section]) groups[section] = [];
        groups[section].push(item);
        return groups;
    }, {});
};

export default function EstimateTableEditor({ projectId, items }: { projectId: string, items: any[] }) {
    const groupedData = groupBySection(items);
    const sections = Object.keys(groupedData);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-slate-800">Bảng chi tiết Dự toán (BOQ)</h3>
                <AddSectionDialog projectId={projectId} existingSections={sections} />
            </div>

            <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead className="w-[50px]">STT</TableHead>
                            <TableHead className="w-[100px]">Mã hiệu</TableHead>
                            <TableHead className="min-w-[200px]">Tên công tác</TableHead>
                            <TableHead className="w-[60px]">ĐVT</TableHead>
                            <TableHead className="w-[70px] bg-blue-50">Dài</TableHead>
                            <TableHead className="w-[70px] bg-blue-50">Rộng</TableHead>
                            <TableHead className="w-[70px] bg-blue-50">Cao</TableHead>
                            <TableHead className="w-[60px] bg-blue-50">HS</TableHead>
                            <TableHead className="w-[100px] text-right font-bold text-blue-700">Khối lượng</TableHead>
                            <TableHead className="w-[120px] text-right">Đơn giá vốn</TableHead>
                            <TableHead className="w-[120px] text-right">Thành tiền</TableHead>
                            <TableHead className="w-[50px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {sections.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={12} className="text-center py-8 text-slate-500">
                                    Chưa có dữ liệu. Hãy thêm Hạng mục để bắt đầu.
                                </TableCell>
                            </TableRow>
                        )}

                        {sections.map((section, sIdx) => (
                            <SectionGroup
                                key={section}
                                sectionName={section}
                                index={sIdx + 1}
                                items={groupedData[section]}
                                projectId={projectId}
                            />
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// Component con: Hiển thị 1 Nhóm (VD: Phần Móng)
function SectionGroup({ sectionName, index, items, projectId }: any) {
    const [isExpanded, setIsExpanded] = useState(true);
    const totalCost = items.reduce((sum: number, i: any) => sum + (i.quantity * i.unit_price), 0);

    return (
        <>
            {/* Dòng tiêu đề Hạng mục */}
            <TableRow className="bg-slate-50 hover:bg-slate-100 font-bold border-t-2 border-slate-200">
                <TableCell className="text-center">{index}</TableCell>
                <TableCell colSpan={9} className="text-blue-800 uppercase cursor-pointer flex items-center gap-2" onClick={() => setIsExpanded(!isExpanded)}>
                    {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    {sectionName}
                </TableCell>
                <TableCell className="text-right text-red-600">{formatCurrency(totalCost)}</TableCell>
                <TableCell>
                    <AddItemDialog projectId={projectId} sectionName={sectionName} />
                </TableCell>
            </TableRow>

            {/* Các dòng công tác con */}
            {isExpanded && items.map((item: any, idx: number) => (
                <RowEditor key={item.id} item={item} projectId={projectId} index={idx + 1} />
            ))}
        </>
    );
}

// Component con: Dòng nhập liệu (Excel-like row)
function RowEditor({ item, projectId, index }: any) {
    const [dims, setDims] = useState(item.dimensions || { length: 0, width: 0, height: 0, factor: 1 });
    const [isDirty, setIsDirty] = useState(false);

    const handleChange = (field: string, val: string) => {
        setDims({ ...dims, [field]: parseFloat(val) || 0 });
        setIsDirty(true);
    };

    const handleSave = async () => {
        await updateItemDimensions(item.id, projectId, dims);
        setIsDirty(false);
        toast.success("Đã cập nhật");
    };

    return (
        <TableRow className="hover:bg-blue-50/20">
            <TableCell className="text-center text-slate-400 text-xs">{index}</TableCell>
            <TableCell className="font-mono text-xs text-slate-600">{item.material_code}</TableCell>
            <TableCell className="text-sm">{item.material_name}</TableCell>
            <TableCell className="text-center text-xs">{item.unit}</TableCell>

            {/* Các ô nhập kích thước */}
            <TableCell className="p-1"><Input className="h-8 text-right px-1" value={dims.length} onChange={e => handleChange('length', e.target.value)} /></TableCell>
            <TableCell className="p-1"><Input className="h-8 text-right px-1" value={dims.width} onChange={e => handleChange('width', e.target.value)} /></TableCell>
            <TableCell className="p-1"><Input className="h-8 text-right px-1" value={dims.height} onChange={e => handleChange('height', e.target.value)} /></TableCell>
            <TableCell className="p-1"><Input className="h-8 text-right px-1" value={dims.factor} onChange={e => handleChange('factor', e.target.value)} /></TableCell>

            <TableCell className="text-right font-bold text-blue-700">
                {isDirty ? (
                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-green-600" onClick={handleSave}><Save size={14} /></Button>
                ) : item.quantity.toLocaleString('vi-VN')}
            </TableCell>
            <TableCell className="text-right text-xs text-slate-500">{formatCurrency(item.unit_price)}</TableCell>
            <TableCell className="text-right text-sm font-medium">{formatCurrency(item.quantity * item.unit_price)}</TableCell>
            <TableCell className="text-center"><Trash2 size={14} className="text-slate-300 hover:text-red-500 cursor-pointer" /></TableCell>
        </TableRow>
    );
}

// Dialog: Thêm công tác từ DB
function AddItemDialog({ projectId, sectionName }: any) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<any[]>([]);

    const handleSearch = async () => {
        const res = await searchNorms(query);
        setResults(res);
    };

    const handleSelect = async (norm: any) => {
        await addEstimateItem(projectId, sectionName, norm.code, norm.name, norm.unit);
        toast.success("Đã thêm công tác");
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            {/* ✅ FIX: Thêm prop asChild để tránh lỗi button lồng button */}
            <DialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                    <Plus size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader><DialogTitle>Thêm công tác vào {sectionName}</DialogTitle></DialogHeader>
                <div className="flex gap-2">
                    <Input placeholder="Tìm tên công việc (VD: Bê tông, Đào...)" value={query} onChange={e => setQuery(e.target.value)} />
                    <Button onClick={handleSearch}><Search size={16} /></Button>
                </div>
                <div className="mt-4 max-h-[300px] overflow-y-auto space-y-2">
                    {results.map(norm => (
                        <div key={norm.id} className="flex justify-between items-center p-2 border rounded hover:bg-slate-50 cursor-pointer" onClick={() => handleSelect(norm)}>
                            <div>
                                <div className="font-bold text-sm">{norm.code}</div>
                                <div className="text-sm">{norm.name}</div>
                            </div>
                            <Badge>{norm.unit}</Badge>
                        </div>
                    ))}
                </div>
            </DialogContent>
        </Dialog>
    );
}

// Dialog: Thêm Hạng mục mới
function AddSectionDialog({ projectId, existingSections }: any) {
    // Logic đơn giản: Nhập tên section rồi add 1 item dummy hoặc lưu vào list state
    // Để đơn giản, ta chỉ cần button trigger modal nhập tên
    return (
        <Button size="sm" variant="outline" className="gap-2"><Plus size={14} /> Thêm Hạng mục</Button>
    );
}