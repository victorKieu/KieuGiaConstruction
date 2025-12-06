// app/(app)/crm/customers/[id]/edit/page.tsx
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// ✅ FIX: Import từ file CustomerForm (đã được sửa) và customer-schema
import { CustomerForm } from "@/components/crm/CustomerForm";
import { CustomerFormData, mapRawDataToFormData, RawCustomerDataFromDB } from "@/components/crm/customer-schema";

// Định nghĩa các Interface
interface CustomerTag { id: string; name: string }
interface User { id: string; name: string; email: string }
interface Source { id: string; name: string }

// Hàm kiểm tra UUID hợp lệ (Cần thiết cho Server Action)
function isValidUUID(uuid: string) {
    const regex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return regex.test(uuid);
}

/**
 * Trang chỉnh sửa chi tiết khách hàng.
 */
export default async function CustomerEditPage({ params }: { params: { id: string } }) {
    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    let initialCustomerData: RawCustomerDataFromDB | null = null;
    let tags: CustomerTag[] = [];
    let users: User[] = [];
    let sources: Source[] = [];

    // 1. Lấy dữ liệu khách hàng ban đầu
    try {
        const { data, error } = await supabase.from("customers").select("*").eq("id", customerId).single();
        if (error) {
            if (error.code === 'PGRST116') notFound();
            console.error("Lỗi khi tải dữ liệu khách hàng:", error.message);
            return (
                <div className="flex justify-center items-center min-h-[80vh] text-red-500">
                    <Card className="w-full max-w-2xl">
                        <CardHeader><CardTitle>Lỗi tải dữ liệu</CardTitle></CardHeader>
                        <CardContent>Đã xảy ra lỗi khi tải dữ liệu khách hàng. Vui lòng thử lại.</CardContent>
                    </Card>
                </div>
            );
        }
        // Ép kiểu và map dữ liệu DB -> Form
        initialCustomerData = data as unknown as RawCustomerDataFromDB;
    } catch (err: any) {
        console.error("Lỗi không mong muốn:", err.message);
        return <div className="text-red-500 text-center mt-10">Đã xảy ra lỗi không mong muốn.</div>;
    }

    // 2. Load dependencies (tags, users, sources)
    const { data: tagData } = await supabase.from("customer_tags").select("id, name").order("name");
    tags = tagData || [];

    const { data: userData } = await supabase.from("employees").select("id, name, email").order("name");
    users = userData || [];

    const { data: sourceData } = await supabase.from("customer_sources").select("id, name").order("name");
    sources = sourceData || [];

    // 3. Làm sạch dữ liệu
    const initialDataForForm: CustomerFormData = initialCustomerData
        ? mapRawDataToFormData(initialCustomerData)
        : {} as CustomerFormData; // Khởi tạo rỗng an toàn

    // --- Server Action ---
    async function handleUpdateCustomerAction(formData: CustomerFormData) {
        "use server";

        const cookieStore = await cookies();
        const token = cookieStore.get("sb-access-token")?.value || null;
        const actionSupabase = createSupabaseServerClient(token);

        try {
            if (!formData.id) return { success: false, error: "Không tìm thấy ID khách hàng." };

            // Chuẩn hóa dữ liệu UUID và các giá trị nullable
            const sourceVal = formData.source;
            const finalSourceId = (sourceVal && isValidUUID(sourceVal)) ? sourceVal : null;

            const ownerVal = formData.ownerId;
            const finalOwnerId = (ownerVal && isValidUUID(ownerVal)) ? ownerVal : null;

            const tagVal = formData.tag;
            const finalTagId = (tagVal && isValidUUID(tagVal)) ? tagVal : null;

            const dataToUpdate = {
                name: formData.name,
                code: formData.code,
                type: formData.type,
                contact_person: formData.contactPerson || null,
                email: formData.email || null,
                phone: formData.phone || null,
                address: formData.address || null,
                tax_code: formData.taxCode || null,
                birthday: formData.birthday ? new Date(formData.birthday).toISOString().split('T')[0] : null,
                gender: formData.gender,
                status: formData.status,

                // Dùng biến đã chuẩn hóa và tên cột ĐÚNG
                tag_id: finalTagId,
                owner_id: finalOwnerId,
                source_id: finalSourceId,
                notes: formData.notes || null, // Chắc chắn dùng 'notes'
                avatar_url: formData.avatarUrl || null,
            };

            const { error: updateError } = await actionSupabase
                .from("customers")
                .update(dataToUpdate)
                .eq("id", formData.id);

            if (updateError) {
                if (updateError.code === '23505' && updateError.message.includes('code')) {
                    return { success: false, error: "Mã khách hàng đã tồn tại." };
                }
                console.error("Lỗi cập nhật Supabase:", updateError);
                return { success: false, error: updateError.message };
            }

            revalidatePath("/crm/customers");
            revalidatePath(`/crm/customers/${formData.id}`);

            return { success: true, id: formData.id, error: undefined };

        } catch (err: any) {
            console.error("Lỗi Server Action:", err);
            return { success: false, error: "Đã xảy ra lỗi không mong muốn." };
        }
    }

    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Chỉnh sửa khách hàng</CardTitle>
                </CardHeader>
                <CardContent>
                    <CustomerForm
                        initialData={initialDataForForm}
                        onSubmitAction={handleUpdateCustomerAction}
                        tags={tags}
                        users={users}
                        sources={sources}
                        isCustomerProfileEdit={false} // ✅ FIX: Đặt là false để hiển thị full field (Chế độ Admin Edit)
                    />
                </CardContent>
            </Card>
        </div>
    );
}