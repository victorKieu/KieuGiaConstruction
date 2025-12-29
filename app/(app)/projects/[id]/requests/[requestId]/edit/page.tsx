"use client";

import { useState, useEffect, use } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, Plus, Trash2, Save, Loader2, ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/utils";

import { materialRequestSchema, MaterialRequestFormValues } from "@/lib/schemas/request";
import { updateMaterialRequestAction, getProjectWarehouses, getMaterialRequestById } from "@/lib/action/request";

export default function EditRequestPage({ params }: { params: Promise<{ id: string; requestId: string }> }) {
    const { id: projectId, requestId } = use(params);

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    const form = useForm<MaterialRequestFormValues>({
        resolver: zodResolver(materialRequestSchema),
        defaultValues: {
            code: "",
            project_id: projectId,
            destination_warehouse_id: "",
            deadline_date: new Date(),
            priority: "normal",
            notes: "",
            items: []
        }
    });

    const { fields, append, remove, replace } = useFieldArray({
        control: form.control,
        name: "items"
    });

    // Load Data
    useEffect(() => {
        const initData = async () => {
            try {
                const [ws, req] = await Promise.all([
                    getProjectWarehouses(projectId),
                    getMaterialRequestById(requestId)
                ]);
                setWarehouses(ws);

                if (!req) {
                    toast.error("Không tìm thấy phiếu");
                    router.back();
                    return;
                }
                if (req.status !== 'pending') {
                    toast.error("Phiếu đã duyệt hoặc hủy, không thể sửa!");
                    router.back();
                    return;
                }

                // Fill Form
                form.reset({
                    code: req.code,
                    project_id: req.project_id,
                    destination_warehouse_id: req.destination_warehouse_id,
                    deadline_date: new Date(req.deadline_date),
                    priority: req.priority,
                    notes: req.notes || "",
                    items: req.items.map((i: any) => ({
                        item_name: i.item_name,
                        unit: i.unit,
                        quantity: Number(i.quantity),
                        notes: i.notes || ""
                    }))
                });

            } catch (error) {
                console.error(error);
            } finally {
                setInitializing(false);
            }
        };
        initData();
    }, [projectId, requestId, form, router]);

    async function onSubmit(data: MaterialRequestFormValues) {
        setLoading(true);
        const res = await updateMaterialRequestAction(requestId, data);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            router.push(`/projects/${projectId}/requests/${requestId}`); // Về trang chi tiết
        } else {
            toast.error(res.error);
        }
    }

    if (initializing) return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Chỉnh sửa Yêu Cầu</h2>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <Card>
                        <CardHeader><CardTitle>Thông tin phiếu</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="code" render={({ field }) => (
                                <FormItem><FormLabel>Mã phiếu</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                            )} />

                            <FormField control={form.control} name="destination_warehouse_id" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nhập về kho nào?</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Chọn kho..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="deadline_date" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Cần hàng trước ngày</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} disabled={(date) => date < new Date()} initialFocus /></PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="priority" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Độ ưu tiên</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="normal">Bình thường</SelectItem>
                                            <SelectItem value="urgent">🔴 Gấp / Khẩn cấp</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <div className="col-span-1 md:col-span-2">
                                <FormField control={form.control} name="notes" render={({ field }) => (
                                    <FormItem><FormLabel>Ghi chú</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Danh sách vật tư</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[35%]">Tên vật tư</TableHead>
                                        <TableHead className="w-[15%]">ĐVT</TableHead>
                                        <TableHead className="w-[15%]">Số lượng</TableHead>
                                        <TableHead className="w-[30%]">Ghi chú</TableHead>
                                        <TableHead className="w-[5%]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.item_name`} render={({ field }) => (
                                                    <FormControl><Input {...field} /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (
                                                    <FormControl><Input {...field} /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                                    <FormControl><Input type="number" {...field} min={0} step={0.1} /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.notes`} render={({ field }) => (
                                                    <FormControl><Input {...field} /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <Button type="button" variant="outline" size="sm" onClick={() => append({ item_name: "", unit: "", quantity: 1, notes: "" })} className="mt-4">
                                <Plus className="mr-2 h-4 w-4" /> Thêm dòng
                            </Button>
                        </CardContent>
                    </Card>

                    <Button type="submit" size="lg" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu thay đổi
                    </Button>

                </form>
            </Form>
        </div>
    );
}