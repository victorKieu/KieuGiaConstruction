// components/crm/CustomerForm.tsx
"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";
import type { Resolver } from "react-hook-form"; // Import Resolver type
import { startTransition } from "react"


// --- START: SCHEMA AND INTERFACE DEFINITIONS ---

// Helper cho các trường string tùy chọn, đảm bảo luôn là string sau transform
// Sử dụng .optional() để nói với Zod rằng trường này có thể không được cung cấp (undefined).
// Hàm transform sẽ chuyển undefined/null thành chuỗi rỗng.
const zOptionalString = z.string().optional().transform(val => val ?? "");

// Helper cho các trường URL tùy chọn, đảm bảo luôn là string và xử lý chuỗi rỗng hợp lệ
// Sử dụng .optional() và transform tương tự.
// Refine để kiểm tra URL nếu không phải là chuỗi rỗng.
const zOptionalUrl = z.string().optional().transform(val => val ?? "").refine(val => val === "" || z.string().url().safeParse(val).success, {
    message: "URL không hợp lệ.",
});

// Zod Schema.
export const customerFormSchema = z.object({
    id: z.string().optional(),
    name: z.string().min(1, { message: "Tên khách hàng không được để trống." }),
    code: z.string().optional(),
    type: z.enum(["individual", "company", "agency"], {
        required_error: "Vui lòng chọn loại khách hàng.",
    }),
    contactPerson: zOptionalString,
    // Cho email, cho phép chuỗi rỗng hoặc phải là email hợp lệ
    // `and` được sử dụng để áp dụng thêm một validation SAU KHI transform.
    // Nếu email là "", nó sẽ vượt qua `.or(z.literal(""))`.
    // Nếu có giá trị, nó sẽ được kiểm tra bằng `.email()`.
    email: zOptionalString.and(z.string().email({ message: "Email không hợp lệ." }).or(z.literal(""))),
    phone: zOptionalString,
    address: zOptionalString,
    taxCode: zOptionalString,
    birthday: zOptionalString,
    notes: zOptionalString,
    source: z.enum(["other", "referral", "website", "event"], {
        required_error: "Vui lòng chọn nguồn khách hàng.",
    }),
    //website: zOptionalUrl,
    //facebook: zOptionalUrl,
    //zalo: zOptionalString,
    avatarUrl: zOptionalUrl,

    // Gender và Status có .default(), nghĩa là chúng sẽ KHÔNG BAO GIỜ là undefined hoặc null trong CustomerFormData.
    gender: z.enum(["male", "female", "other"]).default("other"),
    status: z.enum(["active", "inactive", "lead"]).default("active"),
    tag: z.string().optional(), // tag là optional, sẽ map sang null nếu "all" khi lưu DB
    ownerId: z.string().optional(), // ownerId là optional, sẽ map sang null nếu "none" khi lưu DB
});

// CustomerFormData sẽ phản ánh *output* của Zod schema sau khi transform và default.
// Các trường với .default() hoặc .transform() sẽ không còn là optional và non-nullable.
export type CustomerFormData = z.infer<typeof customerFormSchema>;

interface CustomerTag {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
    email: string;
}

// Kiểu dữ liệu thô từ database.
// Interface này định nghĩa những gì bạn mong đợi *trực tiếp từ DB*, có thể là nullable hoặc optional.
export interface RawCustomerDataFromDB {
    id?: string | undefined;
    name: string;
    code?: string | undefined;
    email: string | null; // Có thể null từ DB
    phone?: string | null;
    address?: string | undefined;
    contact_person?: string | null;
    tax_code?: string | null;
    notes?: string | null;
    avatar_url?: string | null;
    birthday?: string | null;
    //facebook?: string | null;
    //zalo?: string | null;
    gender?: "other" | "male" | "female" | null;
    owner_id?: string | null;
    source?: "referral" | "website" | "event" | "other" | null;
    status?: "active" | "inactive" | "lead" | null;
    type?: "individual" | "company" | "agency" | null;
    tag_id?: string | null;
    //website?: string | null;
    created_at?: string;
    updated_at?: string;
}

// Định nghĩa kiểu state cho useActionState
interface ActionState {
    error?: string
    success?: boolean
}

    interface CustomerFormProps {
    initialData?: RawCustomerDataFromDB | null;
    // Đảm bảo onSubmitAction LUÔN trả về một object có kiểu ActionState
    onSubmitAction: (formData: CustomerFormData) => Promise<ActionState>;
    tags: CustomerTag[];
    users: User[];
    isCustomerProfileEdit?: boolean;
}

// --- END: SCHEMA AND INTERFACE DEFINITIONS ---

// Hàm helper để ánh xạ RawCustomerDataFromDB sang CustomerFormData
// Hàm này cực kỳ quan trọng vì nó đảm bảo đầu ra khớp với các kiểu chặt chẽ của CustomerFormData.
const mapRawDataToFormData = (rawData: RawCustomerDataFromDB): CustomerFormData => {
    return {
        id: rawData.id,
        name: rawData.name,
        code: rawData.code ?? "", // Chuyển undefined/null thành ""
        type: rawData.type ?? "individual", // Cung cấp giá trị mặc định rõ ràng nếu null/undefined từ DB
        contactPerson: rawData.contact_person ?? "", // Xử lý null từ DB ở đây
        email: rawData.email ?? "",
        phone: rawData.phone ?? "",
        address: rawData.address ?? "",
        taxCode: rawData.tax_code ?? "",
        birthday: rawData.birthday ?? "",
        gender: rawData.gender ?? "other", // Đảm bảo gender luôn là một giá trị enum hợp lệ
        status: rawData.status ?? "active", // Đảm bảo status luôn là một giá trị enum hợp lệ
        tag: rawData.tag_id ?? "", // Giả sử "" là mặc định/dự phòng cho tags nếu không có tag_id
        ownerId: rawData.owner_id ?? "", // Giả sử "" là mặc định/dự phòng cho owner nếu không có owner_id
        notes: rawData.notes ?? "",
        source: rawData.source ?? "referral",
        //website: rawData.website ?? "",
        //facebook: rawData.facebook ?? "",
        //zalo: rawData.zalo ?? "",
        avatarUrl: rawData.avatar_url ?? "",
    };
};

// Định nghĩa dữ liệu form rỗng mặc định cho khách hàng mới.
// Cái này phải tuân thủ CHẶT CHẼ CustomerFormData (tức là các trường optional sẽ là "" hoặc giá trị default)
const defaultEmptyFormData: CustomerFormData = {
    name: "",
    code: "",
    type: "individual", // Giá trị mặc định từ schema
    contactPerson: "",
    email: "",
    phone: "",
    address: "",
    taxCode: "",
    birthday: "",
    gender: "other", // Giá trị mặc định từ schema
    status: "active", // Giá trị mặc định từ schema
    tag: "", // Giá trị mặc định cho trường optional string
    ownerId: "", // Giá trị mặc định cho trường optional string
    notes: "",
    source: "other",
    //website: "",
    //facebook: "",
    //zalo: "",
    avatarUrl: "",
};
export function CustomerForm({ onSubmitAction, initialData, tags, users, isCustomerProfileEdit }: CustomerFormProps) {
    const { register, handleSubmit, watch, setValue, formState: { errors }, setError, reset } = useForm<CustomerFormData>({
        // Dòng này đã được sửa lỗi chính tả và thêm type assertion
        resolver: zodResolver(customerFormSchema) as Resolver<CustomerFormData>,
        defaultValues: initialData ? mapRawDataToFormData(initialData) : defaultEmptyFormData,
    });

    const router = useRouter();

    // Sửa lỗi: Chỉ định rõ ràng generic types cho useActionState
    const [state, dispatch, pendingAction] = useActionState<ActionState, CustomerFormData>(
        async (prevState: ActionState | void, data: CustomerFormData) => {
            const result = await onSubmitAction(data);
            console.log("Kết quả từ Server Action:", result)
            return result;
        },
        { error: undefined } as ActionState // Khởi tạo state với kiểu ActionState rõ ràng
    );

    // Watch giá trị của các select để hiển thị
    const watchedType = watch("type");
    const watchedGender = watch("gender");
    const watchedStatus = watch("status");
    const watchedTag = watch("tag");
    const watchedOwnerId = watch("ownerId");
    const watchedSource = watch("source");

    // Khi initialData thay đổi, reset form
    useEffect(() => {
        if (initialData) {
            reset(mapRawDataToFormData(initialData));
        } else {
            reset(defaultEmptyFormData);
        }
    }, [initialData, reset]);

    // Xử lý lỗi từ Server Action
    useEffect(() => {
        if (state?.error) {
            if (state.error === "NEXT_REDIRECT") {
                // Bỏ qua lỗi NEXT_REDIRECT trong dev, Next.js sẽ xử lý redirect
            } else if (state.error.includes("Mã khách hàng đã tồn tại")) {
                setError("code", { type: "server", message: state.error });
            } else {
                console.error("Lỗi Server Action:", state.error);
                setError("root", { message: state.error });
            }
        }
    }, [state?.error, setError]);

    useEffect(() => {
        if (state?.success) {
            const target = initialData?.id
                ? `/crm/customers/${initialData.id}`
                : "/crm/customers"

            router.push(target)
        }
    }, [state?.success, initialData?.id])

    const handleCancel = () => {
        if (isCustomerProfileEdit) {
            router.push('/');
        } else {
            if (initialData?.id) {
                router.push(`/crm/customers/${initialData.id}`)
            } else {
                router.push("/crm/customers")
            }
        }
    };
    const onSubmit = (data: CustomerFormData) => {
        startTransition(() => {
            dispatch(data)
        })
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {initialData?.id && <input type="hidden" {...register("id")} />}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tên Khách Hàng */}
                <div>
                    <Label htmlFor="name">Tên Khách Hàng *</Label>
                    <Input id="name" {...register("name")} />
                    {errors.name?.message && <p className="text-red-500 text-sm">{errors.name.message}</p>}
                </div>

                {/* Mã Khách Hàng */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="code">Mã Khách Hàng</Label>
                        <Input
                            id="code"
                            {...register("code")}
                            readOnly={!!initialData?.code}
                            placeholder={initialData?.code || "Mã sẽ được tự động sinh (nếu không nhập)"}
                        />
                        {errors.code?.message && <p className="text-red-500 text-sm">{errors.code.message}</p>}
                    </div>
                )}
                {isCustomerProfileEdit && (
                    <input type="hidden" {...register("code")} />
                )}

                {/* Loại Khách Hàng */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="type">Loại Khách Hàng</Label>
                        <Select value={watchedType} onValueChange={(value: CustomerFormData["type"]) => setValue("type", value)}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Chọn loại" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="individual">Cá nhân</SelectItem>
                                <SelectItem value="company">Doanh nghiệp</SelectItem>
                                <SelectItem value="agency">Cơ quan</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.type?.message && <p className="text-red-500 text-sm">{errors.type.message}</p>}
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("type")} />}

                {/* Người Liên Hệ Chính */}
                <div>
                    <Label htmlFor="contactPerson">Người Liên Hệ Chính</Label>
                    <Input id="contactPerson" {...register("contactPerson")} />
                    {errors.contactPerson?.message && <p className="text-red-500 text-sm">{errors.contactPerson.message}</p>}
                </div>

                {/* Email */}
                <div>
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" {...register("email")} readOnly={!!initialData?.id && isCustomerProfileEdit} />
                    {errors.email?.message && <p className="text-red-500 text-sm">{errors.email.message}</p>}
                </div>
                {/* Số Điện Thoại */}
                <div>
                    <Label htmlFor="phone">Số Điện Thoại</Label>
                    <Input id="phone" type="tel" {...register("phone")} />
                    {errors.phone?.message && <p className="text-red-500 text-sm">{errors.phone.message}</p>}
                </div>
                {/* Địa Chỉ */}
                <div>
                    <Label htmlFor="address">Địa Chỉ</Label>
                    <Input id="address" {...register("address")} />
                    {errors.address?.message && <p className="text-red-500 text-sm">{errors.address.message}</p>}
                </div>
                {/* Mã Số Thuế */}
                {!isCustomerProfileEdit && (watchedType === "company" || watchedType === "agency") && (
                    <div>
                        <Label htmlFor="taxCode">Mã Số Thuế</Label>
                        <Input id="taxCode" {...register("taxCode")} />
                        {errors.taxCode?.message && <p className="text-red-500 text-sm">{errors.taxCode.message}</p>}
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("taxCode")} />}

                {/* Ngày Sinh / Ngày Thành Lập */}
                <div>
                    <Label htmlFor="birthday">Ngày Sinh / Ngày Thành Lập</Label>
                    <Input id="birthday" type="date" {...register("birthday")} />
                    {errors.birthday?.message && <p className="text-red-500 text-sm">{errors.birthday.message}</p>}
                </div>
                {/* Giới Tính */}
                {!isCustomerProfileEdit && (watchedType === "individual" || watchedType === "company" || watchedType === "agency") && (
                    <div>
                        <Label htmlFor="gender">Giới Tính</Label>
                        <Select value={watchedGender} onValueChange={(value: CustomerFormData["gender"]) => setValue("gender", value)}>
                            <SelectTrigger id="gender">
                                <SelectValue placeholder="Chọn giới tính" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="other">Không xác định</SelectItem>
                                <SelectItem value="male">Nam</SelectItem>
                                <SelectItem value="female">Nữ</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.gender?.message && <p className="text-red-500 text-sm">{errors.gender.message}</p>}
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("gender")} />}

                {/* Trạng Thái */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="status">Trạng Thái</Label>
                        <Select value={watchedStatus} onValueChange={(value: CustomerFormData["status"]) => setValue("status", value)}>
                            <SelectTrigger id="status">
                                <SelectValue placeholder="Chọn trạng thái" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Không xác định</SelectItem>
                                <SelectItem value="active">Đang hoạt động</SelectItem>
                                <SelectItem value="inactive">Không hoạt động</SelectItem>
                                <SelectItem value="lead">Tiềm năng</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.status?.message && <p className="text-red-500 text-sm">{errors.status.message}</p>}
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("status")} />}

                {/* Nhãn */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="tag">Nhãn</Label>
                        <Select value={watchedTag} onValueChange={(value: CustomerFormData["tag"]) => setValue("tag", value)}>
                            <SelectTrigger id="tag">
                                <SelectValue placeholder="Chọn nhãn" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Không xác định</SelectItem> {/* Thay đổi "all" thành "" cho trường hợp không chọn */}
                                {tags.map((tag: CustomerTag) => (
                                    <SelectItem key={tag.id} value={tag.id}>
                                        {tag.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.tag?.message && <p className="text-red-500 text-sm">{errors.tag.message}</p>}
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("tag")} />}

                {/* Nhân Viên Phụ Trách */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="ownerId">Nhân Viên Phụ Trách</Label>
                        <Select value={watchedOwnerId} onValueChange={(value: CustomerFormData["ownerId"]) => setValue("ownerId", value)}>
                            <SelectTrigger id="ownerId">
                                <SelectValue placeholder="Chọn nhân viên" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none">Không xác định</SelectItem> {/* Thay đổi "none" thành "" cho trường hợp không chọn */}
                                {users.map((user: User) => (
                                    <SelectItem key={user.id} value={user.id}>
                                        {user.name || user.email}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {errors.ownerId?.message && <p className="text-red-500 text-sm">{errors.ownerId.message}</p>}
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("ownerId")} />}

                {/* Nguồn Khách Hàng */}
                {!isCustomerProfileEdit && (
                    <div>
                        <Label htmlFor="source">Nguồn Khách Hàng</Label>
                        <Select value={watchedSource} onValueChange={(value: CustomerFormData["source"]) => setValue("source", value)}>
                            <SelectTrigger id="source">
                                <SelectValue placeholder="Chọn nguồn khách hàng" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="other">Khác</SelectItem>
                                <SelectItem value="referral">Giới thiệu</SelectItem>
                                <SelectItem value="website">Website</SelectItem>
                                <SelectItem value="event">Event</SelectItem>
                            </SelectContent>
                        </Select>
                        {errors.status?.message && <p className="text-red-500 text-sm">{errors.status.message}</p>}
                    </div>
                )}
                {isCustomerProfileEdit && <input type="hidden" {...register("source")} />}

                {/* Website, Facebook, Zalo, AvatarUrl */}
                
                <div>
                    <Label htmlFor="avatarUrl">Ảnh Đại Diện (URL)</Label>
                    <Input id="avatarUrl" {...register("avatarUrl")} />
                    {errors.avatarUrl?.message && <p className="text-red-500 text-sm">{errors.avatarUrl.message}</p>}
                </div>

                {/* Ghi Chú */}
                <div className="md:col-span-2">
                    <Label htmlFor="notes">Ghi Chú</Label>
                    <Textarea id="notes" rows={2} {...register("notes")} />
                    {errors.notes?.message && <p className="text-red-500 text-sm">{errors.notes.message}</p>}
                </div>
            </div>
            
            {/* Hiển thị lỗi chung từ Server Action */}
            {state?.error && state.error !== "NEXT_REDIRECT" && !errors.code && !errors.root && (
                <div className="text-red-500 text-sm text-center mt-4">{state.error}</div>
            )}
            {errors.root?.message && (
                <div className="text-red-500 text-sm text-center mt-4">{errors.root.message}</div>
            )}

            <div className="flex justify-end space-x-2 mt-4">
                <Button type="button" variant="outline" onClick={handleCancel}>
                    Hủy
                </Button>
                <Button type="submit" disabled={pendingAction}>
                    {pendingAction && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData ? "Cập Nhật" : "Tạo Mới"}
                </Button>
            </div>
        </form>
    );
}