"use client";

import { useState, useEffect, use } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
    CalendarIcon, Plus, Trash2, Save, Loader2, Check, ChevronsUpDown,
    ArrowLeft, PackageSearch
} from "lucide-react";

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
import { Badge } from "@/components/ui/badge";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";

import { purchaseOrderSchema, PurchaseOrderFormValues } from "@/lib/schemas/procurement";
import { getSuppliers, updatePurchaseOrderAction, getPurchaseOrderById } from "@/lib/action/procurement";
import { getProjectsForSelect } from "@/lib/action/finance";
import { getMaterials } from "@/lib/action/catalog";
import { cn } from "@/lib/utils/utils";

// --- COMPONENT CON: COMBOBOX CHỌN VẬT TƯ (ĐÃ FIX FILTER) ---
function MaterialCombobox({
    materials,
    value,
    onSelect
}: {
    materials: any[],
    value: string,
    onSelect: (mat: any) => void
}) {
    const [open, setOpen] = useState(false);

    // Tìm vật tư hiện tại để hiển thị tên cho đẹp (thay vì hiển thị value thô)
    const selectedItem = materials.find(m => m.name === value);

    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal px-2 text-left h-auto py-2", !value && "text-muted-foreground")}
                    type="button"
                >
                    <div className="truncate flex-1">
                        {selectedItem ? (
                            <span className="flex flex-col text-left">
                                <span className="font-medium truncate">{selectedItem.name}</span>
                                <span className="text-[10px] text-muted-foreground truncate">
                                    {selectedItem.code} | {selectedItem.unit}
                                </span>
                            </span>
                        ) : (value || "🔍 Chọn hàng...")}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[400px] p-0" align="start">
                <Command filter={(value, search) => {
                    if (value.toLowerCase().includes(search.toLowerCase())) return 1;
                    return 0;
                }}>
                    <CommandInput placeholder="Gõ tên hoặc mã hàng..." />
                    <CommandList>
                        <CommandEmpty>Không tìm thấy.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {materials.map((mat) => (
                                <CommandItem
                                    key={mat.id}
                                    // 👇 FIX QUAN TRỌNG: Gộp Tên + Mã + ĐVT vào value để search cái nào cũng dính
                                    value={`${mat.name} ${mat.code} ${mat.unit}`}
                                    onSelect={() => {
                                        onSelect(mat);
                                        setOpen(false);
                                    }}
                                >
                                    <Check className={cn("mr-2 h-4 w-4", value === mat.name ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col">
                                        <span className="font-medium">{mat.name}</span>
                                        <span className="text-xs text-muted-foreground">Mã: {mat.code} | ĐVT: {mat.unit}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// --- TRANG CHÍNH ---
export default function EditPOPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [initializing, setInitializing] = useState(true);

    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);

    const [openProject, setOpenProject] = useState(false);
    const [openSupplier, setOpenSupplier] = useState(false);
    const [isTaxIncluded, setIsTaxIncluded] = useState(false);
    const [status, setStatus] = useState("draft");

    const form = useForm<PurchaseOrderFormValues>({
        resolver: zodResolver(purchaseOrderSchema),
        defaultValues: {
            code: "",
            project_id: "",
            supplier_id: "",
            notes: "",
            items: []
        }
    });

    const { fields, append, remove } = useFieldArray<PurchaseOrderFormValues>({
        control: form.control,
        name: "items"
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [s, p, m, po] = await Promise.all([
                    getSuppliers(),
                    getProjectsForSelect(),
                    getMaterials(),
                    getPurchaseOrderById(id)
                ]);

                setSuppliers(s);
                setProjects(p);
                setMaterials(m);

                if (po) {
                    form.reset({
                        code: po.code,
                        project_id: po.project_id,
                        supplier_id: po.supplier_id,
                        order_date: new Date(po.order_date),
                        notes: po.notes || "",
                        items: po.items.map((item: any) => ({
                            item_name: item.item_name,
                            unit: item.unit,
                            quantity: Number(item.quantity),
                            unit_price: Number(item.unit_price),
                            vat_rate: Number(item.vat_rate || 0)
                        }))
                    });
                    setStatus(po.status);
                } else {
                    toast.error("Không tìm thấy đơn hàng");
                    router.push("/procurement/orders");
                }
            } catch (error) {
                console.error(error);
                toast.error("Lỗi tải dữ liệu");
            } finally {
                setInitializing(false);
            }
        };

        fetchData();
    }, [id, form, router]);

    const items = form.watch("items");
    const totalAmount = items?.reduce((sum, item) => {
        const inputPrice = item.unit_price || 0;
        const qty = item.quantity || 0;
        const vat = item.vat_rate || 0;
        let finalPrice = isTaxIncluded ? (inputPrice * qty) : (inputPrice * (1 + vat / 100) * qty);
        return sum + finalPrice;
    }, 0) || 0;

    async function onSubmit(data: PurchaseOrderFormValues) {
        setLoading(true);
        const payload: any = { ...data, status };

        if (isTaxIncluded) {
            payload.items = data.items.map((item: any) => ({
                ...item,
                unit_price: item.unit_price / (1 + (item.vat_rate || 0) / 100)
            }));
        }

        const res = await updatePurchaseOrderAction(id, payload);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            router.push(`/procurement/orders/${id}`);
        } else {
            toast.error(res.error);
        }
    }

    const handleMaterialSelect = (index: number, mat: any) => {
        // Cập nhật giá trị vào form
        form.setValue(`items.${index}.item_name`, mat.name, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        form.setValue(`items.${index}.unit`, mat.unit, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
    };

    const selectedProject = projects.find(p => p.id === form.watch("project_id"));
    const selectedSupplier = suppliers.find(s => s.id === form.watch("supplier_id"));

    const getStatusBadge = (st: string) => {
        if (st === 'draft') return <Badge className="bg-orange-500 hover:bg-orange-600 border-none">Chờ xử lý</Badge>;
        if (st === 'ordered') return <Badge className="bg-blue-600 hover:bg-blue-700 border-none">Đã chốt đơn</Badge>;
        return <Badge variant="secondary">{st}</Badge>;
    }

    if (initializing) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-blue-600" /></div>;

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 max-w-[1400px] mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => router.back()} type="button">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h2 className="text-3xl font-bold tracking-tight">Chỉnh sửa Đơn hàng</h2>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    <Card className="border-l-4 border-l-blue-600 shadow-sm bg-blue-50/20">
                        <CardHeader className="py-4"><CardTitle className="text-base text-blue-800">Trạng thái xử lý hồ sơ</CardTitle></CardHeader>
                        <CardContent className="flex flex-col md:flex-row md:items-center gap-6 py-2 pb-6">
                            <div className="flex-1 space-y-2">
                                <p className="text-sm text-muted-foreground">Hiện tại: {getStatusBadge(status)}</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-sm font-medium">Chuyển thành:</span>
                                    <Select value={status} onValueChange={setStatus}>
                                        <SelectTrigger className="w-[280px] bg-white"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="draft">🟠 Chờ xử lý (Đang tìm giá)</SelectItem>
                                            <SelectItem value="ordered">🔵 Chốt đơn (Đã có NCC)</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader><CardTitle>Thông tin chung</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="code" render={({ field }) => (
                                <FormItem><FormLabel>Mã đơn hàng</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                            )} />
                            <FormField control={form.control} name="order_date" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Ngày lập đơn</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                    </Popover>
                                    <FormMessage /></FormItem>
                            )} />

                            <FormField control={form.control} name="project_id" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Dự án</FormLabel>
                                    <Popover open={openProject} onOpenChange={setOpenProject}>
                                        <PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>{field.value ? (selectedProject ? selectedProject.name : field.value) : "🔍 Tìm dự án..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start"><Command><CommandInput placeholder="Tìm dự án..." /><CommandList><CommandEmpty>Không tìm thấy.</CommandEmpty><CommandGroup>{projects.map((p) => (<CommandItem value={p.name} key={p.id} onSelect={() => { form.setValue("project_id", p.id); setOpenProject(false); }}><Check className={cn("mr-2 h-4 w-4", p.id === field.value ? "opacity-100" : "opacity-0")} />{p.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                                    </Popover>
                                    <FormMessage /></FormItem>
                            )} />

                            <FormField control={form.control} name="supplier_id" render={({ field }) => (
                                <FormItem className="flex flex-col"><FormLabel>Nhà cung cấp</FormLabel>
                                    <Popover open={openSupplier} onOpenChange={setOpenSupplier}>
                                        <PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between", !field.value && "text-muted-foreground")}>{field.value ? (selectedSupplier ? selectedSupplier.name : "Chưa chọn NCC") : "🔍 Tìm NCC..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger>
                                        <PopoverContent className="w-[400px] p-0" align="start"><Command><CommandInput placeholder="Tìm NCC..." /><CommandList><CommandEmpty>Không tìm thấy.</CommandEmpty><CommandGroup>{suppliers.map((s) => (<CommandItem value={s.name} key={s.id} onSelect={() => { form.setValue("supplier_id", s.id); setOpenSupplier(false); }}><Check className={cn("mr-2 h-4 w-4", s.id === field.value ? "opacity-100" : "opacity-0")} />{s.name}</CommandItem>))}</CommandGroup></CommandList></Command></PopoverContent>
                                    </Popover>
                                    <FormMessage /></FormItem>
                            )} />
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5" /> Chi tiết hàng hóa</CardTitle>
                            <div className="flex items-center space-x-2 bg-muted px-4 py-2 rounded-md border">
                                <Switch id="tax-mode" checked={isTaxIncluded} onCheckedChange={setIsTaxIncluded} />
                                <Label htmlFor="tax-mode" className="cursor-pointer font-medium">{isTaxIncluded ? "Giá SAU THUẾ" : "Giá TRƯỚC THUẾ"}</Label>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 sm:p-6">

                            {/* BẢNG RESPONSIVE: Scroll ngang khi màn hình nhỏ */}
                            <div className="overflow-x-auto w-full pb-4">
                                <Table className="min-w-[900px]">
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[300px] min-w-[250px]">Tên hàng hóa (Chọn từ danh mục)</TableHead>
                                            <TableHead className="w-[100px] min-w-[80px]">ĐVT</TableHead>
                                            <TableHead className="w-[100px] min-w-[80px]">SL</TableHead>
                                            <TableHead className="w-[120px] min-w-[100px]">VAT (%)</TableHead>
                                            <TableHead className="w-[180px] min-w-[150px]">Đơn giá {isTaxIncluded ? "(Có VAT)" : "(Gốc)"}</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {fields.map((field, index) => (
                                            <TableRow key={field.id}>
                                                <TableCell className="align-top">
                                                    <FormField control={form.control} name={`items.${index}.item_name`} render={({ field }) => (
                                                        <FormItem className="mb-0">
                                                            <FormControl>
                                                                <MaterialCombobox
                                                                    materials={materials}
                                                                    value={field.value}
                                                                    onSelect={(mat) => handleMaterialSelect(index, mat)}
                                                                />
                                                            </FormControl>
                                                        </FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (
                                                        <FormItem className="mb-0">
                                                            <FormControl><Input {...field} readOnly className="bg-slate-50 min-w-[60px]" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                                        <FormItem className="mb-0">
                                                            <FormControl><Input type="number" {...field} min={0} step={0.1} className="min-w-[70px]" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <FormField control={form.control} name={`items.${index}.vat_rate`} render={({ field }) => (
                                                        <FormItem className="mb-0">
                                                            <Select onValueChange={(val) => field.onChange(Number(val))} value={field.value?.toString()}>
                                                                <FormControl><SelectTrigger className="min-w-[80px]"><SelectValue placeholder="0%" /></SelectTrigger></FormControl>
                                                                <SelectContent>
                                                                    <SelectItem value="0">0%</SelectItem>
                                                                    <SelectItem value="5">5%</SelectItem>
                                                                    <SelectItem value="8">8%</SelectItem>
                                                                    <SelectItem value="10">10%</SelectItem>
                                                                </SelectContent>
                                                            </Select>
                                                        </FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <FormField control={form.control} name={`items.${index}.unit_price`} render={({ field }) => (
                                                        <FormItem className="mb-0">
                                                            <FormControl><Input type="number" {...field} min={0} className="min-w-[120px]" /></FormControl>
                                                        </FormItem>
                                                    )} />
                                                </TableCell>
                                                <TableCell className="align-top">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500">
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>

                            <div className="flex justify-end mt-4 p-4 bg-slate-50 rounded-lg">
                                <span className="text-xl font-bold text-blue-600">
                                    Tổng cộng: {new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalAmount)}
                                </span>
                            </div>

                            <Button type="button" variant="outline" size="sm" onClick={() => append({ item_name: "", unit: "", quantity: 1, unit_price: 0, vat_rate: 0 })} className="mt-4">
                                <Plus className="mr-2 h-4 w-4" /> Thêm dòng
                            </Button>
                        </CardContent>
                    </Card>

                    <Button type="submit" size="lg" className="w-full bg-blue-600 hover:bg-blue-700 h-12 text-lg" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Save className="mr-2 h-5 w-5" />}
                        {status === 'ordered' ? "Lưu & CHỐT ĐƠN HÀNG" : "Lưu Thay Đổi"}
                    </Button>

                </form>
            </Form>
        </div>
    );
}