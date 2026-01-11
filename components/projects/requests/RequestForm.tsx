"use client";

import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2, Plus, Save, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/utils";

// Import Schema & Server Action
import { MaterialRequestFormValues, materialRequestSchema } from "@/lib/schemas/request";
import { saveMaterialRequest } from "@/lib/action/request";

interface RequestFormProps {
    initialData?: any;
    projectId: string;
    warehouses: any[];
    onSuccess?: () => void;
}

export default function RequestForm({ initialData, projectId, warehouses, onSuccess }: RequestFormProps) {
    const [loading, setLoading] = useState(false);

    // ✅ [FIX QUAN TRỌNG]: Thêm <MaterialRequestFormValues> vào sau useForm
    // Điều này báo cho TypeScript biết cấu trúc chính xác của Form
    const form = useForm<MaterialRequestFormValues>({
        resolver: zodResolver(materialRequestSchema),
        defaultValues: initialData || {
            code: `REQ-${format(new Date(), "yyMMdd")}-${Math.floor(Math.random() * 1000)}`,
            project_id: projectId,
            destination_warehouse_id: "",
            deadline_date: new Date(),
            priority: "normal",
            notes: "",
            items: [
                { item_name: "", unit: "", quantity: 0, notes: "" }
            ]
        },
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items",
    });

    // Hàm Submit
    // Lúc này TypeScript đã hiểu 'data' chính là MaterialRequestFormValues nhờ dòng useForm ở trên
    const onSubmit = async (data: MaterialRequestFormValues) => {
        setLoading(true);

        const payload = initialData?.id ? { ...data, id: initialData.id } : data;

        const res = await saveMaterialRequest(payload);

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
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* --- PHẦN 1: THÔNG TIN CHUNG --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mã phiếu <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="REQ-..." readOnly className="bg-slate-50 font-mono" />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="deadline_date"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Ngày cần hàng <span className="text-red-500">*</span></FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button
                                                variant={"outline"}
                                                className={cn(
                                                    "w-full pl-3 text-left font-normal",
                                                    !field.value && "text-muted-foreground"
                                                )}
                                            >
                                                {field.value ? (
                                                    format(field.value, "dd/MM/yyyy", { locale: vi })
                                                ) : (
                                                    <span>Chọn ngày</span>
                                                )}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar
                                            mode="single"
                                            selected={field.value}
                                            onSelect={field.onChange}
                                            disabled={(date) => date < new Date("1900-01-01")}
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
                        name="destination_warehouse_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Kho nhận (Tại dự án)</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="-- Chọn kho --" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <FormField
                        control={form.control}
                        name="priority"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Mức độ ưu tiên</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn mức độ" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="low">Thấp</SelectItem>
                                        <SelectItem value="normal">Bình thường</SelectItem>
                                        <SelectItem value="high">Cao</SelectItem>
                                        <SelectItem value="urgent" className="text-red-600 font-medium">Khẩn cấp</SelectItem>
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
                            <FormLabel>Ghi chú chung</FormLabel>
                            <FormControl>
                                {/* Fix lỗi null value */}
                                <Textarea {...field} value={field.value ?? ""} placeholder="Lý do, địa điểm giao hàng cụ thể..." />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )}
                />

                {/* --- PHẦN 2: DANH SÁCH VẬT TƯ --- */}
                <Card className="border-slate-200 shadow-sm">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader className="bg-slate-50">
                                <TableRow>
                                    <TableHead className="w-[40%] pl-4">Tên vật tư / Quy cách <span className="text-red-500">*</span></TableHead>
                                    <TableHead className="w-[15%]">ĐVT</TableHead>
                                    <TableHead className="w-[15%] text-right">Số lượng <span className="text-red-500">*</span></TableHead>
                                    <TableHead className="w-[25%]">Ghi chú</TableHead>
                                    <TableHead className="w-[5%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((item, index) => (
                                    <TableRow key={item.id}>
                                        <TableCell className="pl-4 py-2">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.item_name`}
                                                render={({ field }) => (
                                                    <FormItem className="mb-0">
                                                        <FormControl>
                                                            <Input {...field} placeholder="VD: Xi măng PCB40" className="h-9" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.unit`}
                                                render={({ field }) => (
                                                    <FormItem className="mb-0">
                                                        <FormControl>
                                                            <Input {...field} placeholder="Bao" className="h-9 text-center" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.quantity`}
                                                render={({ field }) => (
                                                    <FormItem className="mb-0">
                                                        <FormControl>
                                                            <Input
                                                                {...field}
                                                                type="number"
                                                                className="h-9 text-right font-semibold"
                                                                // Ép kiểu số khi nhập
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                            />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="py-2">
                                            <FormField
                                                control={form.control}
                                                name={`items.${index}.notes`}
                                                render={({ field }) => (
                                                    <FormItem className="mb-0">
                                                        <FormControl>
                                                            {/* Fix lỗi null value */}
                                                            <Input {...field} value={field.value ?? ""} placeholder="..." className="h-9 text-slate-500" />
                                                        </FormControl>
                                                    </FormItem>
                                                )}
                                            />
                                        </TableCell>
                                        <TableCell className="py-2 text-center">
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

                        <div className="p-2 border-t bg-slate-50 flex justify-center">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => append({ item_name: "", unit: "", quantity: 0, notes: "" })}
                                className="text-blue-600 border-blue-200 hover:bg-blue-50"
                            >
                                <Plus className="w-4 h-4 mr-1" /> Thêm dòng vật tư
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Footer Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                    {onSuccess && (
                        <Button type="button" variant="ghost" onClick={onSuccess}>Hủy bỏ</Button>
                    )}
                    <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                        {initialData ? "Cập nhật phiếu" : "Tạo phiếu yêu cầu"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}