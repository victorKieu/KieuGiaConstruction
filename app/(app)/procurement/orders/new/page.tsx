"use client";

import { useState, useEffect, Suspense } from "react"; // Thêm Suspense
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation"; // Import useSearchParams
import { format } from "date-fns";
import { toast } from "sonner";
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
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

import { purchaseOrderSchema, PurchaseOrderFormValues } from "@/lib/schemas/procurement";
import { getSuppliers, createPurchaseOrderAction, getMaterialRequestForPO } from "@/lib/action/procurement"; // Import hàm mới
import { getProjectsForSelect } from "@/lib/action/finance";
import { getMaterials } from "@/lib/action/catalog";
import { cn } from "@/lib/utils/utils";

// Tách Form ra component con để bọc Suspense (bắt buộc với useSearchParams trong Next.js mới)
function CreatePOForm() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const requestId = searchParams.get("requestId"); // Lấy ID từ URL

    const [loading, setLoading] = useState(false);
    const [isFetchingRequest, setIsFetchingRequest] = useState(false);

    // Data State
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [materials, setMaterials] = useState<any[]>([]);

    // UI State
    const [openProject, setOpenProject] = useState(false);
    const [openSupplier, setOpenSupplier] = useState(false);
    const [openMaterialIndex, setOpenMaterialIndex] = useState<number | null>(null);
    const [isTaxIncluded, setIsTaxIncluded] = useState(false);

    // 1. Setup Form
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

    const { fields, append, remove, replace } = useFieldArray<PurchaseOrderFormValues>({
        control: form.control,
        name: "items"
    });

    // 2. Load Master Data & Request Data
    useEffect(() => {
        const loadMasterData = async () => {
            const [s, p, m] = await Promise.all([getSuppliers(), getProjectsForSelect(), getMaterials()]);
            setSuppliers(s);
            setProjects(p);
            setMaterials(m);
        };
        loadMasterData();
    }, []);

    // ✅ EFFECT QUAN TRỌNG: Load dữ liệu từ Request nếu có requestId
    useEffect(() => {
        const loadRequestData = async () => {
            if (!requestId) return;

            setIsFetchingRequest(true);
            const data = await getMaterialRequestForPO(requestId);

            if (data) {
                // Fill Project ID
                form.setValue("project_id", data.projectId);

                // Fill Items (nếu có item cần mua)
                if (data.items.length > 0) {
                    // Dùng replace để thay thế toàn bộ dòng mặc định bằng items từ request
                    replace(data.items.map(item => ({
                        item_name: item.item_name,
                        unit: item.unit,
                        quantity: item.quantity,
                        unit_price: 0,
                        vat_rate: 0
                    })));
                    toast.success("Đã tải dữ liệu từ Phiếu yêu cầu");
                } else {
                    toast.info("Phiếu này đã được đặt hàng hết.");
                }
            }
            setIsFetchingRequest(false);
        };

        loadRequestData();
    }, [requestId, form, replace]);


    // 3. Submit Logic
    async function onSubmit(data: PurchaseOrderFormValues) {
        setLoading(true);
        const payload = { ...data };

        // Xử lý giá có thuế
        if (isTaxIncluded) {
            payload.items = data.items.map(item => ({
                ...item,
                unit_price: item.unit_price / (1 + (item.vat_rate || 0) / 100)
            }));
        }

        // Nếu có requestId, truyền thêm logic (nếu cần xử lý status request bên server)
        // Hiện tại server action createPurchaseOrderAction chưa nhận requestId để update status request
        // Nếu cần update status request -> ordered, ta cần sửa lại action create một chút hoặc tạo action riêng.
        // Tạm thời tạo PO bình thường.

        const res = await createPurchaseOrderAction(payload);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            router.push("/procurement/orders");
        } else {
            toast.error(res.error);
        }
    }

    // Helper calculate total
    const items = form.watch("items");
    const totalAmount = items.reduce((sum, item) => {
        const inputPrice = item.unit_price || 0;
        const qty = item.quantity || 0;
        const vat = item.vat_rate || 0;
        let finalPrice = isTaxIncluded ? (inputPrice * qty) : (inputPrice * (1 + vat / 100) * qty);
        return sum + finalPrice;
    }, 0);

    const selectedProject = projects.find(p => p.id === form.watch("project_id"));
    const selectedSupplier = suppliers.find(s => s.id === form.watch("supplier_id"));

    if (isFetchingRequest) {
        return <div className="flex justify-center items-center h-64"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /> <span className="ml-2">Đang tải thông tin yêu cầu...</span></div>;
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                {/* 1. THÔNG TIN CHUNG */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="bg-slate-50 border-b py-4"><CardTitle className="text-base font-semibold text-slate-700">Thông tin đơn hàng</CardTitle></CardHeader>
                    <CardContent className="grid grid-cols-2 gap-6 p-6">
                        <FormField control={form.control} name="code" render={({ field }) => (
                            <FormItem><FormLabel>Mã đơn hàng</FormLabel><FormControl><Input {...field} className="font-mono font-bold" /></FormControl><FormMessage /></FormItem>
                        )} />

                        <FormField control={form.control} name="order_date" render={({ field }) => (
                            <FormItem className="flex flex-col"><FormLabel>Ngày đặt hàng</FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>{field.value ? format(field.value, "dd/MM/yyyy") : <span>Chọn ngày</span>}<CalendarIcon className="ml-auto h-4 w-4 opacity-50" /></Button></FormControl></PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start"><Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus /></PopoverContent>
                                </Popover>
                                <FormMessage /></FormItem>
                        )} />

                        {/* PROJECT SELECT */}
                        <FormField control={form.control} name="project_id" render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Dự án / Công trình</FormLabel>
                                <Popover open={openProject} onOpenChange={setOpenProject}>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" role="combobox" aria-expanded={openProject} className={cn("w-full justify-between h-auto py-3", !field.value && "text-muted-foreground")}>
                                                {field.value && selectedProject ? (
                                                    <div className="flex flex-col items-start text-left gap-0.5 overflow-hidden">
                                                        <span className="font-semibold leading-tight">{selectedProject.name}</span>
                                                        <span className="text-xs text-muted-foreground">Mã: {selectedProject.code}</span>
                                                    </div>
                                                ) : "🔍 Tìm dự án..."}
                                                <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[400px] p-0" align="start">
                                        <Command>
                                            <CommandInput placeholder="Tìm dự án..." />
                                            <CommandList>
                                                <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                                <CommandGroup>
                                                    {projects.map((project) => (
                                                        <CommandItem value={`${project.name} ${project.code}`} key={project.id} onSelect={() => { form.setValue("project_id", project.id); setOpenProject(false); }} className="cursor-pointer border-b last:border-0">
                                                            <Check className={cn("mr-2 h-4 w-4 mt-1 self-start", project.id === field.value ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col"><span className="font-medium">{project.name}</span><span className="text-xs text-muted-foreground">Mã: {project.code}</span></div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />

                        {/* SUPPLIER SELECT */}
                        <FormField control={form.control} name="supplier_id" render={({ field }) => (
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
                                            <CommandInput placeholder="Tìm NCC..." />
                                            <CommandList>
                                                <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                                <CommandGroup>
                                                    {suppliers.map((supplier) => (
                                                        <CommandItem value={`${supplier.name} ${supplier.tax_code}`} key={supplier.id} onSelect={() => { form.setValue("supplier_id", supplier.id); setOpenSupplier(false); }}>
                                                            <Check className={cn("mr-2 h-4 w-4", supplier.id === field.value ? "opacity-100" : "opacity-0")} />
                                                            <div className="flex flex-col"><span>{supplier.name}</span><span className="text-xs text-muted-foreground">MST: {supplier.tax_code}</span></div>
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                </Card>

                {/* 2. ITEM TABLE */}
                <Card className="shadow-sm border-slate-200">
                    <CardHeader className="flex flex-row items-center justify-between bg-slate-50 border-b py-3">
                        <CardTitle className="text-base font-semibold text-slate-700">Chi tiết Vật tư</CardTitle>
                        <div className="flex items-center space-x-2 bg-white px-3 py-1.5 rounded-md border text-sm shadow-sm">
                            <Switch id="tax-mode" checked={isTaxIncluded} onCheckedChange={setIsTaxIncluded} />
                            <Label htmlFor="tax-mode" className="cursor-pointer font-medium text-slate-600">{isTaxIncluded ? "Giá có VAT" : "Giá chưa VAT"}</Label>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-white">
                                    <TableHead className="w-[35%] pl-6">Tên vật tư</TableHead>
                                    <TableHead className="w-[10%]">ĐVT</TableHead>
                                    <TableHead className="w-[10%]">SL</TableHead>
                                    <TableHead className="w-[15%]">VAT (%)</TableHead>
                                    <TableHead className="w-[20%] text-right">{isTaxIncluded ? "Đơn giá (Có VAT)" : "Đơn giá (Chưa VAT)"}</TableHead>
                                    <TableHead className="w-[5%]"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map((field, index) => (
                                    <TableRow key={field.id} className="hover:bg-slate-50">
                                        <TableCell className="pl-6">
                                            <FormField control={form.control} name={`items.${index}.item_name`} render={({ field }) => (
                                                <FormItem className="flex flex-col">
                                                    <Popover open={openMaterialIndex === index} onOpenChange={(isOpen) => setOpenMaterialIndex(isOpen ? index : null)}>
                                                        <PopoverTrigger asChild><FormControl><Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>{field.value || "Chọn vật tư..."}<ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" /></Button></FormControl></PopoverTrigger>
                                                        <PopoverContent className="w-[400px] p-0" align="start">
                                                            <Command>
                                                                <CommandInput placeholder="Tìm vật tư..." />
                                                                <CommandList>
                                                                    <CommandEmpty>Không tìm thấy.</CommandEmpty>
                                                                    <CommandGroup>
                                                                        {materials.map((mat) => (
                                                                            <CommandItem key={mat.id} value={mat.name} onSelect={() => { form.setValue(`items.${index}.item_name`, mat.name); if (mat.unit) form.setValue(`items.${index}.unit`, mat.unit); setOpenMaterialIndex(null); }}>
                                                                                <Check className={cn("mr-2 h-4 w-4", mat.name === field.value ? "opacity-100" : "opacity-0")} />
                                                                                <div className="flex flex-col"><span>{mat.name}</span><span className="text-[10px] text-muted-foreground">ĐVT: {mat.unit}</span></div>
                                                                            </CommandItem>
                                                                        ))}
                                                                    </CommandGroup>
                                                                </CommandList>
                                                            </Command>
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage />
                                                </FormItem>
                                            )} />
                                        </TableCell>
                                        <TableCell><FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (<FormControl><Input {...field} className="bg-slate-50" /></FormControl>)} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (<FormControl><Input type="number" {...field} min={0} className="text-right font-bold" /></FormControl>)} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`items.${index}.vat_rate`} render={({ field }) => (<Select onValueChange={(val) => field.onChange(Number(val))} defaultValue={field.value?.toString()}><FormControl><SelectTrigger><SelectValue placeholder="0%" /></SelectTrigger></FormControl><SelectContent><SelectItem value="0">0%</SelectItem><SelectItem value="5">5%</SelectItem><SelectItem value="8">8%</SelectItem><SelectItem value="10">10%</SelectItem></SelectContent></Select>)} /></TableCell>
                                        <TableCell><FormField control={form.control} name={`items.${index}.unit_price`} render={({ field }) => (<FormControl><Input type="number" {...field} min={0} className="text-right" /></FormControl>)} /></TableCell>
                                        <TableCell><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-slate-400 hover:text-red-600"><Trash2 className="h-4 w-4" /></Button></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>

                        {/* FOOTER SUMMARY */}
                        <div className="flex flex-col items-end justify-end p-6 bg-slate-50/50 border-t">
                            <div className="flex items-center justify-between w-full max-w-[350px] mb-2">
                                <span className="text-sm font-medium text-slate-500">Tổng tiền hàng:</span>
                                <span className="text-lg font-bold text-slate-800">{new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(totalAmount)}</span>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-white">
                            <Button type="button" variant="outline" size="sm" onClick={() => append({ item_name: "", unit: "", quantity: 1, unit_price: 0, vat_rate: 0 })} className="text-blue-600 border-blue-200 hover:bg-blue-50"><Plus className="mr-2 h-4 w-4" /> Thêm dòng</Button>
                        </div>
                    </CardContent>
                </Card>

                <Button type="submit" size="lg" className="w-full bg-blue-600 hover:bg-blue-700 shadow-lg" disabled={loading}>
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Lưu Đơn Mua Hàng
                </Button>
            </form>
        </Form>
    );
}

// MAIN PAGE EXPORT
export default function CreatePOPage() {
    return (
        <div className="flex-1 space-y-4 p-8 pt-6 max-w-6xl mx-auto animate-in fade-in duration-500">
            <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold tracking-tight text-slate-800">Tạo Đơn Mua Hàng (PO)</h2>
            </div>
            {/* Suspense bao bọc Form để dùng được useSearchParams */}
            <Suspense fallback={<div className="text-center py-10">Đang tải...</div>}>
                <CreatePOForm />
            </Suspense>
        </div>
    );
}