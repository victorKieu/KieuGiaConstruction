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
    DialogDescription, // 👈 1. Import thêm DialogDescription
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { upsertDictionary, DictionaryFormData } from "@/lib/action/dictionary";
import { Loader2, Plus } from "lucide-react";
import { CategoryCombobox } from "@/components/admin/CategoryCombobox";
import { formatCategoryCode } from "@/lib/constants/dictionary";
import { ColorPicker } from "@/components/ui/color-picker";

interface Props {
    initialData?: any;
    trigger?: React.ReactNode;
    defaultCategory?: string;
    existingCategories?: string[];
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

        const res = await upsertDictionary(formData);

        setLoading(false);
        if (res.success) {
            setOpen(false);
            toast({ title: "Thành công", description: "Dữ liệu đã được lưu." });
        } else {
            toast({ title: "Lỗi", description: res.error, variant: "destructive" });
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" /> Thêm mới
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{initialData ? "Chỉnh sửa" : "Thêm mới danh mục"}</DialogTitle>
                    {/* 👇 2. Thêm DialogDescription vào đây để fix lỗi Warning */}
                    <DialogDescription>
                        {initialData
                            ? "Cập nhật thông tin chi tiết cho mục từ điển này."
                            : "Điền thông tin để tạo mới một mục từ điển dữ liệu vào hệ thống."}
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <Label>Phân hệ (Category) *</Label>
                            {initialData ? (
                                <Input value={formData.category} disabled readOnly className="bg-gray-100 text-gray-500 cursor-not-allowed" />
                            ) : (
                                <CategoryCombobox
                                    value={formData.category}
                                    onChange={(val) => setFormData({ ...formData, category: val })}
                                    existingCategories={existingCategories}
                                />
                            )}
                            <p className="text-[10px] text-gray-400 mt-1">
                                Hệ thống sẽ tự động chuẩn hóa: MODULE_ENTITY_TYPE
                            </p>
                        </div>

                        <div className="col-span-1">
                            <Label>Mã (Code) *</Label>
                            <Input
                                value={formData.code}
                                onChange={e => setFormData({ ...formData, code: formatCategoryCode(e.target.value).toLowerCase() })}
                                placeholder="VD: enterprise"
                                required
                            />
                        </div>
                        <div className="col-span-1">
                            <Label>Tên hiển thị *</Label>
                            <Input
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                placeholder="VD: Doanh nghiệp"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Màu sắc (Badge)</Label>
                            <ColorPicker
                                value={formData.color}
                                onChange={(val) => setFormData({ ...formData, color: val })}
                                className="w-full"
                            />
                        </div>
                        <div>
                            <Label>Thứ tự</Label>
                            <Input
                                type="number"
                                value={formData.sort_order}
                                onChange={e => setFormData({ ...formData, sort_order: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div>
                        <Label>Meta Data (JSON)</Label>
                        <Textarea
                            value={formData.meta_data}
                            onChange={e => setFormData({ ...formData, meta_data: e.target.value })}
                            className="font-mono text-xs"
                            rows={3}
                            placeholder='{"prefix": "KHDN"}'
                        />
                        <p className="text-[10px] text-gray-500">Nhập chuỗi JSON hợp lệ để cấu hình nâng cao.</p>
                    </div>

                    <div className="flex justify-end gap-2">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Hủy</Button>
                        <Button type="submit" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}