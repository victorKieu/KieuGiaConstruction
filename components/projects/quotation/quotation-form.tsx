"use client"

import { useState, useRef } from "react"
import { useForm, useFieldArray, useWatch, SubmitHandler, FieldErrors } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Save, Loader2, Calculator, Printer, ArrowUp, ArrowDown, FileText } from "lucide-react"
import { formatCurrency, formatDateVN } from "@/lib/utils/utils"
import { saveQuotation, type QuotationInput } from "@/lib/action/quotationActions"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { readMoneyToText } from "@/lib/utils/readNumber"
import { createClient } from "@/lib/supabase/client"
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog"

const LOGO_URL = "https://oshquiqzokyyawgoemql.supabase.co/storage/v1/object/sign/logo/53350f6b-9e2e-4a99-aaff-33ed9f89f362/KG%20Logo.png?token=eyJraWQiOiJzdG9yYWdlLXVybC1zaWduaW5nLWtleV8wYTI4MzQ5Ni1iODVhLTQwMmYtYWU0NS1lMGYyMmU3ZDRjOGEiLCJhbGciOiJIUzI1NiJ9.eyJ1cmwiOiJsb2dvLzUzMzUwZjZiLTllMmUtNGE5OS1hYWZmLTMzZWQ5Zjg5ZjM2Mi9LRyBMb2dvLnBuZyIsImlhdCI6MTc2Nzc4NDUzMSwiZXhwIjo2MDg3Nzg0NTMxfQ.V9jUhkfi9TPss2WKkNhay5tqV6A7Xb3lH7Lyy0L53OY";

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

    const [previewOpen, setPreviewOpen] = useState(false)
    const [previewData, setPreviewData] = useState<any>(null)
    const printRef = useRef<HTMLDivElement>(null)

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

    const { fields, append, remove, move, replace } = useFieldArray({
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

    const handleImportFromEstimation = async () => {
        if (!confirm("Hành động này sẽ xóa toàn bộ nội dung báo giá hiện tại bên dưới và thay thế bằng dữ liệu Bóc tách & Dự toán. Bạn có chắc chắn?")) return;
        const supabase = createClient();
        setIsSubmitting(true);

        try {
            const { data: qtoData, error: qtoError } = await supabase.from('qto_items').select('*, details:qto_item_details(*)').eq('project_id', projectId).order('created_at', { ascending: true });
            const { data: estData, error: estError } = await supabase.from('estimation_items').select('*').eq('project_id', projectId);

            if (qtoError) throw qtoError;
            if (estError) throw estError;

            if (!qtoData || qtoData.length === 0 || !estData || estData.length === 0) {
                alert("Chưa có đủ dữ liệu Tiên lượng & Dự toán. Hãy hoàn thành các bước trước!");
                return;
            }

            const normalItems = estData.filter(i => !['GT', 'LN', 'VAT'].includes(i.category));
            const globalParams = estData.filter(i => ['GT', 'LN', 'VAT'].includes(i.category));

            const gtParam = globalParams.find(i => i.category === 'GT') || { quantity: 0 };
            const lnParam = globalParams.find(i => i.category === 'LN') || { quantity: 0 };
            const vatParam = globalParams.find(i => i.category === 'VAT') || { quantity: 8 };

            const T = normalItems.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);
            const GT = T * (Number(gtParam.quantity) / 100);
            const TL = (T + GT) * (Number(lnParam.quantity) / 100);
            const Gxd = T + GT + TL;

            const markupPreTax = T > 0 ? (Gxd / T) : 1;
            const vatRate = Number(vatParam.quantity) || 0;

            const newItems: any[] = [];

            const sections = qtoData.filter(i => i.item_type === 'section' || (!i.parent_id && !i.item_type));

            sections.forEach(sec => {
                newItems.push({ item_type: 'section', work_item_name: sec.item_name.toUpperCase(), vat_rate: 0 });

                const tasks = qtoData.filter(i => i.parent_id === sec.id && i.item_type !== 'section');
                tasks.forEach(task => {
                    let taskVol = Number(task.quantity) || 0;
                    let detailsText = "";

                    if (task.details && task.details.length > 0) {
                        let volSum = 0;
                        const detailsArr: string[] = [];

                        task.details.forEach((d: any) => {
                            const exp = d.explanation || "Diễn giải";
                            const l = parseFloat(d.length) || 0, w = parseFloat(d.width) || 0, h = parseFloat(d.height) || 0, f = parseFloat(d.quantity_factor) || 0;
                            let lineVol = 0; let dimStr = "";

                            if (l === 0 && w === 0 && h === 0) {
                                lineVol = f; dimStr = f.toString();
                            } else {
                                lineVol = (l !== 0 ? l : 1) * (w !== 0 ? w : 1) * (h !== 0 ? h : 1) * (f !== 0 ? f : 1);
                                const dims = [];
                                if (f !== 0 && f !== 1) dims.push(f);
                                if (l !== 0) dims.push(l);
                                if (w !== 0) dims.push(w);
                                if (h !== 0) dims.push(h);
                                dimStr = dims.length > 0 ? dims.join(' x ') : f.toString();
                            }
                            volSum += lineVol;
                            detailsArr.push(`+ ${exp}: ${dimStr} = ${lineVol.toLocaleString('en-US', { maximumFractionDigits: 3 })}`);
                        });
                        if (taskVol === 0) taskVol = volSum;
                        detailsText = detailsArr.join('\n');
                    }

                    taskVol = Number(taskVol.toFixed(2));

                    const taskResources = normalItems.filter(i => i.qto_item_id === task.id);
                    const baseCost = taskResources.reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);
                    const quotationCostPreTax = baseCost * markupPreTax;
                    const unitPrice = taskVol > 0 ? (quotationCostPreTax / taskVol) : quotationCostPreTax;

                    newItems.push({
                        item_type: 'item', work_item_name: task.item_name, unit: task.unit || "Lần", quantity: taskVol,
                        unit_price: Math.round(unitPrice), vat_rate: vatRate, details: detailsText, notes: ""
                    });
                });
            });

            const standaloneItems = normalItems.filter(i => !i.qto_item_id);
            if (standaloneItems.length > 0) {
                newItems.push({ item_type: 'section', work_item_name: "CHI PHÍ BỔ SUNG / KHÁC", vat_rate: 0 });
                standaloneItems.forEach(item => {
                    const baseCost = Number(item.total_cost) || 0;
                    const quotationCostPreTax = baseCost * markupPreTax;

                    let qty = Number(item.quantity) || 1;
                    qty = Number(qty.toFixed(2));

                    const unitPrice = qty > 0 ? (quotationCostPreTax / qty) : quotationCostPreTax;
                    newItems.push({
                        item_type: 'item', work_item_name: item.material_name || item.original_name || "Mục khác", unit: item.unit || "Gói",
                        quantity: qty, unit_price: Math.round(unitPrice), vat_rate: vatRate, details: "", notes: ""
                    });
                });
            }

            replace(newItems);
            alert("✨ Đã tạo bảng Báo Giá Tổng Hợp thành công!");
        } catch (err: any) { alert("Lỗi khi tải dữ liệu: " + err.message); } finally { setIsSubmitting(false); }
    };

    const handleOpenPreview = () => {
        const data = form.getValues();
        if (!data.quotation_number || !data.title) {
            alert("Vui lòng nhập Số báo giá và Hạng mục trước khi in!");
            return;
        }
        setPreviewData({
            ...data,
            preTaxTotal,
            vatTotal,
            totalAmount
        });
        setPreviewOpen(true);
    };

    const handlePrintAction = () => {
        if (!printRef.current) return;
        const printContent = printRef.current.innerHTML;

        const printWindow = window.open('', '', 'width=1000,height=800');
        if (printWindow) {
            printWindow.document.write(`
                <html>
                    <head>
                        <title>In Báo Giá</title>
                        <style>
                            @page { size: A4 landscape; margin: 15mm 10mm; }
                            body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; background: #fff; color: #000; font-size: 12pt; }
                            * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                            table { page-break-inside: auto; }
                            tr { page-break-inside: avoid; page-break-after: auto; }
                            thead { display: table-header-group; }
                            .kg-avoid { page-break-inside: avoid; }
                        </style>
                    </head>
                    <body>
                        ${printContent}
                    </body>
                </html>
            `);
            printWindow.document.close();
            printWindow.focus();
            setTimeout(() => {
                printWindow.print();
                printWindow.close();
            }, 250);
        }
    };

    const onSubmit: SubmitHandler<QuotationFormValues> = async (data) => {
        setIsSubmitting(true)
        setServerError(null)
        try {
            const customerId = project?.customer?.id || project?.customers?.id || project?.customer_id || initialData?.customer_id;
            if (!customerId) throw new Error("Không tìm thấy thông tin Khách hàng trong dự án.");

            const payload: QuotationInput = {
                id: data.id || '', project_id: data.project_id, customer_id: customerId, quotation_number: data.quotation_number,
                title: data.title, issue_date: data.issue_date, status: data.status, notes: data.notes, total_amount: totalAmount,
                items: data.items.map(item => ({
                    id: item.id?.startsWith('new-') ? undefined : item.id, item_type: item.item_type, work_item_name: item.work_item_name,
                    details: item.details, unit: item.unit, quantity: item.quantity || 0, unit_price: item.unit_price || 0,
                    vat_rate: item.vat_rate || 0, notes: item.notes
                }))
            };

            const result = await saveQuotation(payload);
            if (result.success) {
                alert("Đã lưu báo giá thành công!"); router.refresh(); if (onSuccess) onSuccess();
            } else { setServerError(result.error || "Lỗi server"); }
        } catch (e: any) { setServerError(e.message); } finally { setIsSubmitting(false); }
    }

    const onError = (errors: FieldErrors<QuotationFormValues>) => {
        let errorMsg = "Vui lòng kiểm tra lại thông tin:\n";
        if (errors.quotation_number) errorMsg += "- Số báo giá chưa nhập\n";
        if (errors.title) errorMsg += "- Hạng mục báo giá chưa nhập\n";
        alert(errorMsg);
    };

    return (
        <>
            <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6 animate-in fade-in duration-500 transition-colors">
                {serverError && <Alert variant="destructive"><AlertTitle>Lỗi</AlertTitle><AlertDescription>{serverError}</AlertDescription></Alert>}

                <div className="flex justify-between items-center bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm sticky top-0 z-20 transition-colors">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Soạn thảo Báo giá</h2>
                    <div className="flex gap-2">
                        <Button type="button" variant="outline" onClick={handleOpenPreview} className="gap-2 text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-100 dark:hover:bg-indigo-900/40 transition-colors">
                            <Printer className="w-4 h-4" /> In Báo Giá
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[120px] transition-colors">
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Lưu
                        </Button>
                    </div>
                </div>

                <Card className="border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <CardContent className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Số Báo Giá <span className="text-red-500">*</span></Label>
                            <Input {...form.register("quotation_number")} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 transition-colors" />
                            {form.formState.errors.quotation_number?.message && <p className="text-red-500 text-xs">{form.formState.errors.quotation_number.message as string}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">Ngày Báo Giá</Label>
                            <Input type="date" {...form.register("issue_date")} className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 transition-colors" />
                            {form.formState.errors.issue_date?.message && <p className="text-red-500 text-xs">{form.formState.errors.issue_date.message as string}</p>}
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">KÍNH GỬI (Tự động từ Project)</Label>
                            <Input {...form.register("customer_name")} className="bg-slate-50 dark:bg-slate-900/50 font-bold dark:text-slate-300 dark:border-slate-800 transition-colors" />
                        </div>
                        <div className="space-y-2">
                            <Label className="dark:text-slate-300">CÔNG TRÌNH (Tự động từ Project)</Label>
                            <Input {...form.register("project_name")} className="bg-slate-50 dark:bg-slate-900/50 font-bold dark:text-slate-300 dark:border-slate-800 transition-colors" />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="dark:text-slate-300">ĐỊA ĐIỂM (Tự động từ Project - Có thể sửa)</Label>
                            <Input {...form.register("address")} className="bg-slate-50 dark:bg-slate-900/50 dark:text-slate-300 dark:border-slate-800 transition-colors" />
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="dark:text-slate-300">HẠNG MỤC (Tiêu đề báo giá) <span className="text-red-500">*</span></Label>
                            <Input {...form.register("title")} placeholder="VD: CẢI TẠO NỘI THẤT..." className="font-bold dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 transition-colors" />
                            {form.formState.errors.title?.message && <p className="text-red-500 text-xs">{form.formState.errors.title.message as string}</p>}
                        </div>
                        <div className="col-span-2 space-y-2">
                            <Label className="dark:text-slate-300">Ghi chú (Hiện cuối trang)</Label>
                            <Textarea {...form.register("notes")} placeholder="Điều khoản thanh toán, bảo hành..." className="dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200 transition-colors" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
                    <div className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-3 flex flex-wrap justify-between items-center gap-2 transition-colors">
                        <h3 className="font-semibold text-slate-700 dark:text-slate-300 flex items-center"><Calculator className="w-4 h-4 mr-2" /> Chi tiết</h3>
                        <div className="flex gap-2">
                            <Button type="button" size="sm" onClick={handleImportFromEstimation} disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-md animate-pulse-once transition-colors">
                                {isSubmitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : "✨ Lập Báo Giá Tự Động"}
                            </Button>
                            <Button type="button" size="sm" variant="outline" onClick={() => append({ item_type: 'section', work_item_name: 'I. TÊN MỤC LỚN', vat_rate: 0 })} className="text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                                <Plus className="w-3 h-3 mr-1" /> Thêm Mục
                            </Button>
                            <Button type="button" size="sm" onClick={() => append({ item_type: 'item', work_item_name: '', unit: '', quantity: 1, unit_price: 0, vat_rate: 8, details: '', notes: '' })} className="bg-blue-600 hover:bg-blue-700 text-white transition-colors">
                                <Plus className="w-3 h-3 mr-1" /> Thêm Việc
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-700 dark:text-slate-300 uppercase bg-slate-100 dark:bg-slate-800/50 border-b dark:border-slate-800 transition-colors">
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
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 transition-colors">
                                {fields.map((field, index) => {
                                    const type = form.watch(`items.${index}.item_type`);
                                    const itemError = (form.formState.errors.items as any)?.[index];

                                    if (type === 'section') {
                                        return (
                                            <tr key={field.id} className="bg-green-50/50 dark:bg-green-900/10 border-b dark:border-green-900/30 transition-colors">
                                                <td className="px-1 py-2 flex flex-col gap-1 items-center justify-center">
                                                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 dark:text-slate-400 dark:hover:bg-slate-800" onClick={() => index > 0 && move(index, index - 1)}><ArrowUp className="w-3 h-3" /></Button>
                                                    <Button type="button" variant="ghost" size="icon" className="h-5 w-5 dark:text-slate-400 dark:hover:bg-slate-800" onClick={() => index < fields.length - 1 && move(index, index + 1)}><ArrowDown className="w-3 h-3" /></Button>
                                                </td>
                                                <td colSpan={7} className="px-2 py-2">
                                                    <Input {...form.register(`items.${index}.work_item_name`)} className={`font-bold text-green-800 dark:text-green-400 border-green-200 dark:border-green-800/50 bg-transparent focus:bg-white dark:focus:bg-slate-900 uppercase transition-colors ${itemError?.work_item_name ? 'border-red-500' : ''}`} placeholder="TÊN MỤC LỚN" />
                                                </td>
                                                <td className="text-center px-2">
                                                    <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></Button>
                                                </td>
                                            </tr>
                                        );
                                    }

                                    const qty = form.watch(`items.${index}.quantity`) || 0;
                                    const price = form.watch(`items.${index}.unit_price`) || 0;
                                    const vat = form.watch(`items.${index}.vat_rate`) || 0;
                                    const total = qty * price * (1 + vat / 100);

                                    return (
                                        <tr key={field.id} className="border-b dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 group align-top transition-colors">
                                            <td className="px-1 py-4 flex flex-col gap-1 items-center justify-center">
                                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={() => index > 0 && move(index, index - 1)}><ArrowUp className="w-3 h-3 text-slate-500 dark:text-slate-400" /></Button>
                                                <Button type="button" variant="ghost" size="icon" className="h-5 w-5 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors" onClick={() => index < fields.length - 1 && move(index, index + 1)}><ArrowDown className="w-3 h-3 text-slate-500 dark:text-slate-400" /></Button>
                                            </td>
                                            <td className="px-2 py-2 space-y-1">
                                                <Textarea {...form.register(`items.${index}.work_item_name`)} placeholder="Tên công việc..." className={`font-medium min-h-[36px] border-slate-200 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 resize-none overflow-hidden transition-colors ${itemError?.work_item_name ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : ''}`} rows={1} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} />
                                                <Textarea {...form.register(`items.${index}.details`)} placeholder="Diễn giải khối lượng..." className="text-slate-600 dark:text-slate-400 min-h-[40px] border-dashed border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50 resize-none overflow-hidden transition-colors" rows={1} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} />
                                            </td>
                                            <td className="px-1 py-2"><Input {...form.register(`items.${index}.unit`)} placeholder="ĐVT" className="text-center h-9 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 transition-colors" /></td>
                                            <td className="px-1 py-2"><Input type="number" step="0.01" {...form.register(`items.${index}.quantity`)} className="text-center h-9 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 transition-colors" /></td>
                                            <td className="px-1 py-2"><Input type="number" {...form.register(`items.${index}.unit_price`)} className="text-right h-9 dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 transition-colors" /></td>
                                            <td className="px-1 py-2">
                                                <Select defaultValue={String(form.getValues(`items.${index}.vat_rate`))} onValueChange={(val) => form.setValue(`items.${index}.vat_rate`, Number(val))}>
                                                    <SelectTrigger className="h-9 px-1 justify-center dark:bg-slate-950 dark:border-slate-700 dark:text-slate-200 transition-colors"><SelectValue /></SelectTrigger>
                                                    <SelectContent className="dark:bg-slate-900 dark:border-slate-800">
                                                        <SelectItem value="0" className="dark:text-slate-200">0%</SelectItem>
                                                        <SelectItem value="5" className="dark:text-slate-200">5%</SelectItem>
                                                        <SelectItem value="8" className="dark:text-slate-200">8%</SelectItem>
                                                        <SelectItem value="10" className="dark:text-slate-200">10%</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </td>
                                            <td className="px-2 py-4 text-right font-medium text-slate-700 dark:text-slate-300 w-[120px] transition-colors">{formatCurrency(total)}</td>
                                            <td className="px-1 py-2"><Textarea {...form.register(`items.${index}.notes`)} placeholder="Ghi chú" className="text-left text-xs min-h-[36px] resize-none dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300 transition-colors" rows={1} onInput={(e) => { e.currentTarget.style.height = 'auto'; e.currentTarget.style.height = e.currentTarget.scrollHeight + 'px'; }} /></td>
                                            <td className="px-2 py-2 text-center"><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-slate-300 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"><Trash2 className="w-4 h-4" /></Button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-900 p-4 border-t dark:border-slate-800 flex flex-col items-end gap-1 transition-colors">
                        <div className="flex justify-between w-full md:w-1/3 text-sm text-slate-600 dark:text-slate-400 transition-colors"><span>Cộng trước thuế:</span><span className="font-medium">{formatCurrency(preTaxTotal)}</span></div>
                        <div className="flex justify-between w-full md:w-1/3 text-sm text-slate-600 dark:text-slate-400 transition-colors"><span>Tổng tiền thuế VAT:</span><span className="font-medium">{formatCurrency(vatTotal)}</span></div>
                        <div className="flex justify-between w-full md:w-1/3 text-lg font-bold text-blue-700 dark:text-blue-400 border-t border-slate-300 dark:border-slate-700 pt-2 mt-1 transition-colors"><span>TỔNG CỘNG:</span><span>{formatCurrency(totalAmount)}</span></div>
                        <div className="text-xs text-slate-500 dark:text-slate-500 italic mt-1 transition-colors">{readMoneyToText(totalAmount)}</div>
                    </div>
                </Card>
            </form>

            {/* MODAL IN BÁO GIÁ */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto bg-slate-200 dark:bg-slate-900 border-none transition-colors">
                    <div className="flex justify-between items-center border-b border-slate-300 dark:border-slate-800 pb-4 mb-4 sticky top-0 bg-slate-200 dark:bg-slate-900 z-10 pt-4 px-6 -mx-6 -mt-6 shadow-sm transition-colors">
                        <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100 transition-colors">
                            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" /> Xem trước Bản In (A4 Ngang)
                        </DialogTitle>
                        <div className="flex gap-2">
                            <Button variant="outline" onClick={() => setPreviewOpen(false)} className="bg-white dark:bg-slate-950 dark:border-slate-700 dark:text-slate-300 transition-colors">Đóng</Button>
                            <Button className="bg-blue-600 hover:bg-blue-700 text-white shadow-md transition-colors" onClick={handlePrintAction}>
                                <Printer className="w-4 h-4 mr-2" /> In Báo Giá Ngay
                            </Button>
                        </div>
                    </div>

                    <div className="overflow-x-auto pb-8 flex justify-center">
                        {previewData && (
                            <div
                                ref={printRef}
                                className="print-container bg-white text-black" // PHẦN NÀY BẮT BUỘC GIỮ LẠI ĐỂ IN TRÊN GIẤY TRẮNG
                                style={{
                                    width: '297mm',
                                    minHeight: '210mm',
                                    padding: '15mm',
                                    boxSizing: 'border-box',
                                    fontFamily: '"Times New Roman", Times, serif',
                                    boxShadow: '0 10px 25px rgba(0,0,0,0.15)',
                                    margin: '0 auto'
                                }}
                            >
                                <style>{`
                                    @page { size: A4 landscape; margin: 15mm 10mm; }
                                    body { font-family: 'Times New Roman', Times, serif; margin: 0; padding: 0; background: #fff; color: #000; font-size: 12pt; }
                                    * { -webkit-print-color-adjust: exact !important; color-adjust: exact !important; }
                                    table { page-break-inside: auto; }
                                    tr { page-break-inside: avoid; page-break-after: auto; }
                                    thead { display: table-header-group; }
                                    .kg-avoid { page-break-inside: avoid; }
                                    .kg-header { width: 100%; border: none; margin-bottom: 15px; }
                                    .kg-header td { border: none; padding: 0; }
                                    .kg-title-box { text-align: center; margin: 15px 0 25px; }
                                    .kg-info-grid { display: grid; grid-template-columns: 120px 1fr 120px 1fr; gap: 6px 10px; margin-bottom: 20px; font-size: 12pt; }
                                    .kg-table { width: 100%; border-collapse: collapse; font-size: 12pt; table-layout: fixed; }
                                    .kg-table th, .kg-table td { border: 1px solid #000; padding: 6px; color: #000; }
                                    .kg-table th { background-color: #e5e7eb; text-align: center; font-weight: bold; vertical-align: middle; }
                                    .kg-sec-row td { background-color: #f3f4f6; font-weight: bold; text-transform: uppercase; color: #000; }
                                    .kg-tfoot td { text-align: right; font-weight: bold; border: 1px solid #000; padding: 6px; color: #000; }
                                    .kg-total-row td { background-color: #fff7ed; font-size: 14pt; color: #b91c1c; }
                                    .kg-sign-box { display: flex; justify-content: space-around; margin-top: 30px; text-align: center; color: #000; }
                                `}</style>

                                <table className="kg-header">
                                    <tbody>
                                        <tr>
                                            <td width="130" style={{ verticalAlign: 'middle', textAlign: 'center' }}>
                                                <img src={LOGO_URL} style={{ maxHeight: '70px', width: 'auto', objectFit: 'contain' }} alt="Logo" />
                                            </td>
                                            <td style={{ paddingLeft: '15px', verticalAlign: 'middle', color: '#000' }}>
                                                <div style={{ fontSize: '14pt', fontWeight: 'bold', color: '#b91c1c', textTransform: 'uppercase', marginBottom: '4px' }}>CÔNG TY TNHH TM DV XÂY DỰNG KIỀU GIA</div>
                                                <div style={{ fontSize: '11pt' }}>ĐC: 72 Đường số 1, Khu nhà ở Thắng Lợi, KP. Chiêu Liêu, P. Dĩ An, TP.HCM, Việt Nam</div>
                                                <div style={{ fontSize: '11pt' }}>Email: huy-kq@kieugia-construction.biz.vn - Hotline: 0918 265 365</div>
                                                <div style={{ fontSize: '11pt' }}>MST: 3703296412</div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="kg-title-box">
                                    <h1 style={{ fontSize: '22pt', fontWeight: 'bold', textTransform: 'uppercase', color: '#b91c1c', margin: 0, letterSpacing: '1px' }}>BẢNG BÁO GIÁ</h1>
                                    <div style={{ fontSize: '12pt', fontStyle: 'italic', marginTop: '5px', color: '#000' }}>Số: {previewData.quotation_number} | {formatDateVN(previewData.issue_date)}</div>
                                </div>

                                <div className="kg-info-grid" style={{ color: '#000' }}>
                                    <div style={{ fontWeight: 'bold' }}>KÍNH GỬI:</div>
                                    <div style={{ fontWeight: 'bold' }}>Ông/ Bà {previewData.customer_name ? previewData.customer_name.toUpperCase() : 'QUÝ KHÁCH HÀNG'}</div>
                                    <div style={{ fontWeight: 'bold', textAlign: 'right' }}>CÔNG TRÌNH:</div>
                                    <div style={{ fontWeight: 'bold' }}>{previewData.project_name ? previewData.project_name.toUpperCase() : ''}</div>
                                    <div style={{ fontWeight: 'bold', gridColumn: '1 / 2' }}>HẠNG MỤC:</div>
                                    <div style={{ gridColumn: '2 / -1' }}>{previewData.title}</div>
                                    <div style={{ fontWeight: 'bold', gridColumn: '1 / 2' }}>ĐỊA ĐIỂM:</div>
                                    <div style={{ gridColumn: '2 / -1' }}>{previewData.address || ''}</div>
                                </div>

                                <table className="kg-table">
                                    <colgroup>
                                        <col style={{ width: '5%' }} />
                                        <col style={{ width: '33%' }} />
                                        <col style={{ width: '6%' }} />
                                        <col style={{ width: '8%' }} />
                                        <col style={{ width: '12%' }} />
                                        <col style={{ width: '13%' }} />
                                        <col style={{ width: '23%' }} />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th>STT</th>
                                            <th>Danh mục công tác / Diễn giải</th>
                                            <th>ĐVT</th>
                                            <th>Khối lượng</th>
                                            <th>Đơn giá (VNĐ)</th>
                                            <th>Thành tiền (VNĐ)</th>
                                            <th>Ghi chú</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {(() => {
                                            let sectionIndex = 0; let itemIndex = 0;
                                            const romans = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];
                                            return previewData.items.map((item: any, index: number) => {
                                                if (item.item_type === 'section') {
                                                    const roman = romans[sectionIndex] || (sectionIndex + 1);
                                                    sectionIndex++; itemIndex = 0;
                                                    return (
                                                        <tr key={index} className="kg-sec-row">
                                                            <td style={{ textAlign: 'center' }}>{roman}</td>
                                                            <td colSpan={6}>{item.work_item_name}</td>
                                                        </tr>
                                                    );
                                                } else {
                                                    itemIndex++;
                                                    const qty = Number(item.quantity) || 0;
                                                    const price = Number(item.unit_price) || 0;
                                                    const amount = qty * price;
                                                    return (
                                                        <tr key={index}>
                                                            <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '8px' }}>{itemIndex}</td>
                                                            <td style={{ verticalAlign: 'top', padding: '8px' }}>
                                                                <div style={{ fontWeight: 'bold' }}>{item.work_item_name}</div>
                                                                {item.details && item.details.split('\n').map((l: string, i: number) => (
                                                                    <div key={i} style={{ fontSize: '11pt', color: '#4b5563', marginTop: '3px', fontStyle: 'italic' }}>{l}</div>
                                                                ))}
                                                            </td>
                                                            <td style={{ textAlign: 'center', verticalAlign: 'top', paddingTop: '8px' }}>{item.unit || ''}</td>
                                                            <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '8px' }}>{qty > 0 ? qty.toLocaleString('vi-VN', { maximumFractionDigits: 3 }) : ''}</td>
                                                            <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '8px' }}>{price > 0 ? price.toLocaleString('vi-VN') : ''}</td>
                                                            <td style={{ textAlign: 'right', verticalAlign: 'top', paddingTop: '8px', fontWeight: 'bold' }}>{amount > 0 ? amount.toLocaleString('vi-VN') : ''}</td>
                                                            <td style={{ textAlign: 'left', verticalAlign: 'top', paddingTop: '8px' }}>{item.notes || ''}</td>
                                                        </tr>
                                                    );
                                                }
                                            });
                                        })()}
                                        <tr className="kg-tfoot">
                                            <td colSpan={5}>Cộng trước thuế:</td>
                                            <td>{previewData.preTaxTotal.toLocaleString('vi-VN')}</td>
                                            <td></td>
                                        </tr>
                                        <tr className="kg-tfoot">
                                            <td colSpan={5}>Thuế VAT:</td>
                                            <td>{previewData.vatTotal.toLocaleString('vi-VN')}</td>
                                            <td></td>
                                        </tr>
                                        <tr className="kg-tfoot kg-total-row">
                                            <td colSpan={5}>TỔNG CỘNG ĐÃ BAO GỒM THUẾ VAT:</td>
                                            <td style={{ color: '#b91c1c' }}>{previewData.totalAmount.toLocaleString('vi-VN')}</td>
                                            <td></td>
                                        </tr>
                                    </tbody>
                                </table>

                                <div className="kg-avoid" style={{ pageBreakInside: 'avoid', color: '#000' }}>
                                    <div style={{ marginTop: '15px', fontWeight: 'bold', fontStyle: 'italic', textAlign: 'right', fontSize: '13pt' }}>
                                        Bằng chữ: {readMoneyToText(previewData.totalAmount)}
                                    </div>
                                    {previewData.notes && (
                                        <div style={{ marginTop: '20px', border: '1px dashed #9ca3af', padding: '15px', fontSize: '12pt', whiteSpace: 'pre-wrap', textAlign: 'justify', background: '#fafafa' }}>
                                            <strong>* Ghi chú / Điều khoản:</strong><br />
                                            {previewData.notes}
                                        </div>
                                    )}
                                    <div className="kg-sign-box">
                                        <div style={{ width: '40%' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>ĐẠI DIỆN KHÁCH HÀNG</div>
                                            <span style={{ fontStyle: 'italic', fontSize: '11pt', marginBottom: '80px', display: 'block' }}>(Ký, ghi rõ họ tên)</span>
                                        </div>
                                        <div style={{ width: '40%' }}>
                                            <div style={{ fontWeight: 'bold', fontSize: '13pt' }}>GIÁM ĐỐC</div>
                                            <span style={{ fontStyle: 'italic', fontSize: '11pt', marginBottom: '80px', display: 'block' }}>(Ký, đóng dấu)</span>
                                            <div style={{ fontWeight: 'bold', fontSize: '13pt', textTransform: 'uppercase' }}>KIỀU QUANG HUY</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}