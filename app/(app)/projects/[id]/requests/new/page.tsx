"use client";

import { useState, useEffect, use } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import { CalendarIcon, Plus, Trash2, Save, Loader2, ArrowLeft, Check, ChevronsUpDown, PackageSearch } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils/utils";

import { materialRequestSchema, MaterialRequestFormValues } from "@/lib/schemas/request";
import { createMaterialRequestAction, getProjectWarehouses } from "@/lib/action/requestActions";
import { getMaterials } from "@/lib/action/catalog"; // <--- Import hàm lấy danh mục

export default function CreateRequestPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: projectId } = use(params);

    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [warehouses, setWarehouses] = useState<any[]>([]);

    // State lưu danh mục vật tư để chọn
    const [materials, setMaterials] = useState<any[]>([]);

    // State quản lý việc mở Combobox cho từng dòng
    const [openCombobox, setOpenCombobox] = useState<Record<number, boolean>>({});

    const form = useForm<MaterialRequestFormValues>({
        resolver: zodResolver(materialRequestSchema),
        defaultValues: {
            code: `MR-${format(new Date(), "yyyyMMdd")}-${Math.floor(Math.random() * 1000)}`,
            project_id: projectId,
            destination_warehouse_id: "",
            deadline_date: undefined,
            priority: "normal",
            notes: "",
            items: [{ item_name: "", unit: "", quantity: 1, notes: "" }]
        }
    });

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    });

    // Load dữ liệu
    useEffect(() => {
        // 1. Load Kho
        getProjectWarehouses(projectId).then((data) => {
            setWarehouses(data);
            if (data.length === 1) form.setValue("destination_warehouse_id", data[0].id);
        });

        // 2. Load Danh mục Vật tư
        getMaterials().then(setMaterials);
    }, [projectId, form]);

    async function onSubmit(data: MaterialRequestFormValues) {
        setLoading(true);
        const res = await createMaterialRequestAction(data);
        setLoading(false);

        if (res.success) {
            toast.success(res.message);
            router.push(`/projects/${projectId}`);
        } else {
            toast.error(res.error);
        }
    }

    // Hàm chọn vật tư từ danh sách
    const handleSelectMaterial = (index: number, material: any) => {
        // 1. Điền tên
        form.setValue(`items.${index}.item_name`, material.name);
        // 2. Tự động điền ĐVT chuẩn
        form.setValue(`items.${index}.unit`, material.unit);
        // 3. Nếu có thông số kỹ thuật, điền vào ghi chú luôn cho tiện
        if (material.specs) {
            form.setValue(`items.${index}.notes`, material.specs);
        }
        // 4. Đóng combobox
        setOpenCombobox(prev => ({ ...prev, [index]: false }));
    };

    return (
        <div className="flex-1 space-y-4 p-8 pt-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-2 mb-6">
                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Tạo Yêu Cầu Vật Tư</h2>
                    <p className="text-muted-foreground">Đề xuất mua sắm dựa trên Danh mục chuẩn.</p>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                    {/* A. THÔNG TIN CHUNG */}
                    <Card>
                        <CardHeader><CardTitle>Thông tin phiếu</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="code" render={({ field }) => (
                                <FormItem><FormLabel>Mã phiếu</FormLabel><FormControl><Input {...field} readOnly className="bg-muted" /></FormControl><FormMessage /></FormItem>
                            )} />

                            <FormField control={form.control} name="destination_warehouse_id" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nhập về kho nào? <span className="text-red-500">*</span></FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Chọn kho..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {warehouses.length === 0 ? (
                                                <div className="p-2 text-sm text-muted-foreground">Dự án chưa có kho</div>
                                            ) : (
                                                warehouses.map(w => <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
                                                ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="deadline_date" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel>Cần hàng trước ngày <span className="text-red-500">*</span></FormLabel>
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
                                    <FormItem><FormLabel>Ghi chú / Diễn giải</FormLabel><FormControl><Textarea {...field} placeholder="VD: Phục vụ đổ bê tông sàn tầng 2..." /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                        </CardContent>
                    </Card>

                    {/* B. DANH SÁCH VẬT TƯ (CÓ COMBOBOX) */}
                    <Card>
                        <CardHeader><CardTitle className="flex items-center gap-2"><PackageSearch className="h-5 w-5" /> Danh sách vật tư cần mua</CardTitle></CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[40%]">Tên vật tư (Chọn từ danh mục)</TableHead>
                                        <TableHead className="w-[15%]">ĐVT</TableHead>
                                        <TableHead className="w-[15%]">Số lượng</TableHead>
                                        <TableHead className="w-[25%]">Ghi chú kỹ thuật</TableHead>
                                        <TableHead className="w-[5%]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fields.map((field, index) => (
                                        <TableRow key={field.id}>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.item_name`} render={({ field }) => (
                                                    <FormItem className="flex flex-col">
                                                        <Popover open={openCombobox[index]} onOpenChange={(val) => setOpenCombobox(prev => ({ ...prev, [index]: val }))}>
                                                            <PopoverTrigger asChild>
                                                                <FormControl>
                                                                    <Button variant="outline" role="combobox" className={cn("w-full justify-between font-normal", !field.value && "text-muted-foreground")}>
                                                                        {field.value || "🔍 Tìm vật tư..."}
                                                                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                                                    </Button>
                                                                </FormControl>
                                                            </PopoverTrigger>
                                                            <PopoverContent className="w-[400px] p-0" align="start">
                                                                <Command>
                                                                    <CommandInput placeholder="Gõ tên vật tư hoặc mã..." />
                                                                    <CommandList>
                                                                        <CommandEmpty>Không tìm thấy. <span className="text-xs text-muted-foreground">Vui lòng báo Admin thêm vào danh mục.</span></CommandEmpty>
                                                                        <CommandGroup>
                                                                            {materials.map((mat) => (
                                                                                <CommandItem
                                                                                    value={mat.name} // Tìm theo tên
                                                                                    key={mat.id}
                                                                                    onSelect={() => handleSelectMaterial(index, mat)}
                                                                                >
                                                                                    <Check className={cn("mr-2 h-4 w-4", mat.name === field.value ? "opacity-100" : "opacity-0")} />
                                                                                    <div className="flex flex-col">
                                                                                        <span>{mat.name}</span>
                                                                                        <span className="text-xs text-muted-foreground">Mã: {mat.code} | ĐVT: {mat.unit}</span>
                                                                                    </div>
                                                                                </CommandItem>
                                                                            ))}
                                                                        </CommandGroup>
                                                                    </CommandList>
                                                                </Command>
                                                            </PopoverContent>
                                                        </Popover>
                                                    </FormItem>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.unit`} render={({ field }) => (
                                                    <FormControl><Input {...field} readOnly className="bg-slate-50" /></FormControl> // Readonly để tránh sửa ĐVT lung tung
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.quantity`} render={({ field }) => (
                                                    <FormControl><Input type="number" {...field} min={0} step={0.1} /></FormControl>
                                                )} />
                                            </TableCell>
                                            <TableCell>
                                                <FormField control={form.control} name={`items.${index}.notes`} render={({ field }) => (
                                                    <FormControl><Input {...field} placeholder="Chi tiết thêm..." /></FormControl>
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
                        Gửi Yêu Cầu (Theo Danh Mục)
                    </Button>

                </form>
            </Form>
        </div>
    );
}