"use client";

import { useActionState, useEffect, startTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import type { Resolver } from "react-hook-form";
import { DictionarySelect } from "@/components/common/DictionarySelect";

// --- HELPERS ---
const zOptionalString = z.string().optional().transform(val => {
    if (val === undefined || val === null || val.trim() === "") return null;
    return val.trim();
});

const zEmailOrNull = z.string()
    .trim()
    .optional()
    .refine((val) => val === "" || val === undefined || z.string().email().safeParse(val).success, {
        message: "Email không đúng định dạng",
    })
    .transform(val => (val === "" || val === undefined ? null : val));

// --- SCHEMA ---
export const customerFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, { message: "Tên khách hàng là bắt buộc." }),
    code: z.string().optional(),
    type: z.string({ required_error: "Vui lòng chọn loại khách hàng" }).min(1, "Vui lòng chọn loại khách hàng"),
    email: zEmailOrNull,
    phone: zOptionalString,
    contactPerson: zOptionalString,
    address: zOptionalString,
    ward: zOptionalString,
    province: zOptionalString,
    taxCode: zOptionalString,
    idNumber: zOptionalString,
    bankAccount: zOptionalString,
    website: zOptionalString,
    businessType: zOptionalString,
    title: zOptionalString,
    birthday: zOptionalString,
    gender: z.enum(["male", "female", "other"]).default("other"),
    avatarUrl: zOptionalString,
    status: z.string().default("active"),
    notes: zOptionalString,
    source: zOptionalString,
    tag: zOptionalString,
    ownerId: zOptionalString,
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

export interface RawCustomerDataFromDB {
    id: string;
    name: string;
    code?: string | null;
    type: string;
    phone?: string | null;
    email?: string | null;
    address?: string | null;
    province?: string | null;
    ward?: string | null;
    contact_person?: string | null;
    tax_code?: string | null;
    id_number?: string | null;
    bank_account?: string | null;
    website?: string | null;
    business_type?: string | null;
    title?: string | null;
    status?: string | null;
    gender?: "other" | "male" | "female" | null;
    birthday?: string | null;
    avatar_url?: string | null;
    notes?: string | null;
    owner_id?: string | null;
    tag_id?: string | null;
    source_id?: string | null;
    created_at?: string;
    updated_at?: string;
}

interface CustomerTag { id: string; name: string; }
interface User { id: string; name: string; email: string; }
interface ActionState { success: boolean; error?: string; id?: string; }

interface CustomerFormProps {
    initialData?: RawCustomerDataFromDB | null;
    onSubmitAction: (formData: CustomerFormData) => Promise<ActionState>;
    tags: CustomerTag[];
    users: User[];
    isCustomerProfileEdit?: boolean;
}

export const mapRawDataToFormData = (rawData: RawCustomerDataFromDB): CustomerFormData => {
    return {
        id: rawData.id,
        name: rawData.name,
        code: rawData.code ?? "",
        type: rawData.type ?? "",
        email: rawData.email ?? "",
        phone: rawData.phone ?? "",
        contactPerson: rawData.contact_person ?? "",
        address: rawData.address ?? "",
        ward: rawData.ward ?? "",
        province: rawData.province ?? "",
        taxCode: rawData.tax_code ?? "",
        idNumber: rawData.id_number ?? "",
        bankAccount: rawData.bank_account ?? "",
        website: rawData.website ?? "",
        businessType: rawData.business_type ?? "",
        title: rawData.title ?? "",
        birthday: rawData.birthday ?? "",
        gender: rawData.gender ?? "other",
        avatarUrl: rawData.avatar_url ?? "",
        status: rawData.status ?? "",
        notes: rawData.notes ?? "",
        source: rawData.source_id ?? "",
        tag: rawData.tag_id ?? "",
        ownerId: rawData.owner_id ?? "",
    };
};

const defaultEmptyFormData: CustomerFormData = {
    name: "", code: "", type: "", contactPerson: "", email: "", phone: "",
    address: "", province: "", ward: "", taxCode: "", idNumber: "", bankAccount: "", website: "", businessType: "", title: "",
    birthday: "", gender: "other", status: "", notes: "", source: "", tag: "", ownerId: "", avatarUrl: "",
};

export function CustomerForm({ onSubmitAction, initialData, tags, users, isCustomerProfileEdit }: CustomerFormProps) {
    const { register, handleSubmit, watch, setValue, formState: { errors }, setError, reset } = useForm<CustomerFormData>({
        resolver: zodResolver(customerFormSchema) as Resolver<CustomerFormData>,
        defaultValues: initialData ? mapRawDataToFormData(initialData) : defaultEmptyFormData,
    });

    const router = useRouter();
    const [state, dispatch, pendingAction] = useActionState<ActionState, CustomerFormData>(
        async (_, data) => await onSubmitAction(data),
        { success: false }
    );

    const watchedType = watch("type");
    const watchedGender = watch("gender");
    const watchedStatus = watch("status");
    const watchedTag = watch("tag");
    const watchedOwnerId = watch("ownerId");
    const watchedSource = watch("source");
    const watchedTitle = watch("title");

    useEffect(() => {
        if (initialData) reset(mapRawDataToFormData(initialData));
        else reset(defaultEmptyFormData);
    }, [initialData, reset]);

    useEffect(() => {
        if (state?.error && state.error !== "NEXT_REDIRECT") {
            if (state.error.includes("Mã khách hàng")) setError("code", { type: "server", message: state.error });
            else setError("root", { message: state.error });
        }
    }, [state?.error, setError]);

    useEffect(() => {
        if (state?.success) {
            const target = state.id ? `/crm/customers/${state.id}` : "/crm/customers";
            startTransition(() => { router.push(target); router.refresh(); });
        }
    }, [state?.success, state?.id, router]);

    const handleCancel = () => router.push("/crm/customers");
    const onSubmit = (data: CustomerFormData) => startTransition(() => dispatch(data));

    // Helper class cho input
    const inputClass = "bg-background border-input text-foreground";

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {initialData?.id && <input type="hidden" {...register("id")} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* --- CỘT TRÁI --- */}
                <div className="space-y-4">
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <Label htmlFor="name">Tên Khách Hàng <span className="text-red-500">*</span></Label>
                            <Input id="name" {...register("name")} placeholder="Nhập tên khách hàng" className={inputClass} />
                            {errors.name?.message && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                        </div>

                        {!isCustomerProfileEdit && (
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label>Mã KH</Label>
                                    {/* ✅ FIX: ReadOnly input style */}
                                    <Input {...register("code")} readOnly placeholder="Tự động" className="bg-muted text-muted-foreground cursor-not-allowed" />
                                </div>
                                <div>
                                    <Label>Loại KH</Label>
                                    <DictionarySelect
                                        category="CRM_CUSTOMER_TYPE"
                                        placeholder="Chọn loại"
                                        value={watchedType}
                                        onValueChange={(val) => setValue("type", val)}
                                    />
                                    {errors.type?.message && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>CMND/CCCD (Cá nhân)</Label>
                            <Input {...register("idNumber")} placeholder="Số giấy tờ" className={inputClass} />
                        </div>
                        <div>
                            <Label>Mã Số Thuế (DN)</Label>
                            <Input {...register("taxCode")} placeholder="MST" className={inputClass} />
                        </div>
                    </div>

                    <div>
                        <Label>Lĩnh vực / Ngành nghề</Label>
                        <Input {...register("businessType")} placeholder="VD: Xây dựng, Thương mại..." className={inputClass} />
                    </div>

                    {/* ✅ FIX: bg-gray-50 -> bg-muted/50 */}
                    <div className="space-y-3 p-3 bg-muted/50 rounded-md border border-border">
                        <Label className="font-semibold text-foreground">Địa chỉ & Khu vực</Label>
                        <div>
                            <Input {...register("address")} placeholder="Số nhà, Tên đường" className={`mb-2 ${inputClass}`} />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <Input {...register("ward")} placeholder="Phường/ Xã" className={inputClass} />
                            <Input {...register("province")} placeholder="Tỉnh/ Thành phố" className={inputClass} />
                        </div>
                    </div>
                </div>

                {/* --- CỘT PHẢI --- */}
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Email</Label>
                            <Input type="email" {...register("email")} placeholder="email@example.com" className={inputClass} />
                            {errors.email?.message && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                        </div>
                        <div>
                            <Label>Điện thoại</Label>
                            <Input {...register("phone")} placeholder="0909..." className={inputClass} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Người liên hệ</Label>
                            <Input {...register("contactPerson")} className={inputClass} />
                        </div>
                        <div>
                            <Label>Chức vụ</Label>
                            <DictionarySelect
                                category="CRM_CONTACT_TITLE"
                                placeholder="VD: Giám đốc"
                                value={watchedTitle || ""}
                                onValueChange={(val) => setValue("title", val)}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label>Website</Label>
                            <Input {...register("website")} placeholder="www.website.com" className={inputClass} />
                        </div>
                        <div>
                            <Label>Tài khoản NH</Label>
                            <Input {...register("bankAccount")} placeholder="Số TK ngân hàng" className={inputClass} />
                        </div>
                    </div>

                    {!isCustomerProfileEdit && (
                        // ✅ FIX: bg-blue-50 -> dark:bg-blue-900/20
                        <div className="space-y-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-md border border-blue-100 dark:border-blue-900">
                            <Label className="font-semibold text-blue-800 dark:text-blue-300">Thông tin quản lý</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <Label className="text-xs">Nguồn</Label>
                                    <DictionarySelect
                                        category="CRM_SOURCE"
                                        placeholder="Chọn nguồn"
                                        value={watchedSource || ""}
                                        onValueChange={(val) => setValue("source", val)}
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Phụ trách</Label>
                                    <Select value={watchedOwnerId || ""} onValueChange={(v) => setValue("ownerId", v)}>
                                        <SelectTrigger className="h-9 bg-background border-input"><SelectValue placeholder="Chọn NV" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- Không --</SelectItem>
                                            {users.map(u => <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Nhãn (Tag)</Label>
                                    <Select value={watchedTag || ""} onValueChange={(v) => setValue("tag", v)}>
                                        <SelectTrigger className="h-9 bg-background border-input"><SelectValue placeholder="Gắn thẻ" /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- Không --</SelectItem>
                                            {tags.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label className="text-xs">Trạng thái</Label>
                                    <DictionarySelect
                                        category="CRM_CUSTOMER_STATUS"
                                        value={watchedStatus}
                                        onValueChange={(val) => setValue("status", val)}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                <div className="md:col-span-2">
                    <Label>Ghi chú</Label>
                    <Textarea rows={2} {...register("notes")} className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <Label>Ngày sinh/TL</Label>
                        <Input type="date" {...register("birthday")} className={inputClass} />
                    </div>
                    <div>
                        <Label>Giới tính</Label>
                        <Select value={watchedGender} onValueChange={(v: any) => setValue("gender", v)}>
                            <SelectTrigger className="bg-background border-input"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Nam</SelectItem>
                                <SelectItem value="female">Nữ</SelectItem>
                                <SelectItem value="other">Khác</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>

            {errors.root?.message && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded text-center text-sm border border-red-100 dark:border-red-900">{errors.root.message}</div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <Button type="button" variant="outline" onClick={handleCancel}>Hủy</Button>
                <Button type="submit" disabled={pendingAction} className="min-w-[120px]">
                    {pendingAction ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : initialData ? "Cập Nhật" : "Tạo Mới"}
                </Button>
            </div>
        </form>
    );
}