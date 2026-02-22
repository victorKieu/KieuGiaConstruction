"use client"

import { useState } from "react"
import { useForm, useFieldArray, useWatch, SubmitHandler, FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Save, Loader2, Calculator, Printer, ArrowUp, ArrowDown } from "lucide-react"
import { formatCurrency, formatDateVN } from "@/lib/utils/utils"
import { saveQuotation, type QuotationInput } from "@/lib/action/quotationActions"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { readMoneyToText } from "@/lib/utils/readNumber"
import { createClient } from "@/lib/supabase/client" // ✅ Import Supabase Client

// --- 1. SCHEMA ---
const quotationSchema = z.object({
    id: z.string().optional(),
    project_id: z.string(),
    quotation_number: z.string().min(1, "Số báo giá bắt buộc"),
    customer_name: z.string().optional(),
    project_name: z.string().optional(),
    address: z.string().optional(),
    title: z.string().min(1, "Hạng mục báo giá bắt buộc"),
    issue_date: z.string().min(1, "Ngày báo giá bắt buộc"),
    status: z.string(),
    notes: z.string().optional(),
    vat_rate: z.coerce.number().default(8),
    items: z.array(z.object({
        id: z.string().optional(),
        item_type: z.enum(['section', 'item']).default('item'),
        work_item_name: z.string().min(1, "Nội dung không được để trống"),
        details: z.string().nullish().transform(v => v || ''),
        unit: z.string().nullish().transform(v => v || ''),
        quantity: z.coerce.number().optional(),
        unit_price: z.coerce.number().optional(),
        vat_rate: z.coerce.number().default(0),
        notes: z.string().nullish().transform(v => v || ''),
    })).min(1, "Cần ít nhất 1 dòng nội dung")
})

type QuotationFormValues = z.infer<typeof quotationSchema>

interface Props {
    projectId: string;
    project?: any;
    initialData?: any;
    onSuccess?: () => void;
    onCancel?: () => void;
}

export function QuotationForm({ projectId, project, initialData, onSuccess, onCancel }: Props) {
    const router = useRouter()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [serverError, setServerError] = useState<string | null>(null)

    const customerNameFromProject = project?.customer?.name || project?.customers?.name || "QUÝ KHÁCH HÀNG";
    const projectNameFromProject = project?.name || "";
    const addressFromProject = project?.address || project?.location || "";

    const defaultCustomerName = customerNameFromProject;
    const defaultProjectName = projectNameFromProject;
    const defaultAddress = initialData?.address || addressFromProject;

    const form = useForm({
        resolver: zodResolver(quotationSchema),
        defaultValues: initialData ? {
            ...initialData,
            issue_date: initialData.issue_date?.split('T')[0],
            customer_name: defaultCustomerName,
            project_name: defaultProjectName,
            address: defaultAddress,
            items: initialData.items?.map((i: any) => ({
                ...i,
                item_type: i.item_type || 'item',
                work_item_name: i.work_item_name || '',
                unit: i.unit || '',
                details: i.details || '',
                notes: i.notes || '',
                vat_rate: i.vat_rate || 0,
            }))
        } : {
            project_id: projectId,
            quotation_number: `BG-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)}`,
            customer_name: defaultCustomerName,
            project_name: defaultProjectName,
            address: defaultAddress,
            title: "",
            issue_date: new Date().toISOString().split('T')[0],
            status: 'draft',
            notes: '',
            vat_rate: 8,
            items: [
                { item_type: 'section', work_item_name: 'I. PHẦN THÔ', vat_rate: 0 },
                { item_type: 'item', work_item_name: '', unit: '', quantity: 1, unit_price: 0, vat_rate: 8, details: '', notes: '' }
            ]
        }
    })

    const { fields, append, remove, move } = useFieldArray({
        control: form.control,
        name: "items"
    })

    const watchedItems = useWatch({ control: form.control, name: "items" })

    let preTaxTotal = 0;
    let vatTotal = 0;

    watchedItems?.forEach((item: any) => {
        if (item.item_type === 'item') {
            const qty = Number(item.quantity) || 0;
            const price = Number(item.unit_price) || 0;
            const amount = qty * price;
            const vat = amount * ((item.vat_rate || 0) / 100);
            preTaxTotal += amount;
            vatTotal += vat;
        }
    });

    const totalAmount = preTaxTotal + vatTotal;

    // ✅ HÀM IMPORT DỮ LIỆU TỰ ĐỘNG TỪ BẢNG DỰ TOÁN
    const handleImportFromEstimation = async () => {
        if (!confirm("Hành động này sẽ xóa toàn bộ nội dung báo giá hiện tại bên dưới và thay thế bằng dữ liệu từ Dự toán. Bạn có chắc chắn?")) return;

        const supabase = createClient();
        setIsSubmitting(true);

        try {
            // Lấy dữ liệu đã được chốt giá từ bảng estimation_items
            const { data, error } = await supabase
                .from('estimation_items')
                .select('*')
                .eq('project_id', projectId)
                .order('section_name', { ascending: true }); // Sắp xếp theo hạng mục

            if (error) throw error;

            if (!data || data.length === 0) {
                alert("Chưa có dữ liệu dự toán. Hãy thực hiện AI bóc tách hoặc Đồng bộ QTO trước.");
                return;
            }

            // Xóa sạch các dòng trống hiện hành trong Form
            remove();

            // Auto-fill dữ liệu vào Form
            let currentSection = "";
            data.forEach((item) => {
                // 1. Nếu có tên hạng mục (section_name) mới, tạo 1 dòng Tiêu đề lớn
                if (item.section_name && item.section_name !== currentSection) {
                    append({
                        item_type: 'section',
                        work_item_name: item.section_name.toUpperCase(),
                        vat_rate: 0
                    });
                    currentSection = item.section_name;
                }

                // 2. Điền chi tiết công việc / vật tư
                append({
                    item_type: 'item',
                    work_item_name: item.material_name || item.original_name || "Mục chưa tên",
                    unit: item.unit || "",
                    quantity: item.quantity || 0,
                    unit_price: item.unit_price || 0,
                    vat_rate: 8, // Mặc định 8%
                    details: "",
                    notes: ""
                });
            });

            alert("✨ Đã tự động lập báo giá thành công từ dữ liệu Dự toán!");
        } catch (err: any) {
            console.error(err);
            alert("Lỗi khi tải dữ liệu dự toán: " + err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePrint = () => {
        const data = form.getValues();
        const LOGO_URL = "https://oshquiqzokyyawgoemql.supabase.co/storage/v1/object/sign/logo/53350f6b-9e2e-4a99-aaff-33ed9f89f362/KG%20Logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYTI4MzQ5Ni1iODVhLTQwMmYtYWU0NS1lMGYyMmU3ZDRjOGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvLzUzMzUwZjZiLTllMmUtNGE5OS1hYWZmLTMzZWQ5Zjg5ZjM2Mi9LRyBMb2dvLnBuZyIsImlhdCI6MTc2Nzc4NDUzMSwiZXhwIjo2MDg3Nzg0NTMxfQ.V9jUhkfi9TPss2WKkNhay5tqV6A7Xb3lH7Lyy0L53OY";

        if (!data.quotation_number || !data.title) {
            alert("Vui lòng nhập Số báo giá và Hạng mục trước khi in!");
            return;
        }

        const printWindow = window.open('', '_blank');
        if (!printWindow) return alert("Vui lòng cho phép popup để in!");

        let htmlRows = '';
        let sectionIndex = 0;
        let itemIndex = 0;
        const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

        (data.items as any[]).forEach((item) => {
            if (item.item_type === 'section') {
                const roman = romans[sectionIndex] || (sectionIndex + 1);
                htmlRows += `
                    <tr style="background-color: #f3f4f6; font-weight: bold;">
                        <td style="text-align: center;">${roman}</td>
                        <td colspan="6" style="text-transform: uppercase;">${item.work_item_name}</td>
                    </tr>
                `;
                sectionIndex++;
                itemIndex = 0;
            } else {
                itemIndex++;
                const qty = Number(item.quantity) || 0;
                const price = Number(item.unit_price) || 0;
                const amount = qty * price;

                htmlRows += `
                    <tr>
                        <td style="text-align: center; vertical-align: middle;">${itemIndex}</td>
                        <td style="vertical-align: middle; white-space: pre-wrap; padding: 6px;">
                            <div style="font-weight: 500;">${item.work_item_name}</div>
                            ${item.details ? `<div style="font-size: 11pt; color: #333; margin-top: 2px;">- ${item.details}</div>` : ''}
                        </td>
                        <td style="text-align: center; vertical-align: middle;">${item.unit || ''}</td>
                        <td style="text-align: center; vertical-align: middle;">${qty > 0 ? qty.toLocaleString('vi-VN') : ''}</td>
                        <td style="text-align: right; vertical-align: middle;">${price > 0 ? price.toLocaleString('vi-VN') : ''}</td>
                        <td style="text-align: right; vertical-align: middle; font-weight: bold;">${amount > 0 ? amount.toLocaleString('vi-VN') : ''}</td>
                        <td style="text-align: left; vertical-align: middle; white-space: pre-wrap;">${item.notes || ''}</td>
                    </tr>
                `;
            }
        });

        const htmlContent = `
          <html>
          <head>
            <title>Báo Giá - ${data.quotation_number}</title>
            <style>
              body { font-family: 'Times New Roman', serif; font-size: 12pt; padding: 20px; line-height: 1.3; }
              .header-table { width: 100%; border: none; margin-bottom: 10px; }
              .logo-img { max-height: 70px; width: auto; object-fit: contain; }
              .info-box { margin-bottom: 15px; }
              .info-row { display: flex; margin-bottom: 5px; }
              .info-label { font-weight: bold; width: 110px; flex-shrink: 0; }
              .title { text-align: center; font-size: 16pt; font-weight: bold; margin: 15px 0; text-transform: uppercase; color: #b91c1c; }
              .main-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 11pt; table-layout: fixed; }
              .main-table th, .main-table td { border: 1px solid #333; padding: 5px; word-wrap: break-word; }
              .main-table th { background-color: #e5e7eb; text-align: center; font-weight: bold; vertical-align: middle; }
              .footer-money { margin-top: 10px; font-weight: bold; font-style: italic; text-align: right; }
              .footer-notes { margin-top: 20px; border: 1px dashed #ccc; padding: 10px; font-size: 11pt; white-space: pre-wrap; text-align: justify; }
              .sign-box { display: flex; justify-content: space-between; margin-top: 30px; text-align: center; }
              .col-stt { width: 5%; } .col-name { width: 35%; } .col-unit { width: 8%; } .col-qty { width: 8%; } .col-price { width: 12%; } .col-amount { width: 12%; } .col-note { width: 20%; }
              @media print { @page { margin: 1cm 1.5cm; } body { -webkit-print-color-adjust: exact; } }
            </style>
          </head>
          <body>
            <table class="header-table">
              <tr>
                <td width="120" style="vertical-align: top;">
                    <img src="${LOGO_URL}" class="logo-img" alt="Logo Kiều Gia" onerror="this.onerror=null; this.src='https://via.placeholder.com/150x70?text=LOGO+ERROR';"/>
                </td>
                <td style="padding-left: 15px;">
                  <div style="font-size: 14pt; font-weight: bold; color: #b91c1c; text-transform: uppercase;">CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA</div>
                  <div>ĐC: 72 Đường số 1, Khu nhà ở Thắng Lợi, KP. Chiêu Liêu, P. Dĩ An, TP.HCM</div>
                  <div>Email: huy-kq@kieugia-construction.biz.vn - Hotline: 0918 265 365</div>
                  <div>MST: 3703296412</div>
                </td>
              </tr>
            </table>

            <div class="title">BẢNG BÁO GIÁ</div>
            
            <div class="info-box">
                <div class="info-row"><span class="info-label">KÍNH GỬI:</span> <span style="font-weight:bold;">${data.customer_name ? data.customer_name.toUpperCase() : 'QUÝ KHÁCH HÀNG'}</span></div>
                <div class="info-row"><span class="info-label">CÔNG TRÌNH:</span> <span style="font-weight:bold;">${data.project_name ? data.project_name.toUpperCase() : ''}</span></div>
                <div class="info-row"><span class="info-label">HẠNG MỤC:</span> <span>${data.title}</span></div>
                <div class="info-row"><span class="info-label">ĐỊA ĐIỂM:</span> <span>${data.address}</span></div>
                <div class="info-row"><span class="info-label">SỐ BÁO GIÁ:</span> <span>${data.quotation_number}</span> &nbsp;&nbsp;|&nbsp;&nbsp; <b>${formatDateVN(data.issue_date).toUpperCase()}</b></div>
            </div>
            
            <table class="main-table">
              <colgroup><col class="col-stt"><col class="col-name"><col class="col-unit"><col class="col-qty"><col class="col-price"><col class="col-amount"><col class="col-note"></colgroup>
              <thead><tr><th>STT</th><th>Danh mục công tác / Diễn giải</th><th>ĐVT</th><th>KL</th><th>Đơn giá</th><th>Thành tiền</th><th>Ghi chú</th></tr></thead>
              <tbody>${htmlRows}</tbody>
              <tfoot>
                 <tr><td colspan="5" style="text-align: right; font-weight: bold;">Cộng trước thuế:</td><td style="text-align: right; font-weight: bold;">${preTaxTotal.toLocaleString('vi-VN')}</td><td style="background-color: #eee;"></td></tr>
                 <tr><td colspan="5" style="text-align: right; font-weight: bold;">Thuế VAT:</td><td style="text-align: right; font-weight: bold;">${vatTotal.toLocaleString('vi-VN')}</td><td style="background-color: #eee;"></td></tr>
                 <tr style="background-color: #fff7ed;"><td colspan="5" style="text-align: right; font-weight: bold; font-size: 12pt;">TỔNG CỘNG:</td><td style="text-align: right; font-weight: bold; font-size: 12pt; color: #b91c1c;">${totalAmount.toLocaleString('vi-VN')}</td><td style="background-color: #eee;"></td></tr>
              </tfoot>
            </table>

            <div class="footer-money">Bằng chữ: ${readMoneyToText(totalAmount)}</div>

            ${data.notes ? `<div class="footer-notes"><strong>* Ghi chú / Điều khoản:</strong><br/>${data.notes}</div>` : ''}

            <div class="sign-box">
              <div style="width: 40%"><strong>ĐẠI DIỆN KHÁCH HÀNG</strong><br/><i>(Ký, ghi rõ họ tên)</i></div>
              <div style="width: 40%"><strong>GIÁM ĐỐC</strong><br/><i>(Ký, đóng dấu)</i><br/><br/><br/><br/><strong>KIỀU QUANG HUY</strong></div>
            </div>
            <script>window.onload = function() { window.print(); }</script>
          </body>
          </html>
        `;
        printWindow.document.write(htmlContent);
        printWindow.document.close();
    };

    const onSubmit: SubmitHandler<QuotationFormValues> = async (data) => {
        setIsSubmitting(true)
        setServerError(null)
        try {
            const customerId = project?.customer?.id || project?.customers?.id || project?.customer_id || initialData?.customer_id;

            if (!customerId) {
                throw new Error("Không tìm thấy thông tin Khách hàng trong dự án. Vui lòng kiểm tra lại dự án.");
            }

            const payload: QuotationInput = {
                id: data.id || '',
                project_id: data.project_id,
                customer_id: customerId,
                quotation_number: data.quotation_number,
                title: data.title,
                issue_date: data.issue_date,
                status: data.status,
                notes: data.notes,
                total_amount: totalAmount,
                items: data.items.map(item => ({
                    id: item.id?.startsWith('new-') ? undefined : item.id,
                    item_type: item.item_type,
                    work_item_name: item.work_item_name,
                    details: item.details,
                    unit: item.unit,
                    quantity: item.quantity || 0,
                    unit_price: item.unit_price || 0,
                    vat_rate: item.vat_rate || 0,
                    notes: item.notes
                }))
            };

            const result = await saveQuotation(payload);
            if (result.success) {
                alert("Đã lưu báo giá thành công!");
                router.refresh();
                if (onSuccess) onSuccess();
            } else {
                setServerError(result.error || "Lỗi server");
            }
        } catch (e: any) {
            setServerError(e.message);
        } finally {
            setIsSubmitting(false);
        }
    }

    const onError = (errors: FieldErrors<QuotationFormValues>) => {
        console.log("Validation Errors:", errors);
        let errorMsg = "Vui lòng kiểm tra lại thông tin:\n";

        if (errors.quotation_number) errorMsg += "- Số báo giá chưa nhập\n";
        if (errors.title) errorMsg += "- Hạng mục báo giá chưa nhập\n";

        if (errors.items) {
            const itemsErrors = errors.items as any[];
            if (Array.isArray(itemsErrors)) {
                itemsErrors.forEach((err, idx) => {
                    if (err) {
                        errorMsg += `- Dòng ${idx + 1}: ${err.work_item_name?.message || err.unit?.message || 'Thiếu thông tin'}\n`;
                    }
                });
            } else {
                errorMsg += "- Có lỗi trong danh sách công việc\n";
            }
        }

        alert(errorMsg);
    };

    return (
        <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6 animate-in fade-in duration-500">
            {serverError && <Alert variant="destructive"><AlertTitle>Lỗi</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert>}

            <div className="flex justify-between items-center bg-white p-4 rounded-lg border shadow-sm sticky top-0 z-20">
                <h2 className="text-lg font-bold text-gray-800">Soạn thảo Báo giá</h2>
                <div className="flex gap-2">
                    <Button type="button" variant="outline" onClick={handlePrint} className="gap-2 text-indigo-600 bg-indigo-50 border-indigo-200">
                        <Printer className="w-4 h-4" /> In Báo Giá
                    </Button>
                    <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 min-w-[120px]">
                        {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label>Số Báo Giá <span className="text-red-500">*</span></Label>
                        <Input {...form.register("quotation_number")} />
                        {form.formState.errors.quotation_number?.message &&
                            <p className="text-red-500 text-xs">{form.formState.errors.quotation_number.message as string}</p>
                        }
                    </div>
                    <div className="space-y-2">
                        <Label>Ngày Báo Giá</Label>
                        <Input type="date" {...form.register("issue_date")} />
                        {form.formState.errors.issue_date?.message &&
                            <p className="text-red-500 text-xs">{form.formState.errors.issue_date.message as string}</p>
                        }
                    </div>

                    <div className="space-y-2">
                        <Label>KÍNH GỬI (Tự động từ Project)</Label>
                        <Input {...form.register("customer_name")} className="bg-slate-50 font-bold" />
                    </div>
                    <div className="space-y-2">
                        <Label>CÔNG TRÌNH (Tự động từ Project)</Label>
                        <Input {...form.register("project_name")} className="bg-slate-50 font-bold" />
                    </div>
                    <div className="col-span-2 space-y-2">
                        <Label>ĐỊA ĐIỂM (Tự động từ Project - Có thể sửa)</Label>
                        <Input {...form.register("address")} className="bg-slate-50" />
                    </div>

                    <div className="col-span-2 space-y-2">
                        <Label>HẠNG MỤC (Tiêu đề báo giá) <span className="text-red-500">*</span></Label>
                        <Input {...form.register("title")} placeholder="VD: CẢI TẠO NỘI THẤT..." className="font-bold" />
                        {form.formState.errors.title?.message &&
                            <p className="text-red-500 text-xs">{form.formState.errors.title.message as string}</p>
                        }
                    </div>

                    <div className="col-span-2 space-y-2">
                        <Label>Ghi chú (Hiện cuối trang)</Label>
                        <Textarea {...form.register("notes")} placeholder="Điều khoản thanh toán, bảo hành..." />
                    </div>
                </CardContent>
            </Card>

            <Card className="overflow-hidden">
                <div className="bg-slate-50 p-3 border-b flex flex-wrap justify-between items-center gap-2">
                    <h3 className="font-semibold text-slate-700 flex items-center"><Calculator className="w-4 h-4 mr-2" /> Chi tiết</h3>
                    <div className="flex gap-2">
                        {/* ✅ NÚT MỚI: TỰ ĐỘNG FILL TỪ BẢNG DỰ TOÁN */}
                        <Button
                            type="button"
                            size="sm"
                            onClick={handleImportFromEstimation}
                            disabled={isSubmitting}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md animate-pulse-once"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "✨ Lập Báo Giá Tự Động"}
                        </Button>

                        <Button type="button" size="sm" variant="outline" onClick={() => append({ item_type: 'section', work_item_name: 'I. TÊN MỤC LỚN', vat_rate: 0 })} className="text-green-700 border-green-200">
                            <Plus className="w-3 h-3 mr-1" /> Thêm Mục
                        </Button>
                        <Button type="button" size="sm" onClick={() => append({ item_type: 'item', work_item_name: '', unit: '', quantity: 1, unit_price: 0, vat_rate: 8, details: '', notes: '' })} className="bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-3 h-3 mr-1" /> Thêm Việc
                        </Button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                            <tr>
                                <th className="px-2 py-3 w-[5%] text-center">TT</th>
                                <th className="px-2 py-3 w-[30%]">Nội dung / Diễn giải</th>
                                <th className="px-2 py-3 w-[8%] text-center">ĐVT</th>
                                <th className="px-2 py-3 w-[8%] text-center">KL</th>
                                <th className="px-2 py-3 w-[12%] text-right">Đơn giá</th>
                                <th className="px-2 py-3 w-[8%] text-center">VAT</th>
                                <th className="px-2 py-3 w-[12%] text-right">Thành tiền</th>
                                <th className="px-2 py-3 w-[12%] text-left">Ghi chú</th>
                                <th className="w-[5%]"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {fields.map((field, index) => {
                                const type = form.watch(`items.${index}.item_type`);
                                const itemError = (form.formState.errors.items as any)?.[index];

                                if (type === 'section') {
                                    return (
                                        <tr key={field.id} className="bg-green-50/50 border-b">
                                            <td className="px-1 py-2 flex flex-col gap-1 items-center justify-center">
                                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => index > 0 && move(index, index - 1)}><ArrowUp className="w-3 h-3" /></Button>
                                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5" onClick={() => index < fields.length - 1 && move(index, index + 1)}><ArrowDown className="w-3 h-3" /></Button>
                                            </td>
                                            <td colSpan={7} className="px-2 py-2">
                                                <Input
                                                    {...form.register(`items.${index}.work_item_name`)}
                                                    className={`font-bold text-green-800 border-green-200 bg-transparent focus:bg-white uppercase ${itemError?.work_item_name ? 'border-red-500' : ''}`}
                                                    placeholder="TÊN MỤC LỚN"
                                                />
                                            </td>
                                            <td className="text-center px-2">
                                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-400"><Trash2 className="w-4 h-4" /></Button>
                                            </td>
                                        </tr>
                                    );
                                }

                                const qty = form.watch(`items.${index}.quantity`) || 0;
                                const price = form.watch(`items.${index}.unit_price`) || 0;
                                const vat = form.watch(`items.${index}.vat_rate`) || 0;
                                const total = qty * price * (1 + vat / 100);

                                return (
                                    <tr key={field.id} className="border-b hover:bg-slate-50 group align-top">
                                        <td className="px-1 py-4 flex flex-col gap-1 items-center justify-center">
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-gray-200" onClick={() => index > 0 && move(index, index - 1)}><ArrowUp className="w-3 h-3 text-gray-500" /></Button>
                                            <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-gray-200" onClick={() => index < fields.length - 1 && move(index, index + 1)}><ArrowDown className="w-3 h-3 text-gray-500" /></Button>
                                        </td>
                                        <td className="px-2 py-2 space-y-1">
                                            <Textarea
                                                {...form.register(`items.${index}.work_item_name`)}
                                                placeholder="Tên công việc..."
                                                className={`font-medium min-h-[36px] border-slate-200 resize-none overflow-hidden ${itemError?.work_item_name ? 'border-red-500 bg-red-50' : ''}`}
                                                rows={1}
                                                onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                                            />
                                            <Textarea
                                                {...form.register(`items.${index}.details`)}
                                                placeholder="Diễn giải: (5x5)..."
                                                className="text-gray-600 min-h-[30px] border-dashed border-slate-200 bg-slate-50/50 resize-none"
                                                rows={1}
                                                onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                                            />
                                        </td>
                                        <td className="px-1 py-2"><Input {...form.register(`items.${index}.unit`)} placeholder="ĐVT" className="text-center h-9" /></td>
                                        <td className="px-1 py-2"><Input type="number" step="0.01" {...form.register(`items.${index}.quantity`)} className="text-center h-9" /></td>
                                        <td className="px-1 py-2"><Input type="number" {...form.register(`items.${index}.unit_price`)} className="text-right h-9" /></td>
                                        <td className="px-1 py-2">
                                            <Select defaultValue={String(form.getValues(`items.${index}.vat_rate`))} onValueChange={(val) => form.setValue(`items.${index}.vat_rate`, Number(val))}>
                                                <SelectTrigger className="h-9 px-1 justify-center"><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="0">0%</SelectItem>
                                                    <SelectItem value="5">5%</SelectItem>
                                                    <SelectItem value="8">8%</SelectItem>
                                                    <SelectItem value="10">10%</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </td>
                                        <td className="px-2 py-4 text-right font-medium text-slate-700 w-[120px]">{formatCurrency(total)}</td>
                                        <td className="px-1 py-2">
                                            <Textarea
                                                {...form.register(`items.${index}.notes`)}
                                                placeholder="Ghi chú"
                                                className="text-left text-xs min-h-[36px] resize-none"
                                                rows={1}
                                                onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }}
                                            />
                                        </td>
                                        <td className="px-2 py-2 text-center">
                                            <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-4 h-4" /></Button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="bg-slate-50 p-4 border-t flex flex-col items-end gap-1">
                    <div className="flex justify-between w-full md:w-1/3 text-sm text-slate-600"><span>Cộng trước thuế:</span><span className="font-medium">{formatCurrency(preTaxTotal)}</span></div>
                    <div className="flex justify-between w-full md:w-1/3 text-sm text-slate-600"><span>Tổng tiền thuế VAT:</span><span className="font-medium">{formatCurrency(vatTotal)}</span></div>
                    <div className="flex justify-between w-full md:w-1/3 text-lg font-bold text-blue-700 border-t border-slate-300 pt-2 mt-1"><span>TỔNG CỘNG:</span><span>{formatCurrency(totalAmount)}</span></div>
                    <div className="text-xs text-slate-500 italic mt-1">{readMoneyToText(totalAmount)}</div>
                </div>
            </Card>
        </form>
    )
}