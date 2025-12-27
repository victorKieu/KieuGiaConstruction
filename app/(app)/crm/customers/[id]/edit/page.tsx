import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import {
    CustomerForm,
    CustomerFormData,
    RawCustomerDataFromDB
} from "@/components/crm/CustomerForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Helper check UUID
function isValidUUID(uuid: string | null | undefined) {
    if (!uuid) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

interface CustomerTag { id: string; name: string }
interface User { id: string; name: string; email: string }

// Props của Page động
export default async function CustomerEditPage({ params }: { params: { id: string } }) {
    // 1. FIX LỖI QUAN TRỌNG: Thêm 'await'
    const supabase = await createSupabaseServerClient();

    // Lưu ý: Trong Next.js 15, params cũng có thể là Promise, nên await cho chắc chắn
    const { id } = await params;

    if (!isValidUUID(id)) {
        return notFound(); // Hoặc redirect về danh sách
    }

    let tags: CustomerTag[] = [];
    let users: User[] = [];
    let initialData: RawCustomerDataFromDB | null = null;
    let errorMsg: string | null = null;

    // 2. Load danh mục (Tag, Employees) - Parallel Fetching
    try {
        const [tagRes, userRes] = await Promise.all([
            supabase.from("customer_tags").select("id, name").order("name"),
            supabase.from("employees").select("id, name, email").order("name"),
        ]);
        tags = tagRes.data || [];
        users = userRes.data || [];
    } catch (err) {
        console.error("Error loading metadata:", err);
    }

    // 3. Load dữ liệu Khách hàng hiện tại
    try {
        const { data, error } = await supabase
            .from("customers")
            .select("*")
            .eq("id", id)
            .single();

        if (error) throw error;

        // Gán thẳng data vào initialData (Không map ở đây để tránh lỗi Type)
        initialData = data as unknown as RawCustomerDataFromDB;

    } catch (err) {
        console.error("Lỗi tải khách hàng:", err);
        errorMsg = "Không tìm thấy thông tin khách hàng hoặc bạn không có quyền truy cập.";
    }

    // --- SERVER ACTION (Copy logic chuẩn từ trang New sang) ---
    async function handleUpdateCustomerAction(formData: CustomerFormData) {
        "use server";
        const supabase = await createSupabaseServerClient();

        // 1. Sanitize Data
        const tag_id = isValidUUID(formData.tag) ? formData.tag : null;
        const owner_id = isValidUUID(formData.ownerId) ? formData.ownerId : null;
        const source_id = isValidUUID(formData.source) ? formData.source : null;
        const type_id = formData.type;
        const status_id = formData.status;

        try {
            // --- LOGIC TỰ ĐỘNG ĐỔI MÃ KHI ĐỔI LOẠI KHÁCH HÀNG ---
            let finalCode = formData.code; // Mặc định giữ mã hiện tại

            // A. Lấy dữ liệu hiện tại trong DB để so sánh
            const { data: currentData } = await supabase
                .from("customers")
                .select("type, code")
                .eq("id", id)
                .single();

            if (currentData) {
                const oldType = currentData.type || "";
                const newType = type_id || "";

                // B. Nếu Loại thay đổi (Khác nhau) -> Tiến hành sinh mã mới
                if (oldType !== newType) {
                    console.log(`♻️ Phát hiện đổi loại từ [${oldType}] sang [${newType}]. Đang sinh mã mới...`);

                    // B1. Lấy Prefix của loại MỚI
                    const { data: typeConfig } = await supabase
                        .from('sys_dictionaries')
                        .select('meta_data')
                        .eq('id', newType) // Dùng ID loại mới
                        .single();

                    const meta = typeConfig?.meta_data as { prefix?: string } | null;
                    const prefix = meta?.prefix || "KH"; // Fallback nếu quên cấu hình

                    // B2. Tìm mã lớn nhất theo Prefix mới
                    const { data: lastCustomer } = await supabase
                        .from("customers")
                        .select("code")
                        .ilike("code", `${prefix}-%`)
                        .order("created_at", { ascending: false })
                        .limit(1)
                        .single();

                    // B3. Tính số thứ tự kế tiếp
                    let nextSequence = 1;
                    if (lastCustomer?.code) {
                        const match = lastCustomer.code.match(/(\d+)$/); // Lấy cụm số cuối cùng
                        if (match && match[0]) {
                            nextSequence = parseInt(match[0], 10) + 1;
                        }
                    }

                    // B4. Gán mã mới
                    finalCode = `${prefix}-${String(nextSequence).padStart(3, "0")}`;
                    console.log(`✅ Mã mới được cấp: ${finalCode}`);
                }
            }

            // 2. Prepare Payload
            const payload = {
                name: formData.name,
                code: finalCode, // <--- QUAN TRỌNG: Dùng biến đã tính toán
                type: type_id,

                email: formData.email || null,
                phone: formData.phone || null,
                contact_person: formData.contactPerson || null,

                address: formData.address || null,
                ward: formData.ward || null,
                province: formData.province || null,

                tax_code: formData.taxCode || null,
                id_number: formData.idNumber || null,
                bank_account: formData.bankAccount || null,
                website: formData.website || null,
                business_type: formData.businessType || null, // Lưu ý check lại tên cột trong DB (business_type hay businness_type)
                title: formData.title || null,

                gender: formData.gender,
                birthday: formData.birthday || null,
                avatar_url: formData.avatarUrl || null,

                status: status_id,
                notes: formData.notes || null,

                tag_id,
                owner_id,
                source_id,

                updated_at: new Date().toISOString(),
            };

            // 3. Thực hiện Update
            const { error } = await supabase
                .from("customers")
                .update(payload)
                .eq("id", id);

            if (error) {
                if (error.code === "23505") return { success: false, error: "Trùng mã khách hàng (Vui lòng thử lại)." };
                throw error;
            }

            revalidatePath(`/crm/customers/${id}`);
            revalidatePath("/crm/customers");

            return { success: true, id: id };

        } catch (e: any) {
            console.error("Update Error:", e);
            return { success: false, error: e.message || "Lỗi cập nhật dữ liệu" };
        }
    }

    // Render UI
    if (errorMsg) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-center">
                <p className="text-red-500 mb-4">{errorMsg}</p>
                <a href="/crm/customers" className="text-blue-600 hover:underline">Quay lại danh sách</a>
            </div>
        );
    }

    return (
        <div className="flex justify-center py-8 px-4">
            <Card className="w-full max-w-5xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">
                        Cập nhật khách hàng: {initialData?.code || initialData?.name}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CustomerForm
                        onSubmitAction={handleUpdateCustomerAction}
                        initialData={initialData}
                        tags={tags}
                        users={users}
                        isCustomerProfileEdit={false} // Admin đang sửa -> false
                    />
                </CardContent>
            </Card>
        </div>
    );
}