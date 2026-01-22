"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Save, Loader2, Printer, X, FilePlus } from "lucide-react"
import { updateContract, type ContractInput } from "@/lib/action/contractActions"
import { useRouter } from "next/navigation"
import PaymentSchedule from "./PaymentSchedule";
import { formatCurrency } from "@/lib/utils/utils"
import { Switch } from "@/components/ui/switch" // Đảm bảo bạn đã có component này

const contractSchema = z.object({
    id: z.string(),
    contract_number: z.string().min(1, "Số HĐ bắt buộc"),
    title: z.string().min(1, "Tiêu đề bắt buộc"),
    value: z.coerce.number().min(0, "Giá trị phải >= 0"),
    status: z.string(),
    signing_date: z.string().optional(),
    start_date: z.string().optional(),
    end_date: z.string().optional(),
    content: z.string().optional(),
    payment_terms: z.string().optional(),
    customer_name: z.string().optional(),

    // ✅ THÊM TRƯỜNG CHO PHỤ LỤC
    is_addendum: z.boolean().default(false),
    parent_id: z.string().nullable().optional(),
})

type ContractFormValues = z.infer<typeof contractSchema>

interface Props {
    initialData: any
    projectId: string
    onCancel: () => void
    onSuccess: () => void
    // ✅ THÊM PROPS: Danh sách hợp đồng hiện có để chọn cha
    existingContracts?: any[]
}

export function ContractForm({ initialData, projectId, onCancel, onSuccess, existingContracts = [] }: Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<ContractFormValues>({
        resolver: zodResolver(contractSchema),
        defaultValues: {
            ...initialData,
            signing_date: initialData.signing_date?.split('T')[0] || new Date().toISOString().split('T')[0],
            start_date: initialData.start_date?.split('T')[0] || '',
            end_date: initialData.end_date?.split('T')[0] || '',
            value: initialData.value || 0,
            customer_name: initialData.customers?.name || '',
            // ✅ Map giá trị phụ lục
            is_addendum: initialData.is_addendum || false,
            parent_id: initialData.parent_id || null,
        }
    })

    // Watch giá trị để hiển thị điều kiện
    const isAddendum = form.watch("is_addendum");

    // Lọc danh sách hợp đồng cha (loại bỏ chính nó nếu đang sửa và loại bỏ các phụ lục khác)
    const availableParents = existingContracts.filter(c =>
        c.id !== initialData.id && !c.is_addendum
    );

    // --- 🖨️ HÀM IN HỢP ĐỒNG (THEO MẪU KIỀU GIA) ---
    const handlePrint = () => {
        // ... (Giữ nguyên logic in ấn của bạn)
        // Lưu ý: Nếu là phụ lục, bạn có thể muốn sửa tiêu đề in thành "PHỤ LỤC HỢP ĐỒNG"
        // Logic đó có thể thêm ở đây: const titleDoc = isAddendum ? "PHỤ LỤC HỢP ĐỒNG" : "HỢP ĐỒNG THI CÔNG";
        const data = form.getValues();
        alert("Chức năng in đang cập nhật cho Phụ lục.");
    };

    const onSubmit = async (data: ContractFormValues) => {
        setIsSubmitting(true)
        try {
            // Nếu không phải phụ lục, set parent_id về null
            const payload = {
                ...data,
                parent_id: data.is_addendum ? data.parent_id : null
            };

            const res = await updateContract(payload as ContractInput, projectId)
            if (res.success) {
                toastSuccess("Đã lưu thành công!")
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

    const toastSuccess = (msg: string) => {
        // Tùy chỉnh hiển thị thông báo của bạn (dùng alert tạm hoặc sonner)
        alert(msg);
    }

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 animate-in slide-in-from-right duration-300">

            {/* 1. THÔNG TIN CHUNG */}
            <Card>
                <CardHeader className="pb-2 border-b mb-4 flex flex-row items-center justify-between">
                    <CardTitle>
                        {initialData.id ? "Cập nhật Hợp đồng / Phụ lục" : "Tạo mới Hợp đồng / Phụ lục"}
                    </CardTitle>
                    {/* Chỉ hiện nút in nếu đã lưu */}
                    {initialData.id && (
                        <Button type="button" variant="outline" onClick={handlePrint} className="gap-2 text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 shadow-sm">
                            <Printer className="w-4 h-4" /> In Ấn
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="space-y-6">

                    {/* ✅ PHẦN CHỌN LOẠI HỢP ĐỒNG (MỚI) */}
                    <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="flex flex-col gap-2">
                            <Label className="font-bold text-slate-700">Loại văn bản</Label>
                            <div className="flex items-center gap-2 mt-1">
                                <Switch
                                    id="is-addendum"
                                    checked={isAddendum}
                                    onCheckedChange={(checked) => {
                                        form.setValue("is_addendum", checked);
                                        if (!checked) form.setValue("parent_id", null);
                                    }}
                                />
                                <Label htmlFor="is-addendum" className="cursor-pointer font-normal">
                                    {isAddendum ? "Đây là Phụ lục Hợp đồng" : "Đây là Hợp đồng chính"}
                                </Label>
                            </div>
                        </div>

                        {isAddendum && (
                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                <Label className="font-bold text-blue-600">Thuộc Hợp đồng gốc <span className="text-red-500">*</span></Label>
                                <Select
                                    value={form.watch("parent_id") || ""}
                                    onValueChange={(val) => form.setValue("parent_id", val)}
                                >
                                    <SelectTrigger className="bg-white border-blue-300">
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
                                            <div className="p-2 text-sm text-gray-500 italic text-center">Chưa có hợp đồng chính nào</div>
                                        )}
                                    </SelectContent>
                                </Select>
                                {isAddendum && !form.watch("parent_id") && (
                                    <p className="text-red-500 text-xs">Vui lòng chọn hợp đồng gốc.</p>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Số {isAddendum ? "Phụ lục" : "Hợp đồng"} <span className="text-red-500">*</span></Label>
                            <Input {...form.register("contract_number")} placeholder={isAddendum ? "PL-01/..." : "HĐ-01/..."} />
                            {form.formState.errors.contract_number && <p className="text-red-500 text-xs">{form.formState.errors.contract_number.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label>Tiêu đề <span className="text-red-500">*</span></Label>
                            <Input {...form.register("title")} placeholder={isAddendum ? "V/v Bổ sung hạng mục..." : "Hợp đồng thi công..."} />
                        </div>

                        <div className="space-y-2">
                            <Label>Giá trị {isAddendum ? "Phát sinh" : "Hợp đồng"} (VNĐ)</Label>
                            <Input type="number" {...form.register("value")} className="font-bold" />
                            <p className="text-xs text-gray-400">Nhập 0 nếu không phát sinh chi phí</p>
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

            {/* 2. THỜI GIAN */}
            <Card>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                        <Label>Ngày ký</Label>
                        <Input type="date" {...form.register("signing_date")} />
                    </div>
                    <div className="space-y-2">
                        <Label>Ngày bắt đầu</Label>
                        <Input type="date" {...form.register("start_date")} />
                    </div>
                    <div className="space-y-2">
                        <Label>Ngày kết thúc</Label>
                        <Input type="date" {...form.register("end_date")} />
                    </div>
                </CardContent>
            </Card>

            {/* 3. NỘI DUNG CHI TIẾT */}
            <Card>
                <CardHeader><CardTitle>Nội dung & Điều khoản</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label>Nội dung chi tiết</Label>
                        <Textarea
                            {...form.register("content")}
                            className="min-h-[150px] font-mono text-sm"
                            placeholder="Mô tả phạm vi công việc hoặc nội dung thay đổi..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Điều khoản thanh toán (Nếu có)</Label>
                        <Textarea
                            {...form.register("payment_terms")}
                            className="min-h-[80px]"
                            placeholder="Ghi chú về tiến độ thanh toán cho phần này..."
                        />
                    </div>
                </CardContent>
            </Card>

            <Card className="border-indigo-100 shadow-sm">
                <CardContent className="pt-6">
                    {/* Chỉ hiện bảng này khi đã có ID hợp đồng (tức là đang sửa, không phải tạo mới) */}
                    {initialData?.id && (
                        <PaymentSchedule
                            contractId={initialData.id}
                            contractValue={form.watch('value')}
                            projectId={projectId}
                        />
                    )}

                    {!initialData?.id && (
                        <div className="text-center py-8 text-gray-400 border border-dashed rounded bg-slate-50">
                            Bạn cần lưu {isAddendum ? "Phụ lục" : "Hợp đồng"} trước khi tạo lịch thanh toán.
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* ACTIONS */}
            <div className="flex justify-end gap-3 sticky bottom-0 bg-white p-4 border-t shadow-lg md:static md:bg-transparent md:border-0 md:shadow-none z-10">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    <X className="w-4 h-4 mr-2" /> Đóng
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                    Lưu {isAddendum ? "Phụ lục" : "Hợp đồng"}
                </Button>
            </div>
        </form>
    )
}