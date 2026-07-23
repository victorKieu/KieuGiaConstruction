"use client";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, Save, Building2, Contact, Landmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supplierSchema, SupplierFormValues } from "@/lib/schemas/procurement";
import { updateSupplierAction } from "@/lib/action/procurement";

export function EditSupplierDialog({
    supplier,
    open,
    setOpenAction,
    supplierTypes
}: {
    supplier: any,
    open: boolean,
    setOpenAction: (v: boolean) => void,
    supplierTypes: any[]
}) {
    const [loading, setLoading] = useState(false);

    const form = useForm<SupplierFormValues>({
        resolver: zodResolver(supplierSchema),
        defaultValues: {
            code: supplier?.code || "",
            name: supplier?.name || "",
            type: supplier?.type || supplierTypes[0]?.code || "material",
            tax_code: supplier?.tax_code || "",
            phone: supplier?.phone || "",
            address: supplier?.address || "",
            contact_person: supplier?.contact_person || "",
            email: supplier?.email || "",
            bank_account: supplier?.bank_account || "",
            bank_name: supplier?.bank_name || "",
            bank_account_name: supplier?.bank_account_name || "",
            rating: supplier?.rating || "C",
            status: supplier?.status || "active",
        }
    });

    useEffect(() => {
        if (supplier && open) {
            form.reset({
                code: supplier.code || "",
                name: supplier.name || "",
                type: supplier.type || supplierTypes[0]?.code || "material",
                tax_code: supplier.tax_code || "",
                phone: supplier.phone || "",
                address: supplier.address || "",
                contact_person: supplier.contact_person || "",
                email: supplier.email || "",
                bank_account: supplier.bank_account || "",
                bank_name: supplier.bank_name || "",
                rating: supplier.rating || "C",
                status: supplier.status || "active",
            });
        }
    }, [supplier, open, form, supplierTypes]);

    async function onSubmit(data: SupplierFormValues) {
        setLoading(true);
        const res = await updateSupplierAction(supplier.id, data);
        setLoading(false);
        if (res.success) {
            toast.success(res.message);
            setOpenAction(false);
        } else {
            toast.error(res.error);
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpenAction}>
            <DialogContent className="bg-background border-border max-h-[90vh] max-w-4xl overflow-y-auto">
                <DialogHeader><DialogTitle className="flex items-center gap-2 text-xl"><Building2 className="h-5 w-5 text-blue-600 dark:text-blue-400" /> Cập nhật hồ sơ Nhà Cung Cấp</DialogTitle></DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 pt-4">

                        <div className="space-y-4">
                            <h3 className="flex items-center text-sm font-bold text-slate-800 uppercase dark:text-slate-200"><Building2 className="mr-2 h-4 w-4" /> Thông tin chung</h3>
                            <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-100 bg-slate-50/50 p-4 md:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/50">
                                <FormField control={form.control} name="code" render={({ field }) => (
                                    <FormItem><FormLabel>Mã NCC</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                )} />
                                <div className="md:col-span-3">
                                    <FormField control={form.control} name="name" render={({ field }) => (
                                        <FormItem><FormLabel>Tên Doanh Nghiệp <span className="text-red-500">*</span></FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                                    )} />
                                </div>

                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Phân loại mảng</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? supplierTypes[0]?.code ?? ""}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                {supplierTypes.map((type) => (
                                                    <SelectItem key={type.code} value={type.code}>
                                                        {type.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="rating" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Hạng năng lực (Bidding)</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? "C"}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="A">Hạng A (Ưu tiên Cao)</SelectItem>
                                                <SelectItem value="B">Hạng B (Đạt yêu cầu)</SelectItem>
                                                <SelectItem value="C">Hạng C (Cần theo dõi)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="status" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Trạng thái</FormLabel>
                                        <Select onValueChange={field.onChange} value={field.value ?? "active"}>
                                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="active">Đang giao dịch</SelectItem>
                                                <SelectItem value="inactive">Ngừng giao dịch</SelectItem>
                                                <SelectItem value="blacklist">Blacklist (Cấm thầu)</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </FormItem>
                                )} />
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="flex items-center text-sm font-bold text-slate-800 uppercase dark:text-slate-200"><Landmark className="mr-2 h-4 w-4" /> Kế toán & Tài chính</h3>
                            <div className="space-y-4">
                                <h3 className="flex items-center text-sm font-bold text-slate-800 uppercase dark:text-slate-200"><Landmark className="mr-2 h-4 w-4" /> Kế toán & Tài chính</h3>
                                {/* Đổi thành grid-cols-4 để chứa đủ 4 trường */}
                                <div className="grid grid-cols-1 gap-4 rounded-lg border border-blue-50 bg-blue-50/30 p-4 md:grid-cols-4 dark:border-blue-900/30 dark:bg-blue-900/10">
                                    <FormField control={form.control} name="tax_code" render={({ field }) => (
                                        <FormItem><FormLabel>Mã số thuế</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="bank_name" render={({ field }) => (
                                        <FormItem><FormLabel>Ngân hàng</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="VD: Vietcombank" /></FormControl></FormItem>
                                    )} />
                                    <FormField control={form.control} name="bank_account" render={({ field }) => (
                                        <FormItem><FormLabel>Số tài khoản</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                    )} />
                                    {/* TRƯỜNG MỚI THÊM VÀO */}
                                    <FormField control={form.control} name="bank_account_name" render={({ field }) => (
                                        <FormItem><FormLabel>Tên tài khoản</FormLabel><FormControl><Input {...field} value={field.value ?? ""} placeholder="VD: CONG TY TNHH ABC" className="uppercase" /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <h3 className="flex items-center text-sm font-bold text-slate-800 uppercase dark:text-slate-200"><Contact className="mr-2 h-4 w-4" /> Thông tin Liên hệ & Địa chỉ</h3>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <FormField control={form.control} name="contact_person" render={({ field }) => (
                                    <FormItem><FormLabel>Người đại diện</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel>Điện thoại</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                )} />
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>
                                )} />
                                <div className="md:col-span-3">
                                    <FormField control={form.control} name="address" render={({ field }) => (
                                        <FormItem><FormLabel>Địa chỉ xuất hóa đơn</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl></FormItem>
                                    )} />
                                </div>
                            </div>
                        </div>

                        <div className="bg-background border-border sticky bottom-0 z-10 flex justify-end gap-3 border-t pt-4 pb-2">
                            <Button type="button" variant="outline" onClick={() => setOpenAction(false)}>Hủy bỏ</Button>
                            <Button type="submit" className="min-w-[150px] bg-blue-600 text-white hover:bg-blue-700" disabled={loading}>
                                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <><Save className="mr-2 h-4 w-4" /> Lưu thay đổi</>}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}