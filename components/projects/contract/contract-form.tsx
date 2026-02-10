"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Loader2, Printer, X } from "lucide-react"
import { updateContract, type ContractInput } from "@/lib/action/contractActions"
import { useRouter } from "next/navigation"
import PaymentSchedule from "./PaymentSchedule";
import { Switch } from "@/components/ui/switch"

const contractSchema = z.object({
    id: z.string(),
    contract_number: z.string().min(1, "Số HĐ bắt buộc"),
    title: z.string().min(1, "Tiêu đề bắt buộc"),
    value: z.coerce.number().min(0, "Giá trị phải >= 0"),
    status: z.string(),
    contract_type: z.string().min(1, "Vui lòng chọn loại hợp đồng"),
    signing_date: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    content: z.string().optional(),
    payment_terms: z.string().optional(),
    customer_name: z.string().optional(),
    is_addendum: z.boolean().default(false),
    parent_id: z.string().nullable().optional(),
})

type ContractFormValues = z.infer<typeof contractSchema>

interface Props {
    initialData: any
    projectId: string
    onCancel: () => void
    onSuccess: () => void
    existingContracts?: any[]
}

export function ContractForm({ initialData, projectId, onCancel, onSuccess, existingContracts = [] }: Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm({
        resolver: zodResolver(contractSchema),
        defaultValues: {
            ...initialData,
            signing_date: initialData.signing_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            start_date: initialData.start_date?.split('T')[0] || '',
            end_date: initialData.end_date?.split('T')[0] || '',
            value: initialData.value || 0,
            customer_name: initialData.customers?.name || '',
            contract_type: initialData.contract_type || 'construction',
            is_addendum: initialData.is_addendum || false,
            parent_id: initialData.parent_id || null,
        }
    })

    const isAddendum = form.watch("is_addendum");
    const availableParents = existingContracts.filter(c =>
        c.id !== initialData.id && !c.is_addendum
    );

    const handlePrint = () => {
        const values = form.getValues();

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Vui lòng cho phép trình duyệt mở Popup để in.");
            return;
        }

        let typeName = "HỢP ĐỒNG";
        const cType = String(values.contract_type);
        if (cType === 'design') typeName = "HỢP ĐỒNG THIẾT KẾ";
        else if (cType === 'construction') typeName = "HỢP ĐỒNG THI CÔNG";
        else if (cType === 'consulting') typeName = "HỢP ĐỒNG TƯ VẤN";

        if (values.is_addendum) typeName = "PHỤ LỤC HỢP ĐỒNG";

        const formattedValue = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(values.value));

        const content = `
            <html>
            <head>
                <title>In: ${values.contract_number}</title>
                <style>
                    body { font-family: 'Times New Roman', serif; padding: 40px; line-height: 1.5; font-size: 13pt; }
                    .header { text-align: center; margin-bottom: 30px; }
                    .nation { font-weight: bold; text-transform: uppercase; }
                    .motto { font-weight: bold; border-bottom: 1px solid #000; display: inline-block; padding-bottom: 5px; }
                    .title { font-size: 16pt; font-weight: bold; text-transform: uppercase; margin: 20px 0; text-align: center; }
                    .meta { font-style: italic; text-align: center; margin-bottom: 30px; }
                    .section { margin-bottom: 15px; text-align: justify; }
                    .label { font-weight: bold; }
                    .footer { margin-top: 50px; display: flex; justify-content: space-between; }
                    .sign-box { width: 45%; text-align: center; }
                    .sign-title { font-weight: bold; text-transform: uppercase; }
                    .sign-space { height: 100px; }
                    @media print {
                        @page { margin: 2.5cm 2cm 2cm 2cm; }
                        body { padding: 0; }
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="nation">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
                    <div class="motto">Độc lập - Tự do - Hạnh phúc</div>
                </div>

                <div class="title">${typeName}</div>
                <div class="meta">
                    Số: ${values.contract_number} <br/>
                    Hôm nay, ngày ... tháng ... năm ...
                </div>

                <div class="section">
                    <p><span class="label">Về việc:</span> ${values.title}</p>
                    <p><span class="label">Giá trị:</span> ${formattedValue}</p>
                    <p><span class="label">Thời gian thực hiện:</span> Từ ${values.start_date || '...'} đến ${values.end_date || '...'}</p>
                </div>

                <div class="section">
                    <h3>I. NỘI DUNG VÀ PHẠM VI CÔNG VIỆC:</h3>
                    <div style="white-space: pre-wrap;">${values.content || "Theo hồ sơ đính kèm..."}</div>
                </div>

                ${values.payment_terms ? `
                <div class="section">
                    <h3>II. ĐIỀU KHOẢN THANH TOÁN:</h3>
                    <div style="white-space: pre-wrap;">${values.payment_terms}</div>
                </div>
                ` : ''}

                <div class="footer">
                    <div class="sign-box">
                        <div class="sign-title">ĐẠI DIỆN KHÁCH HÀNG</div>
                        <div>(Bên A)</div>
                        <div class="sign-space"></div>
                        <div>${values.customer_name || "..........................."}</div>
                    </div>
                    <div class="sign-box">
                        <div class="sign-title">ĐẠI DIỆN CÔNG TY</div>
                        <div>(Bên B)</div>
                        <div class="sign-space"></div>
                        <div>GIÁM ĐỐC</div>
                    </div>
                </div>
                
                <script>
                    window.onload = function() { window.print(); }
                </script>
            </body>
            </html>
        `;

        printWindow.document.write(content);
        printWindow.document.close();
    };

    const onSubmit = async (data: any) => {
        setIsSubmitting(true)
        try {
            const payload = {
                ...data,
                parent_id: data.is_addendum ? data.parent_id : null
            };

            const res = await updateContract(payload as ContractInput, projectId)
            if (res.success) {
                alert("Đã lưu thành công!")
                router.refresh()
                onSuccess()
            } else {
                alert("Lỗi: " + res.error)
            }
        } catch (error) {
            console.error(error)
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-in slide-in-from-right duration-300">
            {/* ✅ FIX: bg-card */}
            <Card className="bg-card">
                <CardHeader className="pb-2 border-b border-border mb-4 flex flex-row items-center justify-between">
                    <CardTitle className="text-foreground">
                        {initialData.id ? "Cập nhật Văn bản" : "Tạo mới Văn bản"}
                    </CardTitle>
                    {initialData.id && (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={handlePrint}
                            // ✅ FIX: Dark mode colors
                            className="gap-2 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 shadow-sm"
                        >
                            <Printer className="w-4 h-4" /> In Ấn
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* ✅ FIX: bg-muted/50 border-border */}
                    <div className="bg-muted/50 p-4 rounded-lg border border-border grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            {/* ✅ FIX: text-foreground */}
                            <Label className="font-bold text-foreground">Hình thức văn bản</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Switch
                                    id="is-addendum"
                                    checked={isAddendum}
                                    onCheckedChange={(checked) => {
                                        form.setValue("is_addendum", checked);
                                        if (!checked) form.setValue("parent_id", null);
                                    }}
                                />
                                <Label htmlFor="is-addendum" className="cursor-pointer font-normal text-muted-foreground">
                                    {isAddendum ? "Đây là Phụ lục Hợp đồng" : "Đây là Hợp đồng chính"}
                                </Label>
                            </div>
                        </div>

                        {isAddendum && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label className="font-bold text-blue-600 dark:text-blue-400">Thuộc Hợp đồng gốc <span className="text-red-500">*</span></Label>
                                <Select
                                    value={form.watch("parent_id") || ""}
                                    onValueChange={(val) => form.setValue("parent_id", val)}
                                >
                                    {/* ✅ FIX: bg-background border-input */}
                                    <SelectTrigger className="bg-background border-input">
                                        <SelectValue placeholder="-- Chọn hợp đồng gốc --" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableParents.length > 0 ? (
                                            availableParents.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.contract_number} - {c.title}
                                                </SelectItem>
                                            ))
                                        ) : (
                                            <div className="p-2 text-sm text-muted-foreground italic text-center">Chưa có hợp đồng chính nào</div>
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Số {isAddendum ? "Phụ lục" : "Hợp đồng"} <span className="text-red-500">*</span></Label>
                            <Input {...form.register("contract_number")} placeholder={isAddendum ? "PL-01/..." : "HĐ-01/..."} className="bg-background" />
                            {form.formState.errors.contract_number?.message && (
                                <p className="text-red-500 text-xs">
                                    {String(form.formState.errors.contract_number.message)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Loại hợp đồng <span className="text-red-500">*</span></Label>
                            <Select
                                defaultValue={form.getValues("contract_type")}
                                onValueChange={(val) => form.setValue("contract_type", val)}
                            >
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Chọn loại hợp đồng" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="construction">Hợp đồng Thi công</SelectItem>
                                    <SelectItem value="design">Hợp đồng Thiết kế</SelectItem>
                                    <SelectItem value="consulting">Tư vấn giám sát</SelectItem>
                                    <SelectItem value="supply">Cung cấp vật tư</SelectItem>
                                </SelectContent>
                            </Select>
                            {form.formState.errors.contract_type?.message && (
                                <p className="text-red-500 text-xs">
                                    {String(form.formState.errors.contract_type.message)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Tiêu đề <span className="text-red-500">*</span></Label>
                            <Input {...form.register("title")} placeholder={isAddendum ? "V/v Bổ sung hạng mục..." : "Hợp đồng thi công trọn gói..."} className="bg-background" />
                            {form.formState.errors.title?.message && (
                                <p className="text-red-500 text-xs">
                                    {String(form.formState.errors.title.message)}
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label>Giá trị {isAddendum ? "Phát sinh" : "Hợp đồng"} (VNĐ)</Label>
                            <Input type="number" {...form.register("value")} className="font-bold bg-background" />
                        </div>

                        <div className="space-y-2">
                            <Label>Trạng thái</Label>
                            <Select
                                defaultValue={form.getValues("status")}
                                onValueChange={(val) => form.setValue("status", val)}
                            >
                                <SelectTrigger className="bg-background">
                                    <SelectValue placeholder="Chọn trạng thái" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="draft">Dự thảo (Draft)</SelectItem>
                                    <SelectItem value="signed">Đã ký (Signed)</SelectItem>
                                    <SelectItem value="liquidated">Đã thanh lý</SelectItem>
                                    <SelectItem value="cancelled">Đã hủy</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card">
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Ngày ký</Label>
                        <Input type="date" {...form.register("signing_date")} className="bg-background" />
                    </div>
                    <div className="space-y-2">
                        <Label>Ngày bắt đầu</Label>
                        <Input type="date" {...form.register("start_date")} className="bg-background" />
                    </div>
                    <div className="space-y-2">
                        <Label>Ngày kết thúc</Label>
                        <Input type="date" {...form.register("end_date")} className="bg-background" />
                    </div>
                </CardContent>
            </Card>

            <Card className="bg-card">
                <CardHeader><CardTitle>Nội dung & Điều khoản</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nội dung chi tiết</Label>
                        <Textarea
                            {...form.register("content")}
                            className="min-h-[150px] font-mono text-sm bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Điều khoản thanh toán (Ghi chú)</Label>
                        <Textarea
                            {...form.register("payment_terms")}
                            className="min-h-[80px] bg-background"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* ✅ FIX: border-indigo-xxx -> border-border */}
            <Card className="border border-border shadow-sm bg-card">
                <CardContent className="pt-6">
                    {initialData?.id ? (
                        <PaymentSchedule
                            contractId={initialData.id}
                            contractValue={Number(form.watch('value') || 0)}
                            projectId={projectId}
                        />
                    ) : (
                        <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded bg-muted/20">
                            Bạn cần lưu {isAddendum ? "Phụ lục" : "Hợp đồng"} trước khi tạo lịch thanh toán.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ✅ FIX: Sticky footer background */}
            <div className="flex justify-end gap-3 sticky bottom-0 bg-background p-4 border-t border-border shadow-lg md:static md:bg-transparent md:border-0 md:shadow-none z-10">
                <Button type="button" variant="ghost" onClick={onCancel} className="hover:bg-muted">
                    <X className="w-4 h-4 mr-2" /> Đóng
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu {isAddendum ? "Phụ lục" : "Hợp đồng"}
                </Button>
            </div>
        </form>
    )
}