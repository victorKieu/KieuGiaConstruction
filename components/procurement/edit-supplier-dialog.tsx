"use client";
import { useState, useEffect } from "react";
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
            name: supplier?.name || "",
            type: supplier?.type || "material",
            tax_code: supplier?.tax_code || "",
            phone: supplier?.phone || "",
            address: supplier?.address || "",
            contact_person: supplier?.contact_person || "",
            email: supplier?.email || ""
        }
    });

    // ✅ FIX LỖI: Buộc form nạp lại data mới mỗi khi prop `supplier` hoặc `open` thay đổi
    useEffect(() => {
        if (supplier && open) {
            form.reset({
                name: supplier.name || "",
                type: supplier.type || "material",
                tax_code: supplier.tax_code || "",
                phone: supplier.phone || "",
                address: supplier.address || "",
                contact_person: supplier.contact_person || "",
                email: supplier.email || ""
            });
        }
    }, [supplier, open, form]);

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

    // Helper class để phủ Dark Mode cho các thẻ Input
    const inputClass = "dark:bg-slate-950 dark:border-slate-800 dark:text-slate-100 transition-colors";

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="max-w-2xl dark:bg-slate-900 dark:border-slate-800 transition-colors">
                <DialogHeader>
                    <DialogTitle className="dark:text-slate-100">Cập nhật Nhà cung cấp</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="dark:text-slate-300">Tên Doanh Nghiệp <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input {...field} value={field.value || ""} className={inputClass} /></FormControl>
                                        <FormMessage className="dark:text-red-400" />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="md:col-span-1">
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="dark:text-slate-300">Phân loại</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className={inputClass}><SelectValue /></SelectTrigger>
                                            </FormControl>
                                            <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                                <SelectItem value="material" className="dark:text-slate-200">Vật liệu XD</SelectItem>
                                                <SelectItem value="furniture" className="dark:text-slate-200">Nội thất</SelectItem>
                                                <SelectItem value="equipment" className="dark:text-slate-200">Máy móc/Thiết bị</SelectItem>
                                                <SelectItem value="subcontractor" className="dark:text-slate-200">Nhà thầu phụ</SelectItem>
                                                <SelectItem value="service" className="dark:text-slate-200">Dịch vụ/Khác</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="dark:text-red-400" />
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="tax_code" render={({ field }) => (
                                <FormItem><FormLabel className="dark:text-slate-300">Mã số thuế</FormLabel><FormControl><Input {...field} value={field.value || ""} className={inputClass} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="contact_person" render={({ field }) => (
                                <FormItem><FormLabel className="dark:text-slate-300">Người liên hệ</FormLabel><FormControl><Input {...field} value={field.value || ""} className={inputClass} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="phone" render={({ field }) => (
                                <FormItem><FormLabel className="dark:text-slate-300">Điện thoại</FormLabel><FormControl><Input {...field} value={field.value || ""} className={inputClass} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="email" render={({ field }) => (
                                <FormItem><FormLabel className="dark:text-slate-300">Email</FormLabel><FormControl><Input {...field} type="email" value={field.value || ""} className={inputClass} /></FormControl><FormMessage className="dark:text-red-400" /></FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel className="dark:text-slate-300">Địa chỉ</FormLabel><FormControl><Input {...field} value={field.value || ""} className={inputClass} /></FormControl></FormItem>
                        )} />

                        <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors">
                                Hủy bỏ
                            </Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[130px] transition-colors" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Lưu thay đổi</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}