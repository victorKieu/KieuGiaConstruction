"use client";

import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
// 👇 Import thêm icon cho Combobox
import { CalendarIcon, Plus, Trash2, Save, Loader2, Check, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
// 👇 Import bộ Command để làm tính năng tìm kiếm
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

import { purchaseOrderSchema, PurchaseOrderFormValues } from "@/lib/schemas/procurement";
import { getSuppliers, createPurchaseOrderAction } from "@/lib/action/procurement";
import { getProjectsForSelect } from "@/lib/action/finance";
import { cn } from "@/lib/utils/utils";

export default function CreatePOPage() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // State dữ liệu
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);

    // State điều khiển mở/đóng Combobox
    const [openProject, setOpenProject] = useState(false);
    const [openSupplier, setOpenSupplier] = useState(false);

    const [isTaxIncluded, setIsTaxIncluded] = useState(false);

    useEffect(() => {
        Promise.all([getSuppliers(), getProjectsForSelect()]).then(([s, p]) => {
            setSuppliers(s);
            setProjects(p);
        });
    }, []);

    const form = useForm<PurchaseOrderFormValues>({
        resolver: zodResolver(purchaseOrderSchema),
        defaultValues: {
            code: `PO-${format(new Date(), "yyyyMM")}-${Math.floor(Math.random() * 1000)}`,
            order_date: new Date(),
            project_id: "",
            supplier_id: "",
            notes: "",
            items: [{ item_name: "", unit: "", quantity: 1, unit_price: 0, vat_rate: 0 }]
        }
    });

    const { fields, append, remove } = useFieldArray<PurchaseOrderFormValues>({
        control: form.control,
        name: "items"
    });

    // --- LOGIC TÍNH TỔNG TIỀN ---
    const items = form.watch("items");
    const totalAmount = items.reduce((sum, item) => {
        const inputPrice = item.unit_price || 0;
        const qty = item.quantity || 0;
        const vat = item.vat_rate || 0;

        let finalPrice = 0;
        if (isTaxIncluded) {
            finalPrice = inputPrice * qty;
        } else {
            finalPrice = inputPrice * (1 + vat / 100) * qty;
        }
        return sum + finalPrice;
    }, 0);

    async function onSubmit(data: PurchaseOrderFormValues) {
        setLoading(true);
        const payload = { ...data };

        if (isTaxIncluded) {
            payload.items = data.items.map(item => ({
                ...item,
                unit_price: item.unit_price / (1 + (item.vat_rate || 0) / 100)
            }));
        }

        const res = await createPurchaseOrderAction(payload);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            router.push("/procurement/orders");
        } else {
            toast.error(res.error);
        }
    }

    // Helper tìm tên hiển thị cho Combobox
    const selectedProject = projects.find(p => p.id === form.watch("project_id"));
    const selectedSupplier = suppliers.find(s => s.id === form.watch("supplier_id"));

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 max-w-6xl mx-auto">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight">Tạo Đơn Mua Hàng (PO)</h2>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* 1. THÔNG TIN CHUNG */}
                    <Card>
                        <CardHeader><CardTitle>Thông tin đơn hàng</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="code" render={({ field }) => (
                                <FormItem><FormLabel>Mã đơn hàng</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="order_date" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Ngày đặt hàng</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover>
                                    <FormMessage /></FormItem>
                            )} />

                            {/* --- COMBOBOX DỰ ÁN --- */}
                            <FormField
                                control={form.control}
                                name="project_id"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Dự án / Công trình</FormLabel>
                                        <Popover open={openProject} onOpenChange={setOpenProject}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" role="combobox" aria-expanded={openProject} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                        {field.value ? (
                                                            <span className="truncate">
                                                                {selectedProject?.code ? `[${selectedProject.code}] ` : ""}
                                                                {selectedProject?.name}
                                                            </span>
                                                        ) : "🔍 Tìm dự án..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Nhập tên hoặc mã dự án..." />
                                                    <CommandList>
                                                        <CommandEmpty>Không tìm thấy dự án.</CommandEmpty>
                                                        <CommandGroup>
                                                            {projects.map((project) => (
                                                                <CommandItem
                                                                    value={`${project.name} ${project.code || ""}`} // Giá trị dùng để search
                                                                    key={project.id}
                                                                    onSelect={() => {
                                                                        form.setValue("project_id", project.id);
                                                                        setOpenProject(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", project.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                    <div className="flex flex-col">
                                                                        <span>{project.name}</span>
                                                                        {project.code && <span className="text-xs text-muted-foreground">Mã: {project.code}</span>}
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            {/* --- COMBOBOX NHÀ CUNG CẤP --- */}
                            <FormField
                                control={form.control}
                                name="supplier_id"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Nhà cung cấp</FormLabel>
                                        <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button variant="outline" role="combobox" aria-expanded={openSupplier} className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>
                                                        {field.value ? selectedSupplier?.name : "🔍 Tìm nhà cung cấp..."}
                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                <Command>
                                                    <CommandInput placeholder="Nhập tên hoặc MST..." />
                                                    <CommandList>
                                                        <CommandEmpty>Không tìm thấy NCC.</CommandEmpty>
                                                        <CommandGroup>
                                                            {suppliers.map((supplier) => (
                                                                <CommandItem
                                                                    value={`${supplier.name} ${supplier.tax_code || ""}`}
                                                                    key={supplier.id}
                                                                    onSelect={() => {
                                                                        form.setValue("supplier_id", supplier.id);
                                                                        setOpenSupplier(false);
                                                                    }}
                                                                >
                                                                    <Check className={cn("mr-2 h-4 w-4", supplier.id === field.value ? "opacity-100" : "opacity-0")} />
                                                                    <div className="flex flex-col">
                                                                        <span>{supplier.name}</span>
                                                                        <span className="text-xs text-muted-foreground">{supplier.type === 'material' ? 'Vật liệu' : 'Khác'} {supplier.tax_code ? `- MST: ${supplier.tax_code}` : ''}</span>
                                                                    </div>
                                                                </CommandItem>
                                                            ))}
                                                        </CommandGroup>
                                                    </CommandList>
                                                </Command>
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </CardContent>
                    </Card>

                    {/* 2. DANH SÁCH VẬT TƯ (Phần này giữ nguyên logic cũ) */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Danh sách vật tư / Thiết bị</CardTitle>
                            <div className="flex items-center space-x-2 bg-muted px-4 py-2 rounded-md border">
                                <Switch id="tax-mode" checked={isTaxIncluded} onCheckedChange={setIsTaxIncluded} />
                                <Label htmlFor="tax-mode" className="cursor-pointer font-medium">
                                    {isTaxIncluded ? "Đang nhập: GIÁ ĐÃ CÓ THUẾ (Sau VAT)" : "Đang nhập: GIÁ GỐC (Trước VAT)"}
                                </Label>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[30%]">Tên vật tư</TableHead>
                                        <TableHead className="w-[10%]">ĐVT</TableHead>
                                        <TableHead className="w-[10%]">SL</TableHead>
                                        <TableHead className="w-[15%]">VAT (%)</TableHead>
                                        <TableHead className="w-[20%]">
                                            {isTaxIncluded ? "Đơn giá (Có VAT)" : "Đơn giá (Chưa VAT)"}
                                        </TableHead>
                                        <TableHead className="w-[5%]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.item_name`} render={({ field }) => (
                                                    <FormControl><Input {...field} placeholder="Tên..." /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (
                                                    <FormControl><Input {...field} placeholder="Cái..." /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                                    <FormControl><Input type="number" {...field} min={0} /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.vat_rate`} render={({ field }) => (
                                                    <Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value?.toString()}>
                                                        <FormControl><SelectTrigger><SelectValue placeholder="0%" /></SelectTrigger></FormControl>
                                                        <SelectContent>
                                                            <SelectItem value="0">0%</SelectItem>
                                                            <SelectItem value="5">5%</SelectItem>
                                                            <SelectItem value="8">8%</SelectItem>
                                                            <SelectItem value="10">10%</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.unit_price`} render={({ field }) => (
                                                    <FormControl><Input type="number" {...field} min={0} /></FormControl>
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

                            <div className="flex flex-col items-end justify-end mt-4 p-4 bg-muted/20 rounded-lg gap-1 border">
                                <div className="flex items-center justify-between w-full max-w-[300px]">
                                    <span className="text-sm text-muted-foreground">Tổng cộng (Đã gồm thuế):</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalAmount)}
                                    </span>
                                </div>
                            </div>

                            <Button type="button" variant="outline" size="sm" onClick={() => append({ item_name: "", unit: "", quantity: 1, unit_price: 0, vat_rate: 0 })} className="mt-4">
                                <Plus className="mr-2 h-4 w-4" /> Thêm dòng
                            </Button>
                        </CardContent>
                    </Card>

                    <Button type="submit" size="lg" className="w-full" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu Đơn Mua Hàng
                    </Button>

                </form>
            </Form>
        </div>
    );
}