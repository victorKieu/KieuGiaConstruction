// components/crm/CustomerForm.tsx
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox"; // Thêm Checkbox
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { Resolver } from "react-hook-form";
import { startTransition } from "react"

// --- START: SCHEMA AND INTERFACE DEFINITIONS ---

// Helper: Chuyển chuỗi rỗng hoặc undefined thành NULL (để lưu vào DB)
const zOptionalString = z.string().optional().transform(val => {
    if (val === undefined || val === "") return null;
    return val;
});

// Helper: Email cũng chuyển thành NULL nếu rỗng
const zEmailOrNull = z
    .string()
    .email({ message: "Email không hợp lệ." })
    .or(z.literal(""))
    .optional()
    .transform(val => (val === "" || val === undefined ? null : val));

// Zod Schema
export const customerFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, { message: "Tên khách hàng không được để trống." }),
    code: z.string().optional(),
    type: z.enum(["individual", "company", "agency"], {
        required_error: "Vui lòng chọn loại khách hàng.",
    }),

    // FIX: Sử dụng helper mới để handle NULL
    email: zEmailOrNull,
    phone: zOptionalString,
    address: zOptionalString,
    contactPerson: zOptionalString,
    taxCode: zOptionalString,
    birthday: zOptionalString,
    notes: zOptionalString,
    source: z.string().optional().transform(val => val || "other"), // Default là other
    avatarUrl: zOptionalString,

    gender: z.enum(["male", "female", "other"]).default("other"),
    status: z.enum(["active", "inactive", "lead"]).default("active"),
    tag: zOptionalString,
    ownerId: zOptionalString,
    // FIX: Refinement (Chặn lỗi nếu cả hai trường đều null/rỗng)
}).refine((data) => data.email !== null || data.phone !== null, {
    message: "Phải cung cấp ít nhất một phương thức liên hệ (Email hoặc Số điện thoại).",
    path: ["email"],
});

export type CustomerFormData = z.infer<typeof customerFormSchema>;

// Interface Dữ liệu thô từ DB (Cho phép NULL để khớp với Supabase)
export interface RawCustomerDataFromDB {
    id?: string;
    name: string;
    code?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null; // FIX: Cho phép NULL (Khắc phục lỗi TS2322)
    contact_person?: string | null;
    tax_code?: string | null;
    notes?: string | null; // DB dùng 'notes'
    avatar_url?: string | null;
    birthday?: string | null;
    gender?: "other" | "male" | "female" | null;
    owner_id?: string | null;
    source_id?: string | null; // DB dùng 'source_id'
    status?: "active" | "inactive" | "lead" | null;
    type?: "individual" | "company" | "agency" | null;
    tag_id?: string | null;
    created_at?: string;
    updated_at?: string;
}

// Interface Props
interface CustomerTag { id: string; name: string; }
interface User { id: string; name: string; email: string; }
interface Source { id: string; name: string; } // Dùng cho Select box

interface ActionState {
    success: boolean;
    error?: string;
    id?: string;
}

interface CustomerFormProps {
    initialData?: RawCustomerDataFromDB | null;
    onSubmitAction: (formData: CustomerFormData) => Promise<ActionState>;
    tags: CustomerTag[];
    users: User[];
    sources: Source[]; // ✅ Nhận danh sách nguồn từ DB
    isCustomerProfileEdit?: boolean;
}

// Hàm mapping: Chuyển NULL từ DB thành "" cho Form (Tránh lỗi React Uncontrolled Input)
export const mapRawDataToFormData = (rawData: RawCustomerDataFromDB): CustomerFormData => {
    return {
        id: rawData.id,
        name: rawData.name,
        code: rawData.code ?? "",
        type: rawData.type ?? "individual",
        contactPerson: rawData.contact_person ?? "",
        email: rawData.email ?? "", // null -> ""
        phone: rawData.phone ?? "", // null -> ""
        address: rawData.address ?? "", // null -> ""
        taxCode: rawData.tax_code ?? "",
        birthday: rawData.birthday ?? "",
        gender: rawData.gender ?? "other",
        status: rawData.status ?? "active",
        tag: rawData.tag_id ?? "",
        ownerId: rawData.owner_id ?? "",
        notes: rawData.notes ?? "",
        source: rawData.source_id || "other", // Ưu tiên source_id
        avatarUrl: rawData.avatar_url ?? "",
    };
};

const defaultEmptyFormData: CustomerFormData = {
    name: "", code: "", type: "individual", contactPerson: "", email: "", phone: "",
    address: "", taxCode: "", birthday: "", gender: "other", status: "active",
    tag: "", ownerId: "", notes: "", source: "other", avatarUrl: "",
};

// --- MAIN COMPONENT ---

export function CustomerForm({ onSubmitAction, initialData, tags, users, sources, isCustomerProfileEdit }: CustomerFormProps) {
    const { register, handleSubmit, watch, setValue, formState: { errors }, setError, reset } = useForm<CustomerFormData>({
        resolver: zodResolver(customerFormSchema) as Resolver<CustomerFormData>,
        defaultValues: initialData ? mapRawDataToFormData(initialData) : defaultEmptyFormData,
    });

    const router = useRouter();
    // Khai báo lại useActionState bên ngoài scope function (hoặc dùng useFormState)
    const [state, dispatch, pendingAction] = useActionState<ActionState, CustomerFormData>(
        async (_, data) => await onSubmitAction(data),
        { success: false, error: undefined, id: undefined }
    );

    // Watch fields
    const watchedType = watch("type");
    const watchedGender = watch("gender");
    const watchedStatus = watch("status");
    const watchedTag = watch("tag");
    const watchedOwnerId = watch("ownerId");
    const watchedSource = watch("source");

    useEffect(() => {
        if (initialData) reset(mapRawDataToFormData(initialData));
        else reset(defaultEmptyFormData);
    }, [initialData, reset]);

    useEffect(() => {
        if (state?.error) {
            if (state.error === "NEXT_REDIRECT") return;
            if (state.error.includes("Mã khách hàng đã tồn tại")) {
                setError("code", { type: "server", message: state.error });
            } else {
                setError("root", { message: state.error });
            }
        }
    }, [state?.error, setError]);

    useEffect(() => {
        if (state?.success) {
            const target = state.id ? `/crm/customers/${state.id}` : "/crm/customers";
            router.push(target);
            router.refresh();
        }
    }, [state?.success, state?.id, router]);

    const handleCancel = () => {
        router.push(initialData?.id ? `/crm/customers/${initialData.id}` : "/crm/customers");
    };

    const onSubmit = (data: CustomerFormData) => startTransition(() => dispatch(data));

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {initialData?.id && <input type="hidden" {...register("id")} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tên Khách Hàng */}
                <div>
                    <Label htmlFor="name">Tên Khách Hàng *</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name?.message && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                </div>

                {/* Mã KH */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="code">Mã Khách Hàng</Label>
                        <Input id="code" {...register("code")} readOnly={!!initialData?.code} placeholder={initialData?.code || "Tự động sinh"} />
                        {errors.code?.message && <p className="text-red-500 text-sm">{errors.code.message}</p>}
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("code")} />}

                {/* Loại KH */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="type">Loại Khách Hàng</Label>
                        <Select value={watchedType} onValueChange={(v: any) => setValue("type", v)}>
                            <SelectTrigger id="type"><SelectValue placeholder="Chọn loại" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="individual">Cá nhân</SelectItem>
                                <SelectItem value="company">Doanh nghiệp</SelectItem>
                                <SelectItem value="agency">Cơ quan</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("type")} />}

                {/* Người liên hệ */}
                <div>
                    <Label htmlFor="contactPerson">Người Liên Hệ Chính</Label>
                    <Input id="contactPerson" {...register("contactPerson")} />
                    {errors.contactPerson?.message && <p className="text-red-500 text-sm">{errors.contactPerson.message}</p>}
                </div>

                {/* Email */}
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} />
                    {errors.email?.message && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                    {/* ✅ FIX UX: Hiển thị lỗi nếu cả Email và Phone đều trống */}
                    {errors.root?.message && <p className="text-red-500 text-sm">{errors.root.message}</p>}
                </div>

                {/* Phone */}
                <div>
                    <Label htmlFor="phone">Số Điện Thoại</Label>
                    <Input id="phone" type="tel" {...register("phone")} />
                    {errors.phone?.message && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
                </div>

                {/* Địa chỉ */}
                <div><Label htmlFor="address">Địa Chỉ</Label><Input id="address" {...register("address")} /></div>

                {/* Tax Code */}
                {!isCustomerProfileEdit && (watchedType === "company" || watchedType === "agency") && (
                    <div><Label htmlFor="taxCode">Mã Số Thuế</Label><Input id="taxCode" {...register("taxCode")} /></div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("taxCode")} />}

                {/* Birthday */}
                <div><Label htmlFor="birthday">Ngày Sinh / Ngày Thành Lập</Label><Input id="birthday" type="date" {...register("birthday")} /></div>

                {/* Gender */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="gender">Giới Tính</Label>
                        <Select value={watchedGender} onValueChange={(v: any) => setValue("gender", v)}>
                            <SelectTrigger id="gender"><SelectValue placeholder="Chọn giới tính" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="other">Không xác định</SelectItem>
                                <SelectItem value="male">Nam</SelectItem>
                                <SelectItem value="female">Nữ</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("gender")} />}

                {/* Status */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="status">Trạng Thái</Label>
                        <Select value={watchedStatus} onValueChange={(v: any) => setValue("status", v)}>
                            <SelectTrigger id="status"><SelectValue placeholder="Chọn trạng thái" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="active">Đang hoạt động</SelectItem>
                                <SelectItem value="inactive">Không hoạt động</SelectItem>
                                <SelectItem value="lead">Tiềm năng</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("status")} />}

                {/* Tag */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="tag">Nhãn</Label>
                        <Select value={watchedTag || ""} onValueChange={(v) => setValue("tag", v)}>
                            <SelectTrigger id="tag"><SelectValue placeholder="Chọn nhãn" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- Không chọn --</SelectItem>
                                {tags.map((tag) => <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("tag")} />}

                {/* Owner */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="ownerId">Nhân Viên Phụ Trách</Label>
                        <Select value={watchedOwnerId || ""} onValueChange={(v) => setValue("ownerId", v)}>
                            <SelectTrigger id="ownerId"><SelectValue placeholder="Chọn nhân viên" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">-- Không chọn --</SelectItem>
                                {users.map((user) => <SelectItem key={user.id} value={user.id}>{user.name || user.email}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("ownerId")} />}

                {/* Source */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="source">Nguồn Khách Hàng</Label>
                        <Select value={watchedSource} onValueChange={(v: any) => setValue("source", v)}>
                            <SelectTrigger id="source"><SelectValue placeholder="Chọn nguồn" /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="other">Khác</SelectItem>
                                {sources.map((src) => <SelectItem key={src.id} value={src.id}>{src.name}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("source")} />}

                {/* Notes */}
                <div className="md:col-span-2"><Label htmlFor="notes">Ghi Chú</Label><Textarea id="notes" rows={2} {...register("notes")} /></div>
            </div>

            {/* Error Message */}
            {errors.root?.message && <div className="text-red-500 text-sm text-center mt-4">{errors.root.message}</div>}
            {state?.error && state.error !== "NEXT_REDIRECT" && !errors.root && <div className="text-red-500 text-sm text-center mt-4">{state.error}</div>}

            {/* Buttons */}
            <div className="flex justify-end space-x-2 mt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>Hủy</Button>
                <Button type="submit" disabled={pendingAction}>
                    {pendingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Cập Nhật" : "Tạo Mới"}
                </Button>
            </div>
        </form>
    );
}