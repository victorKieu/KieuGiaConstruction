"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarIcon, Loader2, Save, Wand2 } from "lucide-react";
import { format } from "date-fns";
import { vi } from "date-fns/locale";
import { toast } from "sonner";

import { cn } from "@/lib/utils/utils"; // Hàm cn của bạn
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import { contractSchema, ContractFormValues } from "@/lib/schemas/contract";
import { createContractFromQuotation } from "@/lib/action/contractActions";
import { getContractTemplates } from "@/lib/action/template"; // Import action mới
import { ContractGenerator } from "./contract-generator"; // Import Generator
import { useEffect, useState } from "react"; // Thêm useEffect
export function ContractForm({ customers }: {
    customers: {
        id: string;
        name: string;
        type: string;
        contact_person?: string | null; // Người đại diện
        title?: string | null;          // Chức vụ
        tax_code?: string | null;
        address?: string | null;
        phone?: string | null;
        email?: string | null;
    }[]
}) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [templates, setTemplates] = useState<any[]>([]);

    useEffect(() => {
        getContractTemplates().then(setTemplates);
    }, []);

    const form = useForm<ContractFormValues>({
        resolver: zodResolver(contractSchema),
        defaultValues: {
            contract_number: "",
            title: "",
            value: 0,
            status: "draft",
        },
    });

    // Hàm tự sinh mã hợp đồng: HĐ-2024/KG-XXXX
    const generateContractNumber = () => {
        const year = new Date().getFullYear();
        const random = Math.floor(1000 + Math.random() * 9000); // 4 số ngẫu nhiên
        const code = `HĐ-${year}/KG-${random}`;
        form.setValue("contract_number", code);
        toast.info(`Đã sinh mã: ${code}`);
    };

    async function onSubmit(data: ContractFormValues) {
        setLoading(true);
        try {
            const result = await createContractAction(data);
            if (result.success) {
                toast.success(result.message);
                router.push("/crm/contracts");
                router.refresh();
            } else {
                toast.error(result.error);
            }
        } catch (error) {
            toast.error("Lỗi kết nối máy chủ");
        } finally {
            setLoading(false);
        }
    }
    const watchedValues = form.watch(); // Watch all fields
    const selectedCustomer = customers.find(c => c.id === watchedValues.customer_id);

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

                <div className="grid gap-6 md:grid-cols-2">
                    {/* Mã Hợp Đồng & Button Tự sinh */}
                    <FormField
                        control={form.control}
                        name="contract_number"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Số Hợp Đồng <span className="text-red-500">*</span></FormLabel>
                                <div className="flex gap-2">
                                    <FormControl>
                                        <Input placeholder="VD: HĐ-2024/KG-001" {...field} />
                                    </FormControl>
                                    <Button type="button" variant="outline" size="icon" onClick={generateContractNumber} title="Tự sinh mã">
                                        <Wand2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Khách hàng */}
                    <FormField
                        control={form.control}
                        name="customer_id"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Khách hàng <span className="text-red-500">*</span></FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Chọn khách hàng" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {customers.map((c) => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Tên gói thầu */}
                    <FormField
                        control={form.control}
                        name="title"
                        render={({ field }) => (
                            <FormItem className="col-span-2">
                                <FormLabel>Tên gói thầu/Hạng mục <span className="text-red-500">*</span></FormLabel>
                                <FormControl>
                                    <Input placeholder="VD: Thi công phần thô biệt thự Mr. Hùng" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Giá trị hợp đồng */}
                    <FormField
                        control={form.control}
                        name="value"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Giá trị hợp đồng (VNĐ)</FormLabel>
                                <FormControl>
                                    <Input type="number" placeholder="0" {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Trạng thái */}
                    <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>Trạng thái</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="draft">Bản nháp</SelectItem>
                                        <SelectItem value="signed">Đã ký kết</SelectItem>
                                        <SelectItem value="processing">Đang thi công</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    {/* Ngày ký */}
                    <FormField
                        control={form.control}
                        name="signed_date"
                        render={({ field }) => (
                            <FormItem className="flex flex-col">
                                <FormLabel>Ngày ký kết <span className="text-red-500">*</span></FormLabel>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <FormControl>
                                            <Button variant="outline" className={cn("pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                                                {field.value ? format(field.value, "PPP", { locale: vi }) : <span>Chọn ngày</span>}
                                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                            </Button>
                                        </FormControl>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="start">
                                        <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                                    </PopoverContent>
                                </Popover>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>
                <div className="col-span-2 mt-6">
                    <h3 className="text-lg font-semibold mb-4 border-b pb-2">Soạn thảo nội dung</h3>
                    <ContractGenerator
                        templates={templates}
                        customer={selectedCustomer}
                        contractData={{
                            contract_number: watchedValues.contract_number,
                            value: watchedValues.value,
                            signed_date: watchedValues.signed_date,
                            start_date: watchedValues.start_date,
                            end_date: watchedValues.end_date,
                        }}
                        onContentGenerated={(content) => form.setValue("content", content)} // Lưu vào form
                    />
                </div>
                <div className="flex justify-end gap-4">
                    <Button type="button" variant="outline" onClick={() => router.back()}>Hủy bỏ</Button>
                    <Button type="submit" disabled={loading}>
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Lưu hợp đồng
                    </Button>
                </div>
            </form>
        </Form>
    );
}