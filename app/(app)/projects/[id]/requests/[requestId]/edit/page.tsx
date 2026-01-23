"use client";

import { useEffect, useState, use } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, Plus, Trash2, Save, Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils/utils";

// Import Schema & Actions
import { materialRequestSchema, MaterialRequestFormValues } from "@/lib/schemas/request";
import { updateMaterialRequestAction, getMaterialRequestById } from "@/lib/action/requestActions";

export default function EditRequestPage({ params }: { params: Promise<{ id: string; requestId: string }> }) {
    const { id: projectId, requestId } = use(params);
    const router = useRouter();

    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    // 1. Khởi tạo Form
    const form = useForm<MaterialRequestFormValues>({
        resolver: zodResolver(materialRequestSchema),
        defaultValues: {
            project_id: projectId,
            code: "",
            priority: "medium",
            notes: "",
            items: []
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    // 2. Load dữ liệu cũ
    useEffect(() => {
        const loadData = async () => {
            const data = await getMaterialRequestById(requestId);
            if (data) {
                form.reset({
                    id: data.id,
                    project_id: data.project_id,
                    code: data.code,
                    priority: data.priority as any,

                    // ✅ FIX 1: Map đúng deadline_date
                    deadline_date: data.deadline_date ? new Date(data.deadline_date) : new Date(),

                    // ✅ FIX 2: Map đúng destination_warehouse_id
                    destination_warehouse_id: data.destination_warehouse_id || "",

                    notes: data.notes || "",

                    // ✅ FIX 3: Map đúng item_name và notes trong mảng items
                    items: data.items.map((i: any) => ({
                        id: i.id,
                        item_name: i.item_name, // Không dùng material_name
                        unit: i.unit,
                        quantity: Number(i.quantity),
                        notes: i.notes || ""    // Không dùng note
                    }))
                });
            } else {
                toast.error("Không tìm thấy phiếu yêu cầu");
                router.back();
            }
            setFetching(false);
        };
        loadData();
    }, [requestId, form, router]);

    // 3. Xử lý Submit
    const onSubmit = async (data: MaterialRequestFormValues) => {
        setLoading(true);
        const res = await updateMaterialRequestAction(requestId, data);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            router.push(`/projects/${projectId}/requests/${requestId}`);
            router.refresh();
        } else {
            toast.error(res.error);
        }
    };

    if (fetching) return <div className="p-8 flex justify-center"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex-1 p-8 pt-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="w-4 h-4" />
                </Button>
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800">Chỉnh sửa Yêu cầu</h2>
                    <p className="text-muted-foreground text-sm">Cập nhật thông tin phiếu {form.getValues("code")}</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* Header Info */}
                    <Card>
                        <CardHeader><CardTitle className="text-base">Thông tin chung</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <FormField control={form.control} name="code" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mã phiếu</FormLabel>
                                    <FormControl><Input {...field} disabled className="bg-slate-50" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="priority" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Mức độ ưu tiên</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="low">Thấp</SelectItem>
                                            <SelectItem value="medium">Bình thường</SelectItem>
                                            <SelectItem value="high">Cao</SelectItem>
                                            <SelectItem value="urgent">Khẩn cấp</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="deadline_date" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Ngày cần hàng</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                    {field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Ghi chú chung</FormLabel>
                                    <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    {/* Items Table */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Danh sách vật tư</CardTitle>
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ item_name: "", unit: "", quantity: 1, notes: "" })}>
                                <Plus className="mr-2 h-4 w-4" /> Thêm dòng
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30%]">Tên vật tư</TableHead>
                                        <TableHead className="w-[15%]">ĐVT</TableHead>
                                        <TableHead className="w-[15%]">Số lượng</TableHead>
                                        <TableHead>Ghi chú</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell className="p-2 align-top">
                                                <FormField control={form.control} name={`items.${index}.item_name`} render={({ field }) => (
                                                    <FormItem><FormControl><Input {...field} placeholder="Tên vật tư..." /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </TableCell>
                                            <TableCell className="p-2 align-top">
                                                <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (
                                                    <FormItem><FormControl><Input {...field} placeholder="Cái/Bộ..." /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </TableCell>
                                            <TableCell className="p-2 align-top">
                                                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                                    <FormItem><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
                                                )} />
                                            </TableCell>
                                            <TableCell className="p-2 align-top">
                                                <FormField control={form.control} name={`items.${index}.notes`} render={({ field }) => (
                                                    <FormItem><FormControl><Input {...field} value={field.value || ""} placeholder="..." /></FormControl></FormItem>
                                                )} />
                                            </TableCell>
                                            <TableCell className="p-2 align-top">
                                                <Button variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                            {fields.length === 0 && (
                                <div className="p-8 text-center text-muted-foreground border-t border-dashed">
                                    Chưa có vật tư nào. Hãy bấm "Thêm dòng".
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <div className="flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={() => router.back()}>Hủy bỏ</Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 min-w-[150px]">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Lưu thay đổi
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}