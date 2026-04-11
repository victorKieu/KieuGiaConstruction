"use client";

import React, { useEffect, useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { Plus, Trash2, Save, Loader2, Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils/utils";

// ✅ 1. IMPORT TYPE TỪ SUPABASE (Sửa lại đường dẫn nếu file supabase.ts của bạn nằm ở thư mục khác)
import { Database } from "@/types/supabase";

// Lấy type Insert chuẩn từ Database
type MaterialRequestInsert = Database["public"]["Tables"]["material_requests"]["Insert"];
type MaterialRequestItemInsert = Database["public"]["Tables"]["material_request_items"]["Insert"];

// ✅ 2. ĐỊNH NGHĨA FORM DATA DỰA TRÊN SUPABASE TYPE
export interface RequestItemForm {
    item_name: string;
    // Đồng bộ với DB, fallback về cứng nếu DB đang dùng kiểu string thay vì enum
    item_category: NonNullable<MaterialRequestItemInsert["item_category"]> | "material" | "asset";
    quantity: number;
    unit: string;
    estimated_price: number;
    notes: string;
}

export interface UnifiedRequestFormData {
    code: string;
    priority: "low" | "normal" | "high" | "urgent";
    deadline_date: string;
    destination_warehouse_id: string;
    notes: string;
    items: RequestItemForm[];
}

interface UnifiedRequestFormProps {
    initialData?: Partial<UnifiedRequestFormData>;
    warehouses: { id: string; name: string; location: string }[];
    budgetMaterials: any[];
    isSubmitting: boolean;
    onSubmit: (data: UnifiedRequestFormData) => void;
    onCancel: () => void;
}

// --- COMBOBOX CHỌN VẬT TƯ TRONG DỰ TOÁN ---
function MaterialCombobox({ value, onChange, onUnitChange, options }: any) {
    const [open, setOpen] = useState(false);
    const selectedItem = options.find((item: any) => item.name === value);
    return (
        <Popover open={open} onOpenChange={setOpen} modal={true}>
            <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" aria-expanded={open} className={cn("w-full justify-between font-normal text-left px-3 h-9 bg-background", !value && "text-muted-foreground")}>
                    <span className="truncate">{selectedItem ? selectedItem.name : (value || "Chọn từ dự toán...")}</span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[350px] p-0" align="start">
                <Command filter={(value, search) => value.toLowerCase().includes(search.toLowerCase()) ? 1 : 0}>
                    <CommandInput placeholder="Tìm vật tư trong dự toán..." />
                    <CommandList>
                        <CommandEmpty>Không có trong dự toán.</CommandEmpty>
                        <CommandGroup className="max-h-[300px] overflow-y-auto">
                            {options.map((item: any, index: number) => (
                                <CommandItem key={item.name + index} value={item.name} onSelect={() => { onChange(item.name); if (item.unit && onUnitChange) onUnitChange(item.unit); setOpen(false); }}>
                                    <Check className={cn("mr-2 h-4 w-4", value === item.name ? "opacity-100" : "opacity-0")} />
                                    <div className="flex flex-col w-full">
                                        <div className="flex justify-between">
                                            <span className="font-medium">{item.name}</span>
                                            {item.budget > 0 && <span className="text-[10px] bg-blue-50 dark:bg-blue-900/30 text-blue-600 px-1 rounded">Định mức: {item.budget}</span>}
                                        </div>
                                        <span className="text-[10px] text-muted-foreground">ĐVT: {item.unit}</span>
                                    </div>
                                </CommandItem>
                            ))}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    );
}

// --- MAIN FORM COMPONENT ---
export default function UnifiedRequestForm({ initialData, warehouses, budgetMaterials, isSubmitting, onSubmit, onCancel }: UnifiedRequestFormProps) {
    const form = useForm<UnifiedRequestFormData>({
        defaultValues: {
            code: initialData?.code || `MR-${Date.now().toString().slice(-6)}`,
            priority: initialData?.priority || "normal",
            deadline_date: initialData?.deadline_date || new Date().toISOString().split('T')[0],
            destination_warehouse_id: initialData?.destination_warehouse_id || "",
            notes: initialData?.notes || "",
            items: initialData?.items?.length ? initialData.items : [{ item_name: "", item_category: "material", quantity: 1, unit: "Cái", estimated_price: 0, notes: "" }]
        }
    });

    const { fields, append, remove } = useFieldArray({ control: form.control, name: "items" });

    useEffect(() => {
        if (initialData) form.reset(initialData as UnifiedRequestFormData);
    }, [initialData, form]);

    const inputStyle = "bg-background h-9 border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500";

    return (
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-5 rounded-xl border shadow-sm">
                <div className="space-y-2"><Label>Mã phiếu</Label><Input {...form.register("code")} readOnly className={`${inputStyle} bg-muted cursor-not-allowed`} /></div>

                <div className="space-y-2">
                    <Label>Mức độ ưu tiên</Label>
                    <Select defaultValue={form.getValues("priority")} onValueChange={(val: any) => form.setValue("priority", val)}>
                        <SelectTrigger className={inputStyle}><SelectValue /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="low">Thấp</SelectItem>
                            <SelectItem value="normal">Bình thường</SelectItem> {/* 👈 Sửa value thành "medium" */}
                            <SelectItem value="high">Cao</SelectItem>
                            <SelectItem value="urgent">Khẩn cấp</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2"><Label>Cần hàng trước ngày <span className="text-red-500">*</span></Label><Input type="date" {...form.register("deadline_date")} required className={inputStyle} /></div>

                <div className="space-y-2 p-2 bg-amber-50 dark:bg-amber-900/10 rounded-lg border border-amber-200">
                    <Label className="text-amber-800 dark:text-amber-500 font-bold">Kho nhận hàng <span className="text-red-500">*</span></Label>
                    <Select defaultValue={form.getValues("destination_warehouse_id")} onValueChange={(val) => form.setValue("destination_warehouse_id", val)}>
                        <SelectTrigger className="bg-white dark:bg-slate-950 border-amber-300">
                            <SelectValue placeholder="-- Chọn kho nhận hàng --" />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map(wh => (<SelectItem key={wh.id} value={wh.id}>{wh.name} - {wh.location}</SelectItem>))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 md:col-span-2"><Label>Lý do / Ghi chú chung</Label><Textarea {...form.register("notes")} rows={2} placeholder="Mục đích sử dụng..." className="bg-background" /></div>
            </div>

            <div className="border rounded-xl shadow-sm overflow-hidden bg-card">
                <div className="p-3 border-b bg-muted/50 flex justify-between items-center">
                    <h3 className="font-semibold text-foreground">Danh sách Vật tư / Tài sản</h3>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ item_name: "", item_category: "material", quantity: 1, unit: "Cái", estimated_price: 0, notes: "" })}><Plus className="w-4 h-4 mr-1" /> Thêm dòng</Button>
                </div>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[15%]">Loại <span className="text-red-500">*</span></TableHead>
                                <TableHead className="w-[30%] min-w-[250px]">Tên hàng hóa <span className="text-red-500">*</span></TableHead>
                                <TableHead className="w-[10%]">ĐVT</TableHead>
                                <TableHead className="w-[12%]">SL <span className="text-red-500">*</span></TableHead>
                                <TableHead className="w-[15%]">Ghi chú</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {fields.map((field, index) => {
                                const currentCategory = form.watch(`items.${index}.item_category`);
                                const currentName = form.watch(`items.${index}.item_name`);
                                return (
                                    <TableRow key={field.id}>
                                        <TableCell className="p-2 align-top">
                                            <Select defaultValue={field.item_category} onValueChange={(val: any) => form.setValue(`items.${index}.item_category`, val)}>
                                                <SelectTrigger className={inputStyle}><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="material">Vật tư</SelectItem>
                                                    <SelectItem value="asset">Tài sản</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </TableCell>
                                        <TableCell className="p-2 align-top">
                                            {currentCategory === 'material' ? (
                                                <MaterialCombobox
                                                    value={currentName}
                                                    options={budgetMaterials}
                                                    onChange={(val: string) => form.setValue(`items.${index}.item_name`, val)}
                                                    onUnitChange={(unit: string) => form.setValue(`items.${index}.unit`, unit)}
                                                />
                                            ) : (
                                                <Input {...form.register(`items.${index}.item_name`)} required placeholder="Nhập tên tài sản / thiết bị..." className={inputStyle} />
                                            )}
                                        </TableCell>
                                        <TableCell className="p-2 align-top"><Input {...form.register(`items.${index}.unit`)} className={inputStyle} /></TableCell>
                                        <TableCell className="p-2 align-top"><Input type="number" min="1" {...form.register(`items.${index}.quantity`)} required className={`${inputStyle} text-center font-bold`} /></TableCell>
                                        <TableCell className="p-2 align-top"><Input {...form.register(`items.${index}.notes`)} placeholder="..." className={inputStyle} /></TableCell>
                                        <TableCell className="p-2 text-center align-top"><Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} className="text-red-500 hover:text-red-700 hover:bg-red-50 h-9 w-9"><Trash2 className="w-4 h-4" /></Button></TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {fields.length === 0 && <div className="text-center py-8 text-muted-foreground italic border-t border-dashed">Vui lòng thêm ít nhất 1 mặt hàng.</div>}
                </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
                <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>Hủy bỏ</Button>
                <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700 text-white min-w-[150px]">{isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang xử lý</> : <><Save className="w-4 h-4 mr-2" /> Lưu Phiếu Yêu Cầu</>}</Button>
            </div>
        </form>
    );
}