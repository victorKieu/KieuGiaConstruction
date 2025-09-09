import { redirect } from "next/navigation"
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

export default async function CustomerNewPage() {
    const cookieStore = await cookies()
    const token = cookieStore.get("sb-access-token")?.value || null
    const supabase = createSupabaseServerClient(token)

    let tags: CustomerTag[] = []
    let users: User[] = []
    let error: string | null = null

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

    async function handleAddCustomerAction(formData: CustomerFormData) {
        "use server"

        const cookieStore = await cookies()
        const token = cookieStore.get("sb-access-token")?.value || null
        const supabase = createSupabaseServerClient(token)

        const { data: existing, error: checkError } = await supabase
            .from("customers")
            .select("id")
            .or(`email.eq.${formData.email},phone.eq.${formData.phone}`)
            .limit(1)

        if (checkError) {
            console.error("Lỗi kiểm tra trùng email/số điện thoại:", checkError)
            return { error: "Không thể kiểm tra dữ liệu khách hàng." }
        }

        if (existing && existing.length > 0) {
            return { error: "Email hoặc số điện thoại đã tồn tại trong hệ thống." }
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
            return { error: "Không thể sinh mã khách hàng tự động." }
        }

        let nextSequence = 1
        if (lastCodeData?.length) {
            const lastCode = lastCodeData[0].code
            const parts = lastCode.split("-")
            const lastNumber = parseInt(parts[1], 10)
            if (!isNaN(lastNumber)) nextSequence = lastNumber + 1
        }

        const newCode = `${prefix}-${String(nextSequence).padStart(3, "0")}`

        const { error: insertError } = await supabase.from("customers").insert([
            {
                name: formData.name,
                code: newCode,
                type: formData.type,
                //sub_type: formData.subType,
                contact_person: formData.contactPerson,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                //province: formData.province,
                //industry: formData.industry,
                tax_code: formData.taxCode,
                birthday: formData.birthday || null,
                gender: formData.gender,
                status: formData.status,
                //priority: formData.priority,
                tag_id: formData.tag === "all" ? null : formData.tag,
                owner_id: formData.ownerId === "none" ? null : formData.ownerId,
                note: formData.notes,
                source: formData.source === "referral" ? null : formData.tag,
                //website: formData.website,
                //facebook: formData.facebook,
                //zalo: formData.zalo,
                avatar_url: formData.avatarUrl,
            },
        ])

        if (insertError) {
            if (insertError.code === "23505" && insertError.message.includes("code")) {
                return { error: "Mã khách hàng đã tồn tại. Vui lòng thử lại." }
            }
            return { error: insertError.message || "Có lỗi xảy ra khi lưu khách hàng." }
        }

        revalidatePath("/crm/customers")
        redirect("/crm/customers")
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
                    <CardTitle className="text-lg font-semibold">Thêm khách hàng mới</CardTitle>
                </CardHeader>
                <CardContent>
                    <CustomerForm
                        onSubmitAction={handleAddCustomerAction}
                        tags={tags}
                        users={users}
                        initialData={null}
                    />
                </CardContent>
            </Card>
        </div>
    )
}