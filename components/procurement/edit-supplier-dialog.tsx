"use client";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supplierSchema, SupplierFormValues } from "@/lib/schemas/procurement";
import { updateSupplierAction } from "@/lib/action/procurement";

// ✅ Đổi tên prop setOpen thành setOpenAction để thỏa mãn Next.js serializability
export function EditSupplierDialog({ supplier, open, setOpenAction }: { supplier: any, open: boolean, setOpenAction: (v: boolean) => void }) {

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
        const res = await updateSupplierAction(supplier.id, data);
        if (res.success) {
            toast.success(res.message);
            setOpenAction(false);
        } else {
            toast.error(res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpenAction}>
            <DialogContent className="max-w-2xl bg-background border-border">
                <DialogHeader>
                    <DialogTitle>Cập nhật Nhà cung cấp</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Tên Doanh Nghiệp <span className="text-red-500">*</span></FormLabel>
                                        <FormControl><Input {...field} value={field.value || ""} /></FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="md:col-span-1">
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phân loại</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger><SelectValue /></SelectTrigger>
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
                                )} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="tax_code" render={({ field }) => (
                                <FormItem><FormLabel>Mã số thuế</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                            )} />
                            <FormField control={form.control} name="contact_person" render={({ field }) => (
                                <FormItem><FormLabel>Người liên hệ</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="address" render={({ field }) => (
                            <FormItem><FormLabel>Địa chỉ</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl></FormItem>
                        )} />

                        <div className="pt-4 border-t border-border flex justify-end gap-2">
                            <Button type="button" variant="outline" onClick={() => setOpenAction(false)}>Hủy bỏ</Button>
                            <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white min-w-[130px]">
                                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Lưu thay đổi</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}