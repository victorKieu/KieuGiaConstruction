"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation"; // Import router
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Check, Link as LinkIcon, Search, AlertCircle, Upload, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { importBOQFromExcel } from "@/lib/action/import-excel";

export default function BOQMapper({ projectId, items }: { projectId: string, items: any[] }) {
    const router = useRouter(); // Dùng router để refresh ngầm
    // 1. Tạo State cục bộ để quản lý danh sách, giúp update giao diện tức thì
    const [localItems, setLocalItems] = useState<any[]>(items);

    // Đồng bộ state nếu props thay đổi (khi router.refresh chạy xong)
    useEffect(() => {
        setLocalItems(items);
    }, [items]);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files?.[0]) return;
        const formData = new FormData();
        formData.append('file', e.target.files[0]);

        toast.promise(importBOQFromExcel(projectId, formData), {
            loading: 'Đang đọc file Excel...',
            success: (data) => {
                router.refresh(); // Refresh để lấy dữ liệu mới import
                return `Đã import ${data.count} dòng!`;
            },
            error: 'Lỗi import'
        });
    };

    // Hàm callback cập nhật item ngay lập tức sau khi Mapping thành công
    const handleMappingSuccess = (itemId: string, updatedData: any) => {
        setLocalItems(prev => prev.map(item =>
            item.id === itemId
                ? { ...item, ...updatedData, is_mapped: true }
                : item
        ));
        // Refresh dữ liệu server ngầm, không reload trang
        router.refresh();
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-white p-4 rounded border shadow-sm">
                <div>
                    <h3 className="font-bold text-lg text-slate-800">Chuẩn hóa Dự toán</h3>
                    <p className="text-sm text-slate-500">Import từ Excel và áp mã đơn giá chuẩn</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" className="relative">
                        <input type="file" onChange={handleUpload} className="absolute inset-0 opacity-0 cursor-pointer" accept=".xlsx, .xls" />
                        <Upload className="w-4 h-4 mr-2" /> Import Excel
                    </Button>
                </div>
            </div>

            <div className="border rounded-lg bg-white overflow-hidden shadow-sm">
                <Table>
                    <TableHeader className="bg-slate-100">
                        <TableRow>
                            <TableHead className="w-[300px]">Tên gốc (Từ Excel)</TableHead>
                            <TableHead className="w-[80px]">ĐVT</TableHead>
                            <TableHead className="w-[100px] text-right">Khối lượng</TableHead>
                            <TableHead className="w-[40px]"></TableHead>
                            <TableHead>Mã chuẩn (Master Data)</TableHead>
                            <TableHead className="w-[120px] text-right">Đơn giá</TableHead>
                            <TableHead className="w-[100px] text-center">Trạng thái</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {localItems.map(item => (
                            <TableRow key={item.id} className={item.is_mapped ? "bg-green-50/30" : "hover:bg-red-50/10"}>
                                <TableCell className="font-medium text-slate-700">{item.original_name || item.material_name}</TableCell>
                                <TableCell>{item.unit}</TableCell>
                                <TableCell className="text-right font-mono">{item.quantity}</TableCell>
                                <TableCell className="text-center">
                                    <LinkIcon className="w-4 h-4 text-slate-300" />
                                </TableCell>

                                <TableCell>
                                    {item.is_mapped ? (
                                        <div className="flex flex-col group relative">
                                            <span className="font-bold text-green-700 text-xs">{item.material_code}</span>
                                            <span className="text-sm text-green-800">{item.material_name}</span>

                                            {/* Nút sửa mapping (hiện khi hover) */}
                                            <div className="absolute right-0 top-0 hidden group-hover:block">
                                                <ResourceSelector
                                                    projectId={projectId}
                                                    itemId={item.id}
                                                    originalName={item.original_name}
                                                    onSuccess={handleMappingSuccess}
                                                    triggerLabel="Sửa"
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <ResourceSelector
                                            projectId={projectId}
                                            itemId={item.id}
                                            originalName={item.original_name}
                                            onSuccess={handleMappingSuccess}
                                        />
                                    )}
                                </TableCell>

                                <TableCell className="text-right">
                                    {item.unit_price > 0 ? item.unit_price.toLocaleString() : '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                    {item.is_mapped ? (
                                        <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Đã khớp</Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-600 border-amber-200">Chưa khớp</Badge>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}

// Component con: Hộp thoại tìm kiếm và chọn Resource chuẩn
// Đã được tối ưu để KHÔNG reload trang
function ResourceSelector({ projectId, itemId, originalName, onSuccess, triggerLabel }: any) {
    const supabase = createClient();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState(originalName || "");
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Tự động tìm kiếm khi mở dialog nếu có tên gốc
    useEffect(() => {
        if (open && originalName && results.length === 0) {
            handleSearch();
        }
    }, [open]);

    const handleSearch = async () => {
        setLoading(true);
        const { data } = await supabase
            .from('norm_definitions')
            .select('*')
            .ilike('name', `%${query}%`)
            .limit(10);
        setResults(data || []);
        setLoading(false);
    };

    const handleSelect = async (norm: any) => {
        // Cập nhật DB
        const { error } = await supabase
            .from('estimation_items')
            .update({
                is_mapped: true,
                material_code: norm.code,
                material_name: norm.name,
                unit: norm.unit,
            })
            .eq('id', itemId);

        if (!error) {
            toast.success("Đã khớp mã!");
            setOpen(false); // Đóng modal

            // Gọi callback để update UI cha ngay lập tức
            onSuccess(itemId, {
                material_code: norm.code,
                material_name: norm.name,
                unit: norm.unit
            });
        } else {
            toast.error("Lỗi khi lưu");
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {triggerLabel ? (
                    <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-500 hover:text-blue-700">{triggerLabel}</Button>
                ) : (
                    <Button variant="ghost" size="sm" className="h-8 text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200">
                        <Search className="w-3 h-3 mr-2" /> Tìm mã chuẩn
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Khớp mã cho: <span className="text-red-600">"{originalName}"</span></DialogTitle>
                </DialogHeader>
                <div className="flex gap-2 my-2">
                    <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Nhập tên công việc để tìm..."
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                    <Button onClick={handleSearch} disabled={loading}>
                        {loading ? <Loader2 className="animate-spin w-4 h-4" /> : "Tìm"}
                    </Button>
                </div>
                <div className="max-h-[300px] overflow-y-auto space-y-2 border-t pt-2">
                    {results.map(r => (
                        <div key={r.id} onClick={() => handleSelect(r)} className="p-3 border rounded hover:bg-slate-50 cursor-pointer flex justify-between items-center group transition-colors">
                            <div>
                                <div className="font-bold text-sm text-blue-700">{r.code}</div>
                                <div className="text-sm">{r.name}</div>
                                <div className="text-xs text-slate-400">ĐVT: {r.unit}</div>
                            </div>
                            <Button size="sm" variant="secondary" className="opacity-0 group-hover:opacity-100 transition-opacity">Chọn</Button>
                        </div>
                    ))}
                    {!loading && results.length === 0 && <p className="text-center text-slate-500 py-4">Không tìm thấy kết quả.</p>}
                </div>
            </DialogContent>
        </Dialog>
    );
}