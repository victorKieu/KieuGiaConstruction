"use client"

import { useState, useTransition } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Save, Loader2, Plus, Trash2, Box } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Calendar } from "@/components/ui/calendar"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import { materialRequestSchema, MaterialRequestFormValues } from "@/lib/schemas/request"
import { saveMaterialRequest } from "@/lib/action/request"
import { cn } from "@/lib/utils/utils"

interface RequestFormProps {
    projectId: string
    initialData?: any
    warehouses?: { id: string; name: string }[]
    onSuccess?: () => void
    onCancel?: () => void
}

export function RequestForm({ projectId, initialData, warehouses = [], onSuccess, onCancel }: RequestFormProps) {
    const [isPending, startTransition] = useTransition()

    // Sinh mã phiếu mặc định: PR-YYMMDD-XXXX
    const defaultCode = `PR-${format(new Date(), 'yyMMdd')}-${Math.floor(1000 + Math.random() * 9000)}`;

    const form = useForm<MaterialRequestFormValues>({
        resolver: zodResolver(materialRequestSchema),
        defaultValues: initialData ? {
            ...initialData,
            project_id: projectId,
            deadline_date: initialData.deadline_date ? new Date(initialData.deadline_date) : new Date(),
            items: initialData.items || []
        } : {
            project_id: projectId,
            code: defaultCode,
            priority: "normal",
            deadline_date: new Date(),
            items: [{ item_name: "", unit: "", quantity: 1, notes: "" }]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    })

    const onSubmit = (data: MaterialRequestFormValues) => {
        startTransition(async () => {
            // Fix: Truyền đúng warehouse_id (nếu rỗng thì gửi null)
            const payload = {
                ...data,
                destination_warehouse_id: data.destination_warehouse_id || null
            };

            const res = await saveMaterialRequest(payload);
            if (res.success) {
                alert(res.message);
                if (onSuccess) onSuccess();
            } else {
                alert("Lỗi: " + res.error);
            }
        })
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* 1. THÔNG TIN CHUNG */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mã phiếu <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input {...field} className="font-bold bg-slate-50" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="deadline_date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ngày cần hàng <span className="text-red-500">*</span></FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}
                                            >
                                                {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            initialFocus
                                        />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Độ ưu tiên</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn độ ưu tiên" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="low">Thấp</SelectItem>
                                        <SelectItem value="normal">Bình thường</SelectItem>
                                        <SelectItem value="high">Cao</SelectItem>
                                        <SelectItem value="urgent">Khẩn cấp</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Chọn kho nhập (Optional) */}
                    <FormField
                        control={form.control}
                        name="destination_warehouse_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Nhập về kho (Tùy chọn)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || undefined}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn kho..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {warehouses.length > 0 ? warehouses.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                        )) : <div className="p-2 text-sm text-gray-500">Chưa có kho nào</div>}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel>Ghi chú / Diễn giải</FormLabel>
                            <FormControl>
                                <Textarea placeholder="VD: Cần gấp để đổ bê tông sàn tầng 2..." {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* 2. DANH SÁCH VẬT TƯ */}
                <Card className="border-indigo-100 shadow-sm">
                    <CardHeader className="py-3 bg-indigo-50/30 border-b border-indigo-100 flex flex-row justify-between items-center">
                        <CardTitle className="text-sm font-bold text-indigo-700 flex items-center gap-2">
                            <Box className="w-4 h-4" /> Chi tiết vật tư
                        </CardTitle>
                        <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => append({ item_name: "", unit: "", quantity: 1, notes: "" })}
                            className="bg-white hover:bg-indigo-50 text-indigo-600 border-indigo-200 h-8"
                        >
                            <Plus className="w-3 h-3 mr-1" /> Thêm dòng
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[40%]">Tên vật tư / Quy cách <span className="text-red-500">*</span></TableHead>
                                    <TableHead className="w-[15%]">ĐVT <span className="text-red-500">*</span></TableHead>
                                    <TableHead className="w-[15%] text-right">Số lượng <span className="text-red-500">*</span></TableHead>
                                    <TableHead>Ghi chú</TableHead>
                                    <TableHead className="w-[50px]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="p-2">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.item_name`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input {...field} placeholder="VD: Xi măng Hà Tiên" className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.unit`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input {...field} placeholder="Bao" className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input type="number" {...field} className="h-9 text-right font-semibold" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.notes`}
                                                render={({ field }) => (
                                                    <FormItem className="space-y-0">
                                                        <FormControl>
                                                            <Input {...field} placeholder="..." className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="p-2 text-center">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => remove(index)}
                                                className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                        {form.formState.errors.items && (
                            <div className="p-2 text-red-500 text-sm text-center bg-red-50">
                                {form.formState.errors.items.message}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onCancel}>Hủy</Button>
                    <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                        {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                        {initialData ? "Lưu thay đổi" : "Gửi yêu cầu"}
                    </Button>
                </div>
            </form>
        </Form>
    )
}