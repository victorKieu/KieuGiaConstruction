"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast"; // Hoặc hooks/use-toast tùy setup
import { upsertDictionary, DictionaryFormData } from "@/lib/action/dictionary";
import { Loader2, Plus } from "lucide-react";
import { CategoryCombobox } from "@/components/admin/CategoryCombobox";
import { formatCategoryCode } from "@/lib/constants/dictionary";

// 1. Cập nhật Interface Props
interface Props {
    initialData?: any;
    trigger?: React.ReactNode;
    defaultCategory?: string;
    existingCategories?: string[]; // <--- BẮT BUỘC KHAI BÁO Ở ĐÂY
}

// 2. Cập nhật hàm nhận Props (Destructuring)
export function DictionaryDialog({
    initialData,
    trigger,
    defaultCategory,
    existingCategories = [] // <--- BẮT BUỘC PHẢI LẤY RA Ở ĐÂY VÀ GÁN MẶC ĐỊNH
}: Props) {

    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const { toast } = useToast(); // Đảm bảo hook này đúng đường dẫn

    const [formData, setFormData] = useState<DictionaryFormData>({
        id: initialData?.id,
        category: initialData?.category || defaultCategory || "",
        code: initialData?.code || "",
        name: initialData?.name || "",
        color: initialData?.color || "gray",
        sort_order: initialData?.sort_order || 0,
        meta_data: initialData?.meta_data ? JSON.stringify(initialData.meta_data, null, 2) : "{}",
    });

    // Reset form khi mở dialog hoặc đổi data
    useEffect(() => {
        if (open) {
            setFormData({
                id: initialData?.id,
                category: initialData?.category || defaultCategory || "",
                code: initialData?.code || "",
                name: initialData?.name || "",
                color: initialData?.color || "gray",
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
            // Nếu không dùng toast thì dùng alert hoặc console.log
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
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        {/* --- CATEGORY INPUT --- */}
                        <div className="col-span-2">
                            <Label>Phân hệ (Category) *</Label>

                            {initialData ? (
                                // Khi Edit: Disable input
                                <Input value={formData.category} disabled readOnly className="bg-gray-100 text-gray-500 cursor-not-allowed" />
                            ) : (
                                // Khi Thêm mới: Dùng Combobox
                                <CategoryCombobox
                                    value={formData.category}
                                    onChange={(val) => setFormData({ ...formData, category: val })}
                                    existingCategories={existingCategories} // <--- GIỜ ĐÃ CÓ BIẾN NÀY
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
                            <Input
                                value={formData.color}
                                onChange={e => setFormData({ ...formData, color: e.target.value })}
                                placeholder="gray, red, blue..."
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