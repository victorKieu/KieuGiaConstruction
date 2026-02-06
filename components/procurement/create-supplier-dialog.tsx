"use client";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supplierSchema, SupplierFormValues } from "@/lib/schemas/procurement";
import { createSupplierAction } from "@/lib/action/procurement";

export function CreateSupplierDialog() {
    const [open, setOpen] = useState(false);
    const [loading, setLoading] = useState(false);

    // 1. Khai báo Default Values chuẩn
    const defaultValues: SupplierFormValues = {
        name: "",
        type: "material", // Giá trị mặc định cho Select
        tax_code: "",
        phone: "",
        address: "",
        contact_person: "",
        email: ""
    };

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema),
        defaultValues: defaultValues,
        mode: "onChange" // Validate ngay khi nhập
    });

    // 2. Log kiểm tra khi Form Reset hoặc Mở lại Dialog
    useEffect(() => {
        if (open) {
            console.log("🟢 Dialog mở. Giá trị form hiện tại:", form.getValues());
            // Nếu form.getValues() trả về undefined ở field nào đó -> Lỗi tại defaultValues
            const currentValues = form.getValues();
            Object.keys(defaultValues).forEach((key) => {
                // @ts-ignore
                if (currentValues[key] === undefined) {
                    console.error(`🚨 CẢNH BÁO: Field '${key}' đang là undefined ngay khi mở form!`);
                }
            });
        } else {
            form.reset(defaultValues); // Reset về chuẩn khi đóng
        }
    }, [open, form]);

    async function onSubmit(data: SupplierFormValues) {
        console.log("Submitting data:", data); // Log data gửi đi
        setLoading(true);
        const res = await createSupplierAction(data);
        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            setOpen(false);
            form.reset(defaultValues); // Reset cứng
        } else {
            toast.error(res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Thêm NCC</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Thêm Nhà cung cấp mới</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">

                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => {
                                        // 🔍 LOG KIỂM TRA TỪNG FIELD
                                        if (field.value === undefined) console.error(`🚨 LỖI RENDER: Field 'name' bị undefined`);

                                        return (
                                            <FormItem>
                                                <FormLabel>Tên Doanh Nghiệp <span className="text-red-500">*</span></FormLabel>
                                                <FormControl>
                                                    <Input {...field} value={field.value ?? ""} placeholder="Nhập tên công ty..." />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                            </div>

                            <div className="col-span-1">
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => {
                                        if (field.value === undefined) console.error(`🚨 LỖI RENDER: Field 'type' bị undefined`);
                                        return (
                                            <FormItem>
                                                <FormLabel>Phân loại <span className="text-red-500">*</span></FormLabel>
                                                <Select onValueChange={field.onChange} value={field.value ?? "material"}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Chọn loại" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="material">Vật liệu XD</SelectItem>
                                                        <SelectItem value="furniture">Nội thất</SelectItem>
                                                        <SelectItem value="equipment">Máy móc/Thiết bị</SelectItem>
                                                        <SelectItem value="subcontractor">Nhà thầu phụ</SelectItem>
                                                        <SelectItem value="service">Dịch vụ/Khác</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        );
                                    }}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="tax_code" render={({ field }) => {
                                if (field.value === undefined) console.error(`🚨 LỖI RENDER: Field 'tax_code' bị undefined`);
                                return (
                                    <FormItem><FormLabel>Mã số thuế</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                );
                            }} />
                            <FormField control={form.control} name="contact_person" render={({ field }) => {
                                if (field.value === undefined) console.error(`🚨 LỖI RENDER: Field 'contact_person' bị undefined`);
                                return (
                                    <FormItem><FormLabel>Người liên hệ</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                );
                            }} />
                            <FormField control={form.control} name="phone" render={({ field }) => {
                                if (field.value === undefined) console.error(`🚨 LỖI RENDER: Field 'phone' bị undefined`);
                                return (
                                    <FormItem><FormLabel>Điện thoại</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                );
                            }} />
                            <FormField control={form.control} name="email" render={({ field }) => {
                                if (field.value === undefined) console.error(`🚨 LỖI RENDER: Field 'email' bị undefined`);
                                return (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                                );
                            }} />
                        </div>

                        <FormField control={form.control} name="address" render={({ field }) => {
                            if (field.value === undefined) console.error(`🚨 LỖI RENDER: Field 'address' bị undefined`);
                            return (
                                <FormItem><FormLabel>Địa chỉ</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                            );
                        }} />

                        <Button type="submit" className="w-full" disabled={loading}>
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Lưu thông tin
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}