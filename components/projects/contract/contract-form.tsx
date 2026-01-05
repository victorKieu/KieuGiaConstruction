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
import { formatCurrency } from "@/lib/utils/utils"

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
    customer_name: z.string().optional(), // Thêm trường tên khách giả định (nếu cần hiển thị)
})

type ContractFormValues = z.infer<typeof contractSchema>

interface Props {
    initialData: any
    projectId: string
    onCancel: () => void
    onSuccess: () => void
}

export function ContractForm({ initialData, projectId, onCancel, onSuccess }: Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)

    const form = useForm<ContractFormValues>({
        resolver: zodResolver(contractSchema),
        defaultValues: {
            ...initialData,
            signing_date: initialData.signing_date?.split('T')[0] || '',
            start_date: initialData.start_date?.split('T')[0] || '',
            end_date: initialData.end_date?.split('T')[0] || '',
            value: initialData.value || 0,
            // Nếu initialData có thông tin khách hàng thì gán vào đây
            customer_name: initialData.customers?.name || ''
        }
    })

    // --- 🖨️ HÀM IN HỢP ĐỒNG (THEO MẪU KIỀU GIA) ---
    const handlePrint = () => {
        const data = form.getValues();
        const date = data.signing_date ? new Date(data.signing_date) : new Date();
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        // Tạo cửa sổ in
        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert("Vui lòng cho phép popup để in!");

        const contentHtml = `
      <html>
        <head>
          <title>Hợp đồng - ${data.contract_number}</title>
          <style>
            body { font-family: 'Times New Roman', serif; padding: 40px; font-size: 13pt; line-height: 1.3; }
            .header { text-align: center; margin-bottom: 20px; font-weight: bold; }
            .header h3 { margin: 0; font-size: 14pt; }
            .header h4 { margin: 5px 0 20px 0; font-size: 14pt; }
            .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 20px 0; }
            .legal-basis { margin-bottom: 15px; font-style: italic; }
            .legal-basis p { margin: 2px 0; }
            .section-title { font-weight: bold; margin-top: 15px; margin-bottom: 5px; text-transform: uppercase; }
            .party-info { margin-bottom: 15px; }
            .party-info p { margin: 4px 0; }
            .party-title { font-weight: bold; text-transform: uppercase; margin-top: 10px; }
            .table-content { width: 100%; border-collapse: collapse; margin: 10px 0; }
            .table-content th, .table-content td { border: 1px solid black; padding: 5px; text-align: center; }
            .signatures { display: flex; justify-content: space-between; margin-top: 50px; }
            .sign-col { text-align: center; width: 45%; }
            .sign-col h4 { margin-bottom: 80px; }
            ul { padding-left: 20px; margin: 5px 0; }
            li { list-style: none; }
            @media print {
              @page { margin: 2cm 1.5cm 2cm 1.5cm; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h3>CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</h3>
            <p style="text-decoration: underline; margin-top: 0;">Độc lập – Tự do – Hạnh phúc</p>
          </div>

          <div class="title">
            HỢP ĐỒNG THI CÔNG XÂY DỰNG<br>
            <span style="font-size: 12pt; font-weight: normal;">Số: ${data.contract_number}</span>
          </div>

          <div class="legal-basis">
            <p>- Căn cứ Luật Xây dựng số 50/2014/QH13 và Luật sửa đổi số 62/2020/QH14;</p>
            <p>- Căn cứ Nghị định số 10/2021/NĐ-CP và Nghị định số 15/2021/NĐ-CP của Chính phủ;</p>
            <p>- Căn cứ Nghị định số 06/2021/NĐ-CP về quản lý chất lượng thi công;</p>
            <p>– Căn cứ vào khả năng và nhu cầu hai bên.</p>
          </div>

          <p>Hôm nay, ngày ${day} tháng ${month} năm ${year}, chúng tôi các bên gồm có:</p>

          <div class="party-info">
            <div class="party-title">BÊN A (BÊN GIAO THI CÔNG): ${data.customer_name ? data.customer_name.toUpperCase() : '............................................................'}</div>
            <p>– Địa chỉ: ....................................................................................................................................</p>
            <p>– Mã số doanh nghiệp: ...................................................................................................................</p>
            <p>– Người đại diện: ........................................................... Chức vụ: ...............................................</p>
          </div>

          <div class="party-info">
            <div class="party-title">BÊN B (BÊN NHẬN THI CÔNG): CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA</div>
            <p>– Địa chỉ: Số 72 đường số 1, Khu nhà ở Thắng Lợi, khu phố Chiêu Liêu, phường Dĩ An, Thành phố Dĩ An, Tỉnh Bình Dương</p>
            <p>– Mã số doanh nghiệp: 3703296412</p>
            <p>– Người đại diện: Ông <strong>KIỀU QUANG HUY</strong> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Chức vụ: Giám Đốc</p>
            <p>– Điện thoại: 0918265365</p>
          </div>

          <p>Hai bên thống nhất ký kết Hợp đồng về việc thi công xây dựng với các điều khoản sau:</p>

          <div class="section-title">ĐIỀU 1: PHẠM VI CÔNG VIỆC THỰC HIỆN</div>
          <p>Bên A đồng ý giao và Bên B đồng ý nhận thi công công trình: <strong>${data.title}</strong>.</p>
          <p>Chi tiết công việc:</p>
          <div style="white-space: pre-wrap; font-family: inherit;">${data.content || '(Chi tiết theo bảng báo giá đính kèm)'}</div>

          <div class="section-title">ĐIỀU 2: TIẾN ĐỘ THỰC HIỆN</div>
          <p>Bên B sẽ bàn giao công trình trong thời gian: Từ ngày ${data.start_date ? new Date(data.start_date).toLocaleDateString('vi-VN') : '...'} đến ngày ${data.end_date ? new Date(data.end_date).toLocaleDateString('vi-VN') : '...'}.</p>

          <div class="section-title">ĐIỀU 3: GIÁ TRỊ HỢP ĐỒNG</div>
          <p>Tổng giá trị Hợp đồng: <strong>${formatCurrency(data.value)} VNĐ</strong></p>
          <p>(Bằng chữ: ...........................................................................................................................................)</p>
          <p>Giá trên đã bao gồm thuế GTGT 8% (nếu có) và chi phí vận chuyển, lắp đặt.</p>

          <div class="section-title">ĐIỀU 4: PHƯƠNG THỨC THANH TOÁN</div>
          <p><strong>Thông tin chuyển khoản:</strong></p>
          <ul>
            <li>Người nhận: Công ty TNHH TM DV Xây dựng Kiều Gia</li>
            <li>Số tài khoản: <strong>1031003939</strong></li>
            <li>Ngân hàng: Vietcombank Bình Dương</li>
          </ul>
          <p><strong>Điều khoản thanh toán chi tiết:</strong></p>
          <div style="white-space: pre-wrap; font-family: inherit;">${data.payment_terms || '- Đợt 1: Tạm ứng ...% ngay sau khi ký hợp đồng.\n- Đợt 2: Thanh toán ...% sau khi bàn giao.'}</div>

          <div class="section-title">ĐIỀU 5 ĐẾN ĐIỀU 10: CÁC ĐIỀU KHOẢN CHUNG</div>
          <p>(Bao gồm: Phát sinh, Nghiệm thu, Trách nhiệm mỗi bên, Bảo hành, Bất khả kháng, Phạt vi phạm - <em>Áp dụng theo quy định hiện hành và thỏa thuận chi tiết trong phụ lục nếu có</em>).</p>

          <div class="section-title">ĐIỀU 11: ĐIỀU KHOẢN CHUNG</div>
          <p>Hai Bên cam kết thực hiện đúng và đầy đủ các điều khoản của Hợp đồng. Mọi tranh chấp nếu không tự thỏa thuận được sẽ đưa ra Tòa án có thẩm quyền giải quyết.</p>
          <p>Hợp đồng này được lập thành 04 bản có giá trị pháp lý như nhau, mỗi bên giữ 02 bản.</p>

          <div class="signatures">
            <div class="sign-col">
              <h4>ĐẠI DIỆN BÊN A<br>(Ký, ghi rõ họ tên)</h4>
            </div>
            <div class="sign-col">
              <h4>ĐẠI DIỆN BÊN B<br>(Ký, đóng dấu)</h4>
              <p style="margin-top: 60px;"><strong>KIỀU QUANG HUY</strong></p>
            </div>
          </div>
          
          <script>
             window.onload = function() { window.print(); }
          </script>
        </body>
      </html>
    `;

        printWindow.document.write(contentHtml);
        printWindow.document.close();
    };

    const onSubmit = async (data: ContractFormValues) => {
        setIsSubmitting(true)
        try {
            const res = await updateContract(data as ContractInput, projectId)
            if (res.success) {
                alert("Đã lưu hợp đồng!")
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

            {/* 1. THÔNG TIN CHUNG */}
            <Card>
                <CardHeader className="pb-2 border-b mb-4 flex flex-row items-center justify-between">
                    <CardTitle>Thông tin chính</CardTitle>
                    {/* Nút In với thiết kế nổi bật */}
                    <Button type="button" variant="outline" onClick={handlePrint} className="gap-2 text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100 shadow-sm">
                        <Printer className="w-4 h-4" /> In Hợp đồng mẫu Kiều Gia
                    </Button>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Số hợp đồng <span className="text-red-500">*</span></Label>
                        <Input {...form.register("contract_number")} />
                        {form.formState.errors.contract_number && <p className="text-red-500 text-xs">{form.formState.errors.contract_number.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label>Tiêu đề hợp đồng <span className="text-red-500">*</span></Label>
                        <Input {...form.register("title")} />
                    </div>

                    <div className="space-y-2">
                        <Label>Giá trị (VNĐ)</Label>
                        <Input type="number" {...form.register("value")} className="font-bold" />
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
                        <Label>Nội dung hợp đồng (Phạm vi công việc)</Label>
                        <Textarea
                            {...form.register("content")}
                            className="min-h-[200px] font-mono text-sm"
                            placeholder="Nhập chi tiết các hạng mục thi công tại đây (Copy từ Excel hoặc Báo giá)..."
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Điều khoản thanh toán</Label>
                        <Textarea
                            {...form.register("payment_terms")}
                            className="min-h-[100px]"
                            placeholder="VD: Đợt 1 tạm ứng 20 triệu, Đợt 2 thanh toán hết sau khi bàn giao..."
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
                            contractValue={form.watch('value')} // Lấy giá trị hợp đồng realtime
                            projectId={projectId}
                        />
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
                    Lưu thay đổi
                </Button>
            </div>
        </form>
    )
}