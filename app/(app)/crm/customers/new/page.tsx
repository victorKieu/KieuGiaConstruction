import { revalidatePath } from "next/cache"
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { CustomerForm, CustomerFormData, mapRawDataToFormData, RawCustomerDataFromDB } from "@/components/crm/CustomerForm"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { cookies } from "next/headers"

interface CustomerTag { id: string; name: string }
interface User { id: string; name: string; email: string }
interface Source { id: string; name: string }

// Hàm kiểm tra UUID hợp lệ
function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

export default async function CustomerUpsertPage({ params }: { params?: { id?: string } }) {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    let tags: CustomerTag[] = []
    let users: User[] = []
    let sources: Source[] = []
    let initialData: CustomerFormData | null = null
    let error: string | null = null

    // 1. Tải danh sách nhãn
    const { data: tagData } = await supabase.from("customer_tags").select("id, name").order("name");
    tags = tagData || [];

    // 2. Tải danh sách nhân viên
    const { data: userData } = await supabase.from("employees").select("id, name, email").order("name");
    users = userData || [];

    // 3. Tải danh sách nguồn
    const { data: sourceData } = await supabase.from("customer_sources").select("id, name").order("name");
    sources = sourceData || [];

    // Nếu có ID, tải dữ liệu để edit
    if (params?.id) {
        try {
            const { data: customerData, error: customerError } = await supabase
                .from("customers")
                .select("*")
                .eq("id", params.id)
                .single()

            if (customerError) throw customerError
            // Ép kiểu và map dữ liệu DB -> Form
            initialData = mapRawDataToFormData(customerData as unknown as RawCustomerDataFromDB);
        } catch (err: any) {
            console.error("Lỗi tải khách hàng:", err.message)
            error = "Không thể tải thông tin khách hàng."
        }
    }

    // Server Action
    async function handleUpsertCustomerAction(formData: CustomerFormData) {
        "use server"
        const cookieStore = await cookies();
        const token = cookieStore.get("sb-access-token")?.value || null;
        const supabase = createSupabaseServerClient(token);

        // --- CHUẨN HÓA DỮ LIỆU ---
        // Kiểm tra UUID. Nếu giá trị là "other", "none" hoặc rỗng, chuyển thành NULL để tránh lỗi cú pháp UUID.
        const sourceVal = formData.source;
        const finalSourceId = (sourceVal && isValidUUID(sourceVal)) ? sourceVal : null;

        const ownerVal = formData.ownerId;
        const finalOwnerId = (ownerVal && isValidUUID(ownerVal)) ? ownerVal : null;

        const tagVal = formData.tag;
        const finalTagId = (tagVal && isValidUUID(tagVal)) ? tagVal : null;

        const commonData = {
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

            // Dùng biến đã chuẩn hóa và tên cột ĐÚNG trong DB
            tag_id: finalTagId,
            owner_id: finalOwnerId,
            source_id: finalSourceId, // Fix: source -> source_id

            avatar_url: formData.avatarUrl,
            notes: formData.notes,    // Fix: note -> notes
        };

        if (formData.id) {
            // UPDATE
            const { error: updateError } = await supabase
                .from("customers")
                .update(commonData)
                .eq("id", formData.id);

            if (updateError) return { error: updateError.message, success: false };
            revalidatePath(`/crm/customers/${formData.id}`);
            return { success: true, id: formData.id };
        }

        // INSERT - Sinh mã khách hàng
        const prefixMap = { individual: "KHCN", company: "KHDN", agency: "KHCQ" };
        const prefix = prefixMap[formData.type] || "KH";
        const { data: lastCodeData } = await supabase
            .from("customers")
            .select("code")
            .like("code", `${prefix}-%`)
            .order("code", { ascending: false })
            .limit(1);

        let nextSequence = 1;
        if (lastCodeData?.length) {
            const lastCode = lastCodeData[0].code;
            const parts = lastCode ? lastCode.split("-") : [];
            if (parts.length > 1) {
                const lastNumber = parseInt(parts[1], 10);
                if (!isNaN(lastNumber)) nextSequence = lastNumber + 1;
            }
        }
        const newCode = `${prefix}-${String(nextSequence).padStart(3, "0")}`;

        const { data: insertedData, error: insertError } = await supabase
            .from("customers")
            .insert([{ ...commonData, code: newCode }])
            .select("id");

        if (insertError) {
            if (insertError.code === "23505") return { error: "Mã khách hàng đã tồn tại.", success: false };
            return { error: insertError.message, success: false };
        }

        revalidatePath("/crm/customers");
        return { success: true, id: insertedData?.[0]?.id };
    }

    if (error) {
        return <div className="text-red-500 text-center mt-10">{error}</div>
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
                        sources={sources} // Truyền danh sách nguồn
                        initialData={initialData}
                        isCustomerProfileEdit={false} // Admin edit -> false để hiện full field
                    />
                </CardContent>
            </Card>
        </div>
    );
}