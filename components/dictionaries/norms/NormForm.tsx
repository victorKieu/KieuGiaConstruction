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
import { MaterialCombobox } from "@/components/dictionaries/norms/MaterialCombobox"; // Import component mới

// Thêm prop materials
export default function NormForm({
    initialData,
    groups = [],
    materials = [], // Nhận danh sách vật tư từ Catalog
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
        const res = await saveNorm(data);
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="group_id" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nhóm định mức</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                        <FormItem><FormLabel>Mã hiệu</FormLabel><FormControl><Input {...field} placeholder="VD: AF.1111" /></FormControl></FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem><FormLabel>Tên công tác</FormLabel><FormControl><Input {...field} placeholder="VD: Bê tông móng M250" /></FormControl></FormItem>
                    )} />
                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem><FormLabel>Đơn vị tính</FormLabel><FormControl><Input {...field} placeholder="m3, m2..." /></FormControl></FormItem>
                    )} />
                </div>

                <Card>
                    <CardHeader className="py-2"><CardTitle className="text-sm">Phân tích vật tư (Hao phí)</CardTitle></CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[300px]">Vật tư (Tìm kiếm)</TableHead>
                                    <TableHead>Mã VT</TableHead>
                                    <TableHead>Tên hiển thị (Tùy chỉnh)</TableHead>
                                    <TableHead className="w-[80px]">ĐVT</TableHead>
                                    <TableHead className="text-right w-[120px]">Định mức</TableHead>
                                    <TableHead className="w-[40px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="p-2 align-top">
                                            {/* ✅ COMBOBOX VẬT TƯ: Tự động điền thông tin */}
                                            <MaterialCombobox
                                                materials={materials}
                                                value={form.watch(`details.${index}.material_code`)}
                                                onChange={(mat) => {
                                                    form.setValue(`details.${index}.material_code`, mat.code);
                                                    form.setValue(`details.${index}.material_name`, mat.name);
                                                    form.setValue(`details.${index}.unit`, mat.unit);
                                                }}
                                            />
                                        </TableCell>

                                        {/* Các trường ReadOnly hoặc Editable */}
                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.material_code`)} readOnly className="h-9 bg-slate-50 text-slate-500 font-mono text-xs" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.material_name`)} className="h-9" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.unit`)} readOnly className="h-9 bg-slate-50 text-slate-500 text-center" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Input {...form.register(`details.${index}.quantity`)} type="number" step="0.0001" className="h-9 text-right font-bold text-blue-600" />
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        <Button type="button" variant="ghost" size="sm" className="m-2" onClick={() => append({ material_code: "", material_name: "", unit: "", quantity: 0 })}>
                            <Plus className="w-4 h-4 mr-1" /> Thêm dòng hao phí
                        </Button>
                    </CardContent>
                </Card>

                <Button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu Định Mức
                </Button>
            </form>
        </Form>
    );
}