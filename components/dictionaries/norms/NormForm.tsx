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
            type: initialData?.type || "company",
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

    const inputClass = "dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors";
    const readOnlyClass = "h-9 bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 transition-colors";

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 transition-colors duration-500">
                {/* --- Phần Header (Mã, Tên, ĐVT, Loại) --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <FormField control={form.control} name="code" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-slate-300 font-bold">Mã hiệu <span className="text-red-500">*</span></FormLabel>
                            <FormControl>
                                <Input
                                    {...field}
                                    placeholder="VD: AF.11110"
                                    required
                                    disabled={!!initialData}
                                    className={`${inputClass} ${initialData ? "bg-slate-100 dark:bg-slate-900 opacity-70" : ""}`}
                                />
                            </FormControl>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="unit" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-slate-300 font-bold">Đơn vị tính</FormLabel>
                            <FormControl><Input {...field} placeholder="VD: 100m3, m2..." className={inputClass} /></FormControl>
                        </FormItem>
                    )} />
                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-slate-300 font-bold">Loại định mức</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className={inputClass}><SelectValue placeholder="Chọn loại..." /></SelectTrigger>
                                </FormControl>
                                <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                    <SelectItem value="company" className="dark:text-slate-200">Định mức Nội bộ</SelectItem>
                                    <SelectItem value="state" className="dark:text-slate-200">Định mức Nhà nước</SelectItem>
                                </SelectContent>
                            </Select>
                        </FormItem>
                    )} />
                </div>

                <div className="grid grid-cols-1 gap-4">
                    <FormField control={form.control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel className="dark:text-slate-300 font-bold">Tên công tác <span className="text-red-500">*</span></FormLabel>
                            <FormControl><Input {...field} placeholder="VD: Bê tông móng M250..." required className={inputClass} /></FormControl>
                        </FormItem>
                    )} />
                </div>

                {/* --- Phần Chi Tiết Vật Tư --- */}
                <Card className="border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden dark:bg-slate-950 transition-colors">
                    <CardHeader className="py-3 px-4 bg-slate-50 dark:bg-slate-900/50 border-b dark:border-slate-800">
                        <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Phân tích vật tư (Hao phí)</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-white dark:bg-slate-900 border-b dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900">
                                        <TableHead className="w-[300px] pl-4 dark:text-slate-400 font-bold">Vật tư (Tìm kiếm)</TableHead>
                                        <TableHead className="w-[100px] dark:text-slate-400 font-bold">Mã VT</TableHead>
                                        <TableHead className="dark:text-slate-400 font-bold">Tên hiển thị</TableHead>
                                        <TableHead className="w-[80px] text-center dark:text-slate-400 font-bold">ĐVT</TableHead>
                                        <TableHead className="text-right w-[120px] dark:text-slate-400 font-bold">Định mức</TableHead>
                                        <TableHead className="w-[40px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                    {fields.map((item, index) => (
                                        <TableRow key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 border-none transition-colors">
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
                                                <Input {...form.register(`details.${index}.resource_code`)} readOnly className={`${readOnlyClass} font-mono`} />
                                            </TableCell>
                                            <TableCell className="p-2 align-top">
                                                <Input {...form.register(`details.${index}.resource_name`)} readOnly className={readOnlyClass} />
                                            </TableCell>
                                            <TableCell className="p-2 align-top">
                                                <Input {...form.register(`details.${index}.unit`)} readOnly className={`${readOnlyClass} text-center`} />
                                            </TableCell>
                                            <TableCell className="p-2 align-top">
                                                <Input
                                                    {...form.register(`details.${index}.quantity`)}
                                                    type="number"
                                                    step="any"
                                                    placeholder="0.00"
                                                    className="h-9 text-right font-black text-blue-600 dark:text-blue-400 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 transition-all"
                                                />
                                            </TableCell>
                                            <TableCell className="p-2 align-top text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => remove(index)}
                                                    className="h-9 w-9 text-slate-400 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-900/30 border-t dark:border-slate-800 transition-colors">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ resource_id: "", resource_code: "", resource_name: "", unit: "", quantity: 0 })}
                                className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                <Plus className="w-4 h-4 mr-2 text-blue-600 dark:text-blue-400" /> Thêm dòng hao phí
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end pt-2">
                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full md:w-[200px] bg-blue-600 hover:bg-blue-700 text-white font-bold h-11 shadow-lg shadow-blue-500/20 transition-all active:scale-[0.98]"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
                        {initialData ? "Cập nhật Định Mức" : "Lưu Định Mức Mới"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}