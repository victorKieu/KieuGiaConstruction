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
import { MaterialCombobox } from "@/components/dictionaries/norms/MaterialCombobox";

export default function NormForm({
    initialData,
    resources = [],
    onSuccess
}: {
    initialData?: any,
    resources?: any[],
    onSuccess?: () => void
}) {
    const [loading, setLoading] = useState(false);

    const defaultDetails = initialData?.details?.map((d: any) => ({
        resource_id: d.resource?.id || d.resource_id || "",
        resource_code: d.resource?.code || "",
        resource_name: d.resource?.name || "",
        unit: d.resource?.unit || "",
        quantity: d.quantity || 0
    })) || [];

    const form = useForm({
        defaultValues: {
            id: initialData?.id || "",
            code: initialData?.code || "",
            name: initialData?.name || "",
            unit: initialData?.unit || "",
            type: initialData?.type || "company", // ✅ Thêm trường type vào Form
            details: defaultDetails.length > 0 ? defaultDetails : [{ resource_id: "", resource_code: "", resource_name: "", unit: "", quantity: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "details"
    });

    const onSubmit = async (data: any) => {
        setLoading(true);

        const cleanData = {
            ...data,
            details: data.details.filter((d: any) => d.resource_id && Number(d.quantity) > 0)
        };

        const res = await saveNorm(cleanData) as any;
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            if (onSuccess) onSuccess();
        } else {
            toast.error(res.error);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                {/* --- Phần Header (Mã, Tên, ĐVT, Loại) --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormField control={form.control} name="code" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Mã hiệu <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input {...field} placeholder="VD: AF.11110" required disabled={!!initialData} className={initialData ? "bg-slate-100" : ""} /></FormControl>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Đơn vị tính</FormLabel>
                            <FormControl><Input {...field} placeholder="VD: 100m3, m2..." /></FormControl>
                        </FormItem>
                    )} />
                    {/* ✅ Thêm Dropdown chọn Loại Định mức */}
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Loại định mức</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger><SelectValue placeholder="Chọn loại..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    <SelectItem value="company">Định mức Nội bộ</SelectItem>
                                    <SelectItem value="state">Định mức Nhà nước</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Tên công tác <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input {...field} placeholder="VD: Bê tông móng M250..." required /></FormControl>
                        </FormItem>
                    )} />
                </div>

                {/* --- Phần Chi Tiết Vật Tư --- */}
                <Card>
                    <CardHeader className="py-2 px-4 bg-slate-50 border-b">
                        <CardTitle className="text-sm">Phân tích vật tư (Hao phí)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px] pl-4">Vật tư (Tìm kiếm theo Mã/Tên)</TableHead>
                                    <TableHead className="w-[100px]">Mã VT</TableHead>
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
                                            <MaterialCombobox
                                                materials={resources}
                                                value={form.watch(`details.${index}.resource_code`)}
                                                onChange={(mat) => {
                                                    form.setValue(`details.${index}.resource_id`, mat.id);
                                                    form.setValue(`details.${index}.resource_code`, mat.code);
                                                    form.setValue(`details.${index}.resource_name`, mat.name);
                                                    form.setValue(`details.${index}.unit`, mat.unit);
                                                }}
                                            />
                                            <input type="hidden" {...form.register(`details.${index}.resource_id`)} />
                                        </TableCell>

                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.resource_code`)} readOnly className="h-9 bg-slate-50 text-slate-500 text-xs font-mono" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.resource_name`)} readOnly className="h-9 bg-slate-50 text-slate-500" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.unit`)} readOnly className="h-9 bg-slate-50 text-slate-500 text-center" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Input
                                                {...form.register(`details.${index}.quantity`)}
                                                type="number"
                                                step="any"
                                                placeholder="0.00"
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
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ resource_id: "", resource_code: "", resource_name: "", unit: "", quantity: 0 })} className="bg-white hover:bg-slate-100">
                                <Plus className="w-4 h-4 mr-1 text-blue-600" /> Thêm dòng hao phí
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 h-10 text-base font-medium">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    {initialData ? "Cập nhật Định Mức" : "Lưu Định Mức Mới"}
                </Button>
            </form>
        </Form>
    );
}