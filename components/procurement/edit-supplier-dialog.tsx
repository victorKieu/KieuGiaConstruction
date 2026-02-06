"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Edit, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supplierSchema, SupplierFormValues } from "@/lib/schemas/procurement";
import { updateSupplierAction } from "@/lib/action/procurement";

export function EditSupplierDialog({ supplier, open, setOpen }: { supplier: any, open: boolean, setOpen: (v: boolean) => void }) {
    const [loading, setLoading] = useState(false);

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            name: supplier.name || "",
            type: supplier.type || "material",
            tax_code: supplier.tax_code || "",
            phone: supplier.phone || "",
            address: supplier.address || "",
            contact_person: supplier.contact_person || "",
            email: supplier.email || ""
        }
    });

    async function onSubmit(data: SupplierFormValues) {
        setLoading(true);
        const res = await updateSupplierAction(supplier.id, data);
        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            setOpen(false);
        } else {
            toast.error(res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-2xl">
                <DialogHeader><DialogTitle>Cập nhật Nhà cung cấp</DialogTitle></DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-3 gap-4">
                            <div className="col-span-2">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem><FormLabel>Tên Doanh Nghiệp <span className="text-red-500">*</span></FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                                )} />
                            </div>
                            <div className="col-span-1">
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem><FormLabel>Phân loại</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="material">Vật liệu XD</SelectItem>
                                                <SelectItem value="furniture">Nội thất</SelectItem>
                                                <SelectItem value="equipment">Máy móc/Thiết bị</SelectItem>
                                                <SelectItem value="subcontractor">Nhà thầu phụ</SelectItem>
                                                <SelectItem value="service">Dịch vụ/Khác</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage /></FormItem>
                                )} />
                            </div>
                        </div>
                        {/* Các field khác giữ nguyên như Create */}
                        <div className="grid grid-cols-2 gap-4">
                            <FormField control={form.control} name="tax_code" render={({ field }) => (<FormItem><FormLabel>Mã số thuế</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="contact_person" render={({ field }) => (<FormItem><FormLabel>Người liên hệ</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="phone" render={({ field }) => (<FormItem><FormLabel>Điện thoại</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>)} />
                            <FormField control={form.control} name="email" render={({ field }) => (<FormItem><FormLabel>Email</FormLabel><FormControl><Input {...field} type="email" value={field.value || ""} /></FormControl><FormMessage /></FormItem>)} />
                        </div>
                        <FormField control={form.control} name="address" render={({ field }) => (<FormItem><FormLabel>Địa chỉ</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>)} />

                        <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={loading}>
                            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Lưu thay đổi</>}
                        </Button>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}