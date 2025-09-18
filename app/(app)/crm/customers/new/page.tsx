import { revalidatePath } from "next/cache"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CustomerForm, CustomerFormData } from "@/components/crm/CustomerForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

interface CustomerTag {
    id: string
    name: string
}

interface User {
    id: string
    name: string
    email: string
}

export default async function CustomerUpsertPage({ params }: { params?: { id?: string } }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    let tags: CustomerTag[] = []
    let users: User[] = []
    let initialData: CustomerFormData | null = null
    let error: string | null = null

    // Tải danh sách nhãn
    try {
        const { data: tagData, error: tagError } = await supabase
            .from("customer_tags")
            .select("id, name")
            .order("name")

        if (tagError) throw tagError
        tags = tagData || []
    } catch (err: any) {
        console.error("Lỗi khi tải nhãn khách hàng:", err.message)
        error = "Không thể tải danh sách nhãn khách hàng."
    }

    // Tải danh sách nhân viên
    try {
        const { data: userData, error: userError } = await supabase
            .from("employees")
            .select("id, name, email")
            .order("name")

        if (userError) throw userError
        users = userData || []
    } catch (err: any) {
        console.error("Lỗi khi tải danh sách nhân viên:", err.message)
        error = "Không thể tải danh sách nhân viên."
    }

    // Nếu có params.id, tải dữ liệu khách hàng để cập nhật
    if (params?.id) {
        try {
            const { data: customerData, error: customerError } = await supabase
                .from("customers")
                .select("*")
                .eq("id", params.id)
                .single()

            if (customerError) throw customerError

            initialData = {
                id: customerData.id,
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: customerData.address,
                gender: customerData.gender,
                status: customerData.status,
                type: customerData.type,
                contactPerson: customerData.contact_person,
                taxCode: customerData.tax_code,
                birthday: customerData.birthday,
                tag: customerData.tag_id ?? "all",
                ownerId: customerData.owner_id ?? "none",
                notes: customerData.note,
                source: customerData.source,
                avatarUrl: customerData.avatar_url,
            }
        } catch (err: any) {
            console.error("Lỗi khi tải thông tin khách hàng:", err.message)
            error = "Không thể tải thông tin khách hàng."
        }
    }

    // Server Action: thêm hoặc cập nhật khách hàng
    async function handleUpsertCustomerAction(formData: CustomerFormData) {
        "use server"

        const cookieStore = await cookies();
        const token = cookieStore.get("sb-access-token")?.value || null;
        const supabase = createSupabaseServerClient(token);

        if (formData.id) {
            const { error: updateError } = await supabase
                .from("customers")
                .update({
                    name: formData.name,
                    type: formData.type,
                    contact_person: formData.contactPerson,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    tax_code: formData.taxCode,
                    birthday: formData.birthday || null,
                    gender: formData.gender,
                    status: formData.status,
                    tag_id: formData.tag === "all" ? null : formData.tag,
                    owner_id: formData.ownerId === "none" ? null : formData.ownerId,
                    note: formData.notes,
                    source: formData.source,
                    avatar_url: formData.avatarUrl,
                })
                .eq("id", formData.id)

            if (updateError) {
                return { error: updateError.message, success: false }
            }

            // ✅ Nội suy đúng ID bằng backtick
            revalidatePath(`/crm/customers/${formData.id}`)

            return {
                success: true,
                error: undefined,
                id: formData.id, // ✅ Trả về ID để redirect phía client
            }
        }

        const { data: existing, error: checkError } = await supabase
            .from("customers")
            .select("id")
            .or(`email.eq.${formData.email},phone.eq.${formData.phone}`)
            .limit(1)

        if (checkError) {
            console.error("Lỗi kiểm tra trùng email/số điện thoại:", checkError)
            return { error: "Không thể kiểm tra dữ liệu khách hàng.", success: false }
        }

        if (existing && existing.length > 0) {
            return { error: "Email hoặc số điện thoại đã tồn tại trong hệ thống.", success: false }
        }

        const prefixMap = {
            individual: "KHCN",
            company: "KHDN",
            agency: "KHCQ",
        }

        const prefix = prefixMap[formData.type] || "KH"

        const { data: lastCodeData, error: codeError } = await supabase
            .from("customers")
            .select("code")
            .like("code", `${prefix}-%`)
            .order("code", { ascending: false })
            .limit(1)

        if (codeError) {
            console.error("Lỗi khi sinh mã khách hàng:", codeError)
            return { error: "Không thể sinh mã khách hàng tự động.", success: false }
        }

        let nextSequence = 1
        if (lastCodeData?.length) {
            const lastCode = lastCodeData[0].code
            const parts = lastCode.split("-")
            const lastNumber = parseInt(parts[1], 10)
            if (!isNaN(lastNumber)) nextSequence = lastNumber + 1
        }

        const newCode = `${prefix}-${String(nextSequence).padStart(3, "0")}`

        const { data: insertedData, error: insertError } = await supabase
            .from("customers")
            .insert([
                {
                    name: formData.name,
                    code: newCode,
                    type: formData.type,
                    contact_person: formData.contactPerson,
                    email: formData.email,
                    phone: formData.phone,
                    address: formData.address,
                    tax_code: formData.taxCode,
                    birthday: formData.birthday || null,
                    gender: formData.gender,
                    status: formData.status,
                    tag_id: formData.tag === "all" ? null : formData.tag,
                    owner_id: formData.ownerId === "none" ? null : formData.ownerId,
                    note: formData.notes,
                    source: formData.source,
                    avatar_url: formData.avatarUrl,
                },
            ])
            .select("id") // ✅ Thêm dòng này để lấy lại ID

        if (insertError) {
            if (insertError.code === "23505" && insertError.message.includes("code")) {
                return { error: "Mã khách hàng đã tồn tại. Vui lòng thử lại.", success: false }
            }
            return { error: insertError.message || "Có lỗi xảy ra khi lưu khách hàng.", success: false }
        }

        const newId = insertedData?.[0]?.id

        revalidatePath("/crm/customers")

        return {
            success: true,
            id: newId, // ✅ Trả về ID để redirect phía client
            error: undefined,
        }
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-[80vh] text-red-500 px-4">
                <Card className="w-full max-w-3xl shadow-md border border-red-200">
                    <CardHeader>
                        <CardTitle>Lỗi tải dữ liệu</CardTitle>
                    </CardHeader>
                    <CardContent>{error}</CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex justify-center items-center min-h-[80vh] px-4">
            <Card className="w-full max-w-3xl shadow-md border border-muted">
                <CardHeader>
                    <CardTitle className="text-lg font-semibold">
                        {initialData ? "Cập nhật khách hàng" : "Thêm khách hàng mới"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CustomerForm
                        onSubmitAction={handleUpsertCustomerAction}
                        tags={tags}
                        users={users}
                        initialData={initialData}
                        isCustomerProfileEdit={!!initialData}
                    />
                </CardContent>
            </Card>
        </div>
    )
}
