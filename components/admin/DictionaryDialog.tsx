"use client";

import { useState, useEffect } from "react";
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
    DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast"; // Hoặc import { toast } from "sonner" tùy library bạn dùng
import { upsertDictionary, DictionaryFormData } from "@/lib/action/dictionaryActions";
import { Loader2, Plus, Save } from "lucide-react";
import { formatCategoryCode } from "@/lib/constants/dictionary";
import { ColorPicker } from "@/components/ui/color-picker";
import { CategoryCombobox } from "@/components/admin/CategoryCombobox"; // ✅ Import component vừa tạo

interface Props {
    initialData?: any;
    trigger?: React.ReactNode;
    defaultCategory?: string;
    // ✅ Cập nhật kiểu dữ liệu: Nhận cả code và name
    existingCategories?: { code: string; name: string }[];
}

export function DictionaryDialog({
    initialData,
    trigger,
    defaultCategory,
    existingCategories = []
}: Props) {

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const [formData, setFormData] = useState<DictionaryFormData>({
        id: initialData?.id,
        category: initialData?.category || defaultCategory || "",
        code: initialData?.code || "",
        name: initialData?.name || "",
        color: initialData?.color || "#94a3b8",
        sort_order: initialData?.sort_order || 0,
        meta_data: initialData?.meta_data ? JSON.stringify(initialData.meta_data, null, 2) : "{}",
    });

    useEffect(() => {
        if (open) {
            setFormData({
                id: initialData?.id,
                category: initialData?.category || defaultCategory || "",
                code: initialData?.code || "",
                name: initialData?.name || "",
                color: initialData?.color || "#94a3b8",
                sort_order: initialData?.sort_order || 0,
                meta_data: initialData?.meta_data ? JSON.stringify(initialData.meta_data, null, 2) : "{}",
            });
        }
    }, [open, initialData, defaultCategory]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        if (!formData.category) {
            // Xử lý toast lỗi tùy theo thư viện bạn đang dùng (shadcn/ui toast hoặc sonner)
            // toast({ title: "Lỗi", description: "Vui lòng chọn Phân hệ", variant: "destructive" });
            alert("Vui lòng chọn Phân hệ");
            setLoading(false);
            return;
        }

        const res = await upsertDictionary(formData);

        setLoading(false);
        if (res.success) {
            setOpen(false);
            // toast({ title: "Thành công", description: "Dữ liệu đã được lưu." });
        } else {
            // toast({ title: "Lỗi", description: res.error, variant: "destructive" });
            alert(res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="mr-2 h-4 w-4" /> Thêm dữ liệu
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Chỉnh sửa dữ liệu" : "Thêm dữ liệu mới"}</DialogTitle>
                    <DialogDescription>
                        {initialData
                            ? "Cập nhật thông tin chi tiết cho mục từ điển này."
                            : "Thêm giá trị mới vào từ điển hệ thống."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-2">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Phân hệ (Category) <span className="text-red-500">*</span></Label>

                            {/* LOGIC HIỂN THỊ */}
                            {defaultCategory || initialData ? (
                                // 1. Nếu đang Filter hoặc Edit -> Hiện Input Disabled (cho gọn)
                                <div className="relative">
                                    <Input
                                        value={
                                            existingCategories.find(c => c.code === formData.category)?.name ||
                                            formData.category
                                        }
                                        disabled
                                        className="bg-slate-100 font-semibold text-slate-700 mt-1"
                                    />
                                    {/* Input ẩn để giữ giá trị category code khi submit */}
                                    <input type="hidden" value={formData.category} />
                                </div>
                            ) : (
                                // 2. Nếu Thêm mới tự do -> Hiện Combobox tìm kiếm
                                <div className="mt-1">
                                    <CategoryCombobox
                                        value={formData.category}
                                        onChange={(val) => setFormData({ ...formData, category: val })}
                                        categories={existingCategories}
                                    />
                                </div>
                            )}

                            {!defaultCategory && !initialData && (
                                <p className="text-[10px] text-gray-500 mt-1">
                                    * Tìm kiếm theo tên phân hệ (VD: Nhóm định mức).
                                </p>
                            )}
                        </div>

                        <div className="col-span-1">
                            <Label>Mã (Code) <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: formatCategoryCode(e.target.value) })}
                                placeholder="VD: ENTERPRISE"
                                required
                                className="font-mono uppercase mt-1"
                            />
                        </div>
                        <div className="col-span-1">
                            <Label>Tên hiển thị <span className="text-red-500">*</span></Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="VD: Doanh nghiệp"
                                required
                                className="mt-1"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Màu sắc (Badge)</Label>
                            <div className="mt-1.5">
                                <ColorPicker
                                    value={formData.color}
                                    onChange={(val) => setFormData({ ...formData, color: val })}
                                    className="w-full"
                                />
                            </div>
                        </div>
                        <div>
                            <Label>Thứ tự hiển thị</Label>
                            <Input
                                type="number"
                                value={formData.sort_order}
                                onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                                className="mt-1.5"
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Meta Data (JSON Config)</Label>
                        <Textarea
                            value={formData.meta_data}
                            onChange={e => setFormData({ ...formData, meta_data: e.target.value })}
                            className="font-mono text-xs mt-1.5"
                            rows={3}
                            placeholder='{"prefix": "KHDN", "isActive": true}'
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Lưu dữ liệu
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}