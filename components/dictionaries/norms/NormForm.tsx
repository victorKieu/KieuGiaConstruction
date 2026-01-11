"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Loader2, Plus, Save, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormField, FormItem, FormLabel, FormControl } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { saveNorm } from "@/lib/action/normActions";
import { toast } from "sonner";
import { MaterialCombobox } from "@/components/dictionaries/norms/MaterialCombobox"; // ✅ Đảm bảo import đúng

export default function NormForm({
    initialData,
    groups = [],
    materials = [],
    onSuccess
}: {
    initialData?: any,
    groups?: any[],
    materials?: any[],
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false);

    const form = useForm({
        defaultValues: initialData || {
            code: "",
            name: "",
            unit: "",
            group_id: "",
            type: "company",
            details: [{ material_code: "", material_name: "", unit: "", quantity: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "details"
    });

    const onSubmit = async (data: any) => {
        setLoading(true);
        // Gọi server action đã được nâng cấp
        const res = await saveNorm(data);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            if (onSuccess) onSuccess();
        } else {
            toast.error(res.error); // Hiển thị lỗi chi tiết từ server
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* --- Phần Header (Nhóm, Mã, Tên, ĐVT) --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="group_id" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nhóm định mức</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                <FormControl>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Chọn nhóm công việc" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {groups.map((g) => (
                                        <SelectItem key={g.id} value={g.id}>
                                            {g.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="code" render={({ field }) => (
                        <FormItem><FormLabel>Mã hiệu <span className="text-red-500">*</span></FormLabel><FormControl><Input {...field} placeholder="VD: AF.1111" required /></FormControl></FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Tên công tác <span className="text-red-500">*</span></FormLabel><FormControl><Input {...field} placeholder="VD: Bê tông móng M250" required /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem><FormLabel>Đơn vị tính</FormLabel><FormControl><Input {...field} placeholder="m3, m2..." /></FormControl></FormItem>
                    )} />
                </div>

                {/* --- Phần Chi Tiết Vật Tư --- */}
                <Card>
                    <CardHeader className="py-2 px-4 bg-slate-50"><CardTitle className="text-sm">Phân tích vật tư (Hao phí)</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px] pl-4">Vật tư (Tìm kiếm)</TableHead>
                                    <TableHead>Mã VT</TableHead>
                                    <TableHead>Tên hiển thị</TableHead>
                                    <TableHead className="w-[80px] text-center">ĐVT</TableHead>
                                    <TableHead className="text-right w-[120px]">Định mức</TableHead>
                                    <TableHead className="w-[40px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="p-2 pl-4 align-top">
                                            {/* Chọn Vật tư từ Catalog */}
                                            <MaterialCombobox
                                                materials={materials}
                                                value={form.watch(`details.${index}.material_code`)}
                                                onChange={(mat) => {
                                                    // Tự động điền dữ liệu khi chọn
                                                    form.setValue(`details.${index}.material_code`, mat.code);
                                                    form.setValue(`details.${index}.material_name`, mat.name);
                                                    form.setValue(`details.${index}.unit`, mat.unit);
                                                }}
                                            />
                                        </TableCell>

                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.material_code`)} readOnly className="h-9 bg-slate-50 text-slate-500 text-xs font-mono" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.material_name`)} className="h-9" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.unit`)} readOnly className="h-9 bg-slate-50 text-slate-500 text-center" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            {/* Quantity: type="number" step="any" để nhập số lẻ */}
                                            <Input
                                                {...form.register(`details.${index}.quantity`)}
                                                type="number"
                                                step="any"
                                                placeholder="0"
                                                className="h-9 text-right font-bold text-blue-600"
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="h-9 w-9 text-red-500 hover:bg-red-50 hover:text-red-600">
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <div className="p-2 bg-slate-50 border-t">
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ material_code: "", material_name: "", unit: "", quantity: 0 })} className="bg-white hover:bg-slate-100">
                                <Plus className="w-4 h-4 mr-1 text-blue-600" /> Thêm dòng hao phí
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 h-10 text-base font-medium">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu Định Mức
                </Button>
            </form>
        </Form>
    );
}