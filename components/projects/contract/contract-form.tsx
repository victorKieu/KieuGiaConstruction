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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Save, Loader2, Printer, X, Info, FileText, Banknote, Lock } from "lucide-react"
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
    const [activeTab, setActiveTab] = useState("info")

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
    const watchedValue = form.watch("value"); // Dùng để truyền vào PaymentSchedule
    const isSaved = !!initialData?.id; // Kiểm tra xem hợp đồng đã được lưu chưa

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
                // Không đóng popup ngay, chuyển sang Tab thanh toán nếu là tạo mới
                if (!isSaved) {
                    setActiveTab("payment");
                    router.refresh();
                    // Lưu ý: Cần reload lại prop initialData để có ID mới, 
                    // nhưng ở bước này ta gọi onSuccess để list cập nhật, hoặc anh có thể chỉnh logic sau.
                    onSuccess();
                } else {
                    router.refresh()
                    onSuccess()
                }
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
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col h-full animate-in slide-in-from-right duration-300">
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between pb-4 border-b border-border mb-4">
                <h2 className="text-xl font-bold text-foreground">
                    {initialData.id ? "Chi tiết Hợp đồng" : "Tạo Hợp đồng mới"}
                </h2>
                {initialData.id && (
                    <Button
                        type="button"
                        variant="outline"
                        onClick={handlePrint}
                        className="gap-2 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 bg-indigo-50 dark:bg-indigo-900/20 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 shadow-sm h-9"
                    >
                        <Printer className="w-4 h-4" /> In Ấn
                    </Button>
                )}
            </div>

            {/* --- TABS LAYOUT --- */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 w-full">
                <TabsList className="grid w-full grid-cols-3 mb-6 bg-muted/50 border border-border">
                    <TabsTrigger value="info" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <Info className="w-4 h-4 mr-2" /> Thông tin chung
                    </TabsTrigger>
                    <TabsTrigger value="content" className="data-[state=active]:bg-background data-[state=active]:shadow-sm">
                        <FileText className="w-4 h-4 mr-2" /> Nội dung
                    </TabsTrigger>
                    <TabsTrigger
                        value="payment"
                        disabled={!isSaved}
                        className="data-[state=active]:bg-background data-[state=active]:shadow-sm disabled:opacity-50"
                    >
                        {isSaved ? <Banknote className="w-4 h-4 mr-2" /> : <Lock className="w-4 h-4 mr-2" />}
                        Tiến độ Thanh toán
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: THÔNG TIN CHUNG */}
                <TabsContent value="info" className="space-y-6 mt-0 outline-none">
                    <Card className="bg-card shadow-sm border-border">
                        <CardContent className="pt-6 space-y-6">
                            {/* Phụ lục Toggle */}
                            <div className="bg-muted/50 p-4 rounded-lg border border-border grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex flex-col gap-2">
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

                            {/* Form Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                <div className="space-y-2 md:col-span-2">
                                    <Label>Tiêu đề <span className="text-red-500">*</span></Label>
                                    <Input {...form.register("title")} placeholder={isAddendum ? "V/v Bổ sung hạng mục..." : "Hợp đồng thi công trọn gói..."} className="bg-background" />
                                    {form.formState.errors.title?.message && <p className="text-red-500 text-xs">{String(form.formState.errors.title.message)}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Số {isAddendum ? "Phụ lục" : "Hợp đồng"} <span className="text-red-500">*</span></Label>
                                    <Input {...form.register("contract_number")} placeholder={isAddendum ? "PL-01/..." : "HĐ-01/..."} className="bg-background uppercase" />
                                    {form.formState.errors.contract_number?.message && <p className="text-red-500 text-xs">{String(form.formState.errors.contract_number.message)}</p>}
                                </div>

                                <div className="space-y-2">
                                    <Label>Loại hợp đồng <span className="text-red-500">*</span></Label>
                                    <Select defaultValue={form.getValues("contract_type")} onValueChange={(val) => form.setValue("contract_type", val)}>
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
                                </div>

                                <div className="space-y-2">
                                    <Label>Giá trị {isAddendum ? "Phát sinh" : "Hợp đồng"} (VNĐ)</Label>
                                    <Input type="number" {...form.register("value")} className="font-bold bg-background text-indigo-700 dark:text-indigo-400" />
                                </div>

                                <div className="space-y-2">
                                    <Label>Trạng thái</Label>
                                    <Select defaultValue={form.getValues("status")} onValueChange={(val) => form.setValue("status", val)}>
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

                    <Card className="bg-card shadow-sm border-border">
                        <CardHeader className="pb-2"><CardTitle className="text-sm">Thời gian thực hiện</CardTitle></CardHeader>
                        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Ngày ký</Label>
                                <Input type="date" {...form.register("signing_date")} className="bg-background" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Ngày bắt đầu</Label>
                                <Input type="date" {...form.register("start_date")} className="bg-background" />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs text-muted-foreground">Ngày kết thúc</Label>
                                <Input type="date" {...form.register("end_date")} className="bg-background" />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: NỘI DUNG VÀ ĐIỀU KHOẢN */}
                <TabsContent value="content" className="space-y-6 mt-0 outline-none">
                    <Card className="bg-card shadow-sm border-border">
                        <CardContent className="pt-6 space-y-6">
                            <div className="space-y-2">
                                <Label className="text-base font-bold text-foreground">Phạm vi công việc & Nội dung</Label>
                                <p className="text-xs text-muted-foreground">Nội dung này sẽ được in trực tiếp vào phần I của Hợp đồng/Phụ lục.</p>
                                <Textarea
                                    {...form.register("content")}
                                    placeholder="Ghi rõ các hạng mục thi công, phạm vi trách nhiệm..."
                                    className="min-h-[250px] font-mono text-sm bg-background leading-relaxed"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-base font-bold text-foreground">Điều khoản thanh toán đặc biệt (Ghi chú)</Label>
                                <p className="text-xs text-muted-foreground">Phần text ghi chú in trong hợp đồng (Ví dụ: Thanh toán bằng chuyển khoản, phạt chậm trễ...)</p>
                                <Textarea
                                    {...form.register("payment_terms")}
                                    placeholder="Các lưu ý về thanh toán..."
                                    className="min-h-[120px] bg-background leading-relaxed"
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: TIẾN ĐỘ THANH TOÁN */}
                <TabsContent value="payment" className="space-y-6 mt-0 outline-none">
                    <Card className="border border-border shadow-sm bg-card">
                        <CardContent className="pt-6">
                            {!isSaved ? (
                                <div className="text-center py-16 px-4 text-muted-foreground border border-dashed border-border rounded-lg bg-muted/20 flex flex-col items-center justify-center">
                                    <Lock className="w-12 h-12 mb-4 text-muted-foreground/30" />
                                    <h3 className="text-lg font-bold text-foreground mb-1">Chưa thể tạo Tiến độ thanh toán</h3>
                                    <p>Vui lòng <b>Lưu</b> {isAddendum ? "Phụ lục" : "Hợp đồng"} này trước khi chia đợt thanh toán.</p>
                                </div>
                            ) : (
                                <PaymentSchedule
                                    contractId={initialData.id}
                                    contractValue={Number(watchedValue || 0)}
                                    projectId={projectId}
                                />
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* --- STICKY FOOTER ACTIONS --- */}
            <div className="flex justify-end gap-3 sticky bottom-0 bg-background/80 backdrop-blur-md p-4 border-t border-border shadow-lg mt-6 -mx-6 px-6 sm:-mx-0 sm:px-0 sm:bg-transparent sm:backdrop-blur-none sm:border-0 sm:shadow-none sm:mt-8 z-10">
                <Button type="button" variant="ghost" onClick={onCancel} className="hover:bg-muted text-foreground h-10">
                    <X className="w-4 h-4 mr-2" /> Đóng
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white h-10 px-6 font-bold shadow-sm">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu {isAddendum ? "Phụ lục" : "Hợp đồng"}
                </Button>
            </div>
        </form>
    )
}