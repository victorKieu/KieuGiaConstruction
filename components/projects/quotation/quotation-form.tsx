"use client"

import { useState } from "react"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Save, Loader2, Calculator, AlertCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils/utils"
import { saveQuotation, type QuotationInput } from "@/lib/action/quotationActions"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// --- 1. SCHEMA VALIDATION ---
const quotationSchema = z.object({
    id: z.string().optional(),
    project_id: z.string(),
    quotation_number: z.string().min(1, "Số báo giá không được để trống"),
    issue_date: z.string().min(1, "Ngày báo giá bắt buộc"),
    valid_until: z.string().optional(),
    status: z.string(),
    notes: z.string().optional(),
    items: z.array(z.object({
        id: z.string().optional(),
        work_item_name: z.string().min(1, "Tên hạng mục bắt buộc"),
        unit: z.string().min(1, "ĐVT bắt buộc"),
        quantity: z.coerce.number().min(0.0001, "SL phải > 0"),
        unit_price: z.coerce.number().min(0, "Đơn giá phải >= 0"),
        notes: z.string().optional()
    })).min(1, "Bạn phải nhập ít nhất 1 hạng mục công việc")
})

type QuotationFormValues = z.infer<typeof quotationSchema>

interface Props {
    projectId: string
    initialData?: any
    onSuccess?: () => void
    onCancel?: () => void
}

export function QuotationForm({ projectId, initialData, onSuccess, onCancel }: Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    // --- 2. SETUP FORM ---
    const form = useForm<QuotationFormValues>({
        resolver: zodResolver(quotationSchema),
        defaultValues: initialData ? {
            ...initialData,
            issue_date: initialData.issue_date?.split('T')[0],
            valid_until: initialData.valid_until?.split('T')[0]
        } : {
            project_id: projectId,
            quotation_number: `BG-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            issue_date: new Date().toISOString().split('T')[0],
            status: 'draft',
            items: [{ work_item_name: "", unit: "", quantity: 1, unit_price: 0 }]
        }
    })

    const { fields, append, remove } = useFieldArray({
        control: form.control,
        name: "items"
    })

    // --- 3. TÍNH TOÁN REAL-TIME ---
    const watchedItems = useWatch({ control: form.control, name: "items" })

    const totalAmount = watchedItems?.reduce((sum, item) => {
        const qty = Number(item.quantity) || 0
        const price = Number(item.unit_price) || 0
        return sum + (qty * price)
    }, 0) || 0

    // --- 4. SUBMIT (Xử lý khi thành công) ---
    const onSubmit = async (data: QuotationFormValues) => {
        console.log("Submit triggered", data); // Debug log
        setIsSubmitting(true)
        setServerError(null)

        try {
            const result = await saveQuotation(data as QuotationInput)

            if (result.success) {
                alert("Lưu báo giá thành công!")
                router.refresh()
                if (onSuccess) onSuccess()
            } else {
                setServerError(result.error || "Có lỗi xảy ra khi lưu.")
            }
        } catch (e: any) {
            console.error(e)
            setServerError(e.message || "Lỗi không xác định.")
        } finally {
            setIsSubmitting(false)
        }
    }

    // --- 5. ERROR HANDLER (Xử lý khi Validation thất bại) ---
    // ✅ ĐÂY LÀ PHẦN QUAN TRỌNG ĐỂ NÚT KHÔNG BỊ "LIỆT"
    const onError = (errors: any) => {
        console.log("Validation Errors:", errors);

        let message = "Vui lòng kiểm tra lại thông tin!";
        if (errors.items) {
            message = "Danh sách hạng mục chưa hợp lệ (Thiếu Tên hoặc ĐVT).";
        } else if (errors.quotation_number) {
            message = "Thiếu số báo giá.";
        } else if (errors.issue_date) {
            message = "Thiếu ngày lập.";
        }

        alert(message); // Hiện thông báo để bạn biết vì sao không lưu được
    }

    return (
        // ✅ KẾT NỐI onError VÀO handleSubmit
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">

            {serverError && (
                <Alert variant="destructive" className="bg-red-50 border-red-200 text-red-800">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Không thể lưu</AlertTitle>
                    <AlertDescription>{serverError}</AlertDescription>
                </Alert>
            )}

            {/* --- THÔNG TIN CHUNG --- */}
            <Card>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Số Báo Giá <span className="text-red-500">*</span></Label>
                        <Input {...form.register("quotation_number")} placeholder="VD: BG-2401-001" />
                        {form.formState.errors.quotation_number && <p className="text-red-500 text-xs">{form.formState.errors.quotation_number.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Ngày lập <span className="text-red-500">*</span></Label>
                        <Input type="date" {...form.register("issue_date")} />
                        {form.formState.errors.issue_date && <p className="text-red-500 text-xs">{form.formState.errors.issue_date.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Trạng thái</Label>
                        <Select
                            defaultValue={form.getValues("status")}
                            onValueChange={(val) => form.setValue("status", val)}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="draft">Nháp (Draft)</SelectItem>
                                <SelectItem value="sent">Đã gửi khách</SelectItem>
                                <SelectItem value="accepted">Đã chốt (Accepted)</SelectItem>
                                <SelectItem value="rejected">Bị từ chối</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="col-span-1 md:col-span-3 space-y-2">
                        <Label>Ghi chú / Điều khoản</Label>
                        <Textarea {...form.register("notes")} placeholder="Ghi chú về thanh toán, bảo hành..." />
                    </div>
                </CardContent>
            </Card>

            {/* --- CHI TIẾT ITEMS --- */}
            <Card>
                <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                    <h3 className="font-semibold flex items-center"><Calculator className="w-4 h-4 mr-2" /> Chi tiết Hạng mục</h3>
                    <div className="text-lg font-bold text-blue-600">
                        Tổng cộng: {formatCurrency(totalAmount)}
                    </div>
                </div>
                <CardContent className="p-0">
                    {form.formState.errors.items && !Array.isArray(form.formState.errors.items) && (
                        <div className="p-3 bg-red-50 text-red-600 text-sm flex items-center justify-center">
                            <AlertCircle className="w-4 h-4 mr-2" />
                            {(form.formState.errors.items as any).message}
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                <tr>
                                    <th className="px-4 py-3 w-[35%]">Tên công việc <span className="text-red-500">*</span></th>
                                    <th className="px-4 py-3 w-[15%]">ĐVT <span className="text-red-500">*</span></th>
                                    <th className="px-4 py-3 w-[15%]">Khối lượng <span className="text-red-500">*</span></th>
                                    <th className="px-4 py-3 w-[15%]">Đơn giá</th>
                                    <th className="px-4 py-3 w-[15%] text-right">Thành tiền</th>
                                    <th className="px-4 py-3 w-[5%]"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {fields.map((field, index) => {
                                    const qty = form.watch(`items.${index}.quantity`) || 0
                                    const price = form.watch(`items.${index}.unit_price`) || 0
                                    const lineTotal = qty * price

                                    return (
                                        <tr key={field.id} className="border-b hover:bg-slate-50 group align-top">
                                            <td className="px-2 py-2">
                                                <Input
                                                    {...form.register(`items.${index}.work_item_name`)}
                                                    placeholder="Tên hạng mục..."
                                                    className={`border-0 shadow-none focus-visible:ring-0 bg-transparent px-2 ${form.formState.errors.items?.[index]?.work_item_name ? 'border-b border-red-500 rounded-none' : ''}`}
                                                />
                                                {form.formState.errors.items?.[index]?.work_item_name && (
                                                    <p className="text-red-500 text-[10px] pl-2 mt-1">Bắt buộc nhập</p>
                                                )}
                                            </td>

                                            <td className="px-2 py-2">
                                                <Input
                                                    {...form.register(`items.${index}.unit`)}
                                                    placeholder="ĐVT"
                                                    className={`border-0 shadow-none focus-visible:ring-0 bg-transparent px-2 ${form.formState.errors.items?.[index]?.unit ? 'border-b border-red-500 rounded-none bg-red-50' : ''}`}
                                                />
                                                {form.formState.errors.items?.[index]?.unit && (
                                                    <p className="text-red-500 text-[10px] pl-2 mt-1">Thiếu ĐVT</p>
                                                )}
                                            </td>

                                            <td className="px-2 py-2">
                                                <Input
                                                    type="number" step="0.01"
                                                    {...form.register(`items.${index}.quantity`)}
                                                    className={`border-0 shadow-none focus-visible:ring-0 bg-transparent text-right px-2 ${form.formState.errors.items?.[index]?.quantity ? 'text-red-500 font-bold' : ''}`}
                                                />
                                            </td>

                                            <td className="px-2 py-2">
                                                <Input
                                                    type="number"
                                                    {...form.register(`items.${index}.unit_price`)}
                                                    className="border-0 shadow-none focus-visible:ring-0 bg-transparent text-right px-2"
                                                />
                                            </td>

                                            <td className="px-4 py-3 text-right font-medium text-slate-700">
                                                {formatCurrency(lineTotal)}
                                            </td>

                                            <td className="px-2 py-2 text-center">
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-gray-400 hover:text-red-600 h-8 w-8"
                                                    onClick={() => remove(index)}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="p-4 bg-slate-50 border-t">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => append({ work_item_name: "", unit: "", quantity: 1, unit_price: 0 })}
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                        >
                            <Plus className="w-4 h-4 mr-2" /> Thêm hạng mục
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* --- ACTIONS --- */}
            <div className="flex justify-end gap-3 pt-4 sticky bottom-0 bg-white p-4 border-t shadow-lg md:static md:bg-transparent md:border-0 md:shadow-none z-10">
                {onCancel && (
                    <Button type="button" variant="outline" onClick={onCancel}>Hủy bỏ</Button>
                )}
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu Báo Giá
                </Button>
            </div>
        </form>
    )
}