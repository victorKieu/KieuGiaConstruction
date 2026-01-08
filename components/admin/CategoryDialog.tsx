"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea"; // Cần component Textarea
import { saveCategory } from "@/lib/action/categoryActions";
import { toast } from "sonner";
import { Loader2, Plus, Save } from "lucide-react";

interface Props {
    initialData?: any;
    trigger?: React.ReactNode;
}

export function CategoryDialog({ initialData, trigger }: Props) {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm({
        defaultValues: initialData || {
            code: "",
            name: "",
            description: "",
            sort_order: 99
        }
    });

    const onSubmit = async (data: any) => {
        setLoading(true);
        const res = await saveCategory(data);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            setOpen(false);
            if (!initialData) reset(); // Reset form nếu là thêm mới
        } else {
            toast.error(res.error);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="w-4 h-4 mr-2" /> Thêm Phân hệ
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{initialData ? "Cập nhật Phân hệ" : "Thêm Phân hệ Mới"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Mã Phân hệ (Code)</Label>
                            <Input
                                {...register("code", { required: true })}
                                placeholder="VD: NORM_GROUP"
                                disabled={!!initialData} // Không cho sửa code khi edit
                                className="uppercase font-mono"
                            />
                            {errors.code && <span className="text-red-500 text-xs">Bắt buộc nhập</span>}
                        </div>
                        <div className="space-y-2">
                            <Label>Thứ tự</Label>
                            <Input
                                type="number"
                                {...register("sort_order")}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Tên hiển thị</Label>
                        <Input
                            {...register("name", { required: true })}
                            placeholder="VD: Nhóm Định mức"
                        />
                        {errors.name && <span className="text-red-500 text-xs">Bắt buộc nhập</span>}
                    </div>

                    <div className="space-y-2">
                        <Label>Mô tả / Ghi chú</Label>
                        <Textarea
                            {...register("description")}
                            placeholder="Mô tả chức năng của phân hệ này..."
                        />
                    </div>

                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        Lưu Phân hệ
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}