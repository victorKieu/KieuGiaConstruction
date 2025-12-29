"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    ArrowLeft, Save, Plus, Trash2, CalendarIcon, PackageMinus, Loader2
} from "lucide-react"; // <--- Đã thêm Loader2 vào đây

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils/utils";

import { getAllWarehouses, getInventoryByWarehouse, createGoodsIssueAction } from "@/lib/action/inventory";

// Schema validate
const issueSchema = z.object({
    warehouse_id: z.string().min(1, "Vui lòng chọn kho"),
    receiver_name: z.string().min(1, "Nhập tên người nhận"),
    issue_date: z.date(),
    notes: z.string().optional(),
    items: z.array(z.object({
        item_name: z.string().min(1, "Chọn vật tư"),
        unit: z.string(),
        quantity: z.coerce.number().min(0.01, "SL phải > 0"),
        notes: z.string().optional(),
        current_stock: z.number().optional()
    })).min(1, "Cần ít nhất 1 dòng")
});

export default function CreateIssuePage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const defaultWarehouseId = searchParams.get("warehouseId");

    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);
    const [stockItems, setStockItems] = useState<any[]>([]);

    const form = useForm<z.infer<typeof issueSchema>>({
        resolver: zodResolver(issueSchema),
        defaultValues: {
            warehouse_id: defaultWarehouseId || "",
            receiver_name: "",
            issue_date: new Date(),
            notes: "",
            items: [{ item_name: "", unit: "", quantity: 1, notes: "" }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    // 1. Load danh sách kho
    useEffect(() => {
        getAllWarehouses().then(setWarehouses);
    }, []);

    // 2. Khi chọn kho -> Load tồn kho của kho đó
    const selectedWarehouseId = form.watch("warehouse_id");
    useEffect(() => {
        if (selectedWarehouseId) {
            getInventoryByWarehouse(selectedWarehouseId).then(data => {
                setStockItems(data);
            });
        } else {
            setStockItems([]);
        }
    }, [selectedWarehouseId]);

    // Xử lý chọn vật tư -> Tự điền ĐVT và Tồn hiện tại
    const handleSelectItem = (index: number, itemName: string) => {
        const item = stockItems.find(i => i.item_name === itemName);
        if (item) {
            form.setValue(`items.${index}.unit`, item.unit);
            form.setValue(`items.${index}.current_stock`, item.quantity_on_hand);
        }
    };

    async function onSubmit(data: z.infer<typeof issueSchema>) {
        setLoading(true);

        // Tìm project_id từ warehouse
        const wh = warehouses.find(w => w.id === data.warehouse_id);
        const projectId = wh?.project_id;

        const res = await createGoodsIssueAction({
            ...data,
            project_id: projectId
        });

        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            router.push(`/inventory/${data.warehouse_id}`);
        } else {
            toast.error(res.error);
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 max-w-4xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tạo Phiếu Xuất Kho</h2>
                    <p className="text-muted-foreground">Xuất vật tư ra công trường để sử dụng.</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <Card>
                        <CardHeader><CardTitle>Thông tin phiếu xuất</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">

                            <FormField control={form.control} name="warehouse_id" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Xuất từ kho nào? <span className="text-red-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Chọn kho..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="issue_date" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Ngày xuất</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="receiver_name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Người nhận hàng (Tổ đội/Cá nhân)</FormLabel>
                                    <FormControl><Input {...field} placeholder="VD: Anh Nam - Tổ sắt" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="notes" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Lý do xuất / Hạng mục sử dụng</FormLabel>
                                    <FormControl><Input {...field} placeholder="VD: Đổ bê tông móng trục A-B" /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><PackageMinus className="h-5 w-5" /> Danh sách vật tư xuất</CardTitle></CardHeader>
                        <CardContent>
                            {selectedWarehouseId ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[40%]">Tên vật tư (Trong kho)</TableHead>
                                            <TableHead className="w-[15%]">ĐVT</TableHead>
                                            <TableHead className="w-[20%]">Số lượng xuất</TableHead>
                                            <TableHead className="w-[20%]">Ghi chú</TableHead>
                                            <TableHead className="w-[5%]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => {
                                            const currentItemName = form.watch(`items.${index}.item_name`);
                                            const currentStock = stockItems.find(i => i.item_name === currentItemName)?.quantity_on_hand || 0;

                                            return (
                                                <TableRow key={field.id}>
                                                    <TableCell>
                                                        <FormField control={form.control} name={`items.${index}.item_name`} render={({ field }) => (
                                                            <FormItem className="mb-0">
                                                                <Select onValueChange={(val) => { field.onChange(val); handleSelectItem(index, val); }} value={field.value}>
                                                                    <FormControl><SelectTrigger><SelectValue placeholder="Chọn vật tư..." /></SelectTrigger></FormControl>
                                                                    <SelectContent>
                                                                        {stockItems.length === 0 ? <div className="p-2 text-sm text-muted-foreground">Kho trống</div> :
                                                                            stockItems.map(item => (
                                                                                <SelectItem key={item.id} value={item.item_name}>
                                                                                    {item.item_name} (Tồn: {item.quantity_on_hand})
                                                                                </SelectItem>
                                                                            ))
                                                                        }
                                                                    </SelectContent>
                                                                </Select>
                                                            </FormItem>
                                                        )} />
                                                        {currentItemName && <div className="text-[10px] text-blue-600 mt-1">Tồn kho hiện tại: {currentStock}</div>}
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (
                                                            <FormControl><Input {...field} readOnly className="bg-slate-50" /></FormControl>
                                                        )} />
                                                    </TableCell>
                                                    <TableCell>
                                                        <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                                            <FormItem className="mb-0">
                                                                <FormControl><Input type="number" {...field} min={0} step={0.1} /></FormControl>
                                                                {/* Cảnh báo nếu nhập quá tồn */}
                                                                {Number(field.value) > currentStock && (
                                                                    <div className="text-[10px] text-red-500 mt-1 font-bold">Vượt quá tồn kho!</div>
                                                                )}
                                                            </FormItem>
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
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground bg-slate-50 rounded-md border border-dashed">
                                    Vui lòng chọn Kho trước để xem danh sách vật tư.
                                </div>
                            )}

                            <Button type="button" variant="outline" size="sm" onClick={() => append({ item_name: "", unit: "", quantity: 1, notes: "" })} className="mt-4" disabled={!selectedWarehouseId}>
                                <Plus className="mr-2 h-4 w-4" /> Thêm dòng
                            </Button>
                        </CardContent>
                    </Card>

                    <Button type="submit" size="lg" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Xác nhận Xuất Kho
                    </Button>

                </form>
            </Form>
        </div>
    );
}