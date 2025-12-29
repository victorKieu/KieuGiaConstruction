import { revalidatePath } from "next/cache";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
// Lưu ý: Import RawCustomerDataFromDB để gán kiểu cho biến
import { CustomerForm, CustomerFormData, RawCustomerDataFromDB } from "@/components/crm/CustomerForm";
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Helper check UUID
function isValidUUID(uuid: string | null | undefined) {
    if (!uuid) return false;
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

interface CustomerTag { id: string; name: string }
interface User { id: string; name: string; email: string }

export default async function CustomerUpsertPage({ params }: { params?: { id?: string } }) {
    const supabase = await createSupabaseServerClient();

    let tags: CustomerTag[] = [];
    let users: User[] = [];

    // --- FIX 1: Đổi kiểu dữ liệu từ CustomerFormData -> RawCustomerDataFromDB ---
    // Biến này phải chứa dữ liệu thô từ DB để khớp với props của CustomerForm
    let initialData: RawCustomerDataFromDB | null = null;

    let errorMsg: string | null = null;

    // 1. Load danh mục
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

    // 2. Load dữ liệu khách hàng để Edit
    if (params?.id) {
        if (!isValidUUID(params.id)) {
            errorMsg = "ID khách hàng không hợp lệ.";
        } else {
            try {
                const { data, error } = await supabase.from("customers").select("*").eq("id", params.id).single();
                if (error) throw error;

                // --- FIX 2: KHÔNG GỌI mapRawDataToFormData Ở ĐÂY ---
                // Chỉ ép kiểu sang RawCustomerDataFromDB và truyền thẳng
                initialData = data as unknown as RawCustomerDataFromDB;

            } catch (err) {
                errorMsg = "Không tìm thấy thông tin khách hàng.";
            }
        }
    }

    // --- SERVER ACTION ---
    async function handleUpsertCustomerAction(formData: CustomerFormData) {
        "use server";
        const supabase = await createSupabaseServerClient();

        // 1. Sanitize Data
        const tag_id = isValidUUID(formData.tag) ? formData.tag : null;
        const owner_id = isValidUUID(formData.ownerId) ? formData.ownerId : null;
        const source_id = isValidUUID(formData.source) ? formData.source : null;
        const type_id = formData.type;
        const status_id = formData.status;

        try {
            // Biến cờ xác định xem có cần sinh mã mới không
            let shouldGenerateCode = false;

            // KIỂM TRA LOGIC
            if (!formData.id) {
                // TRƯỜNG HỢP 1: TẠO MỚI -> Luôn sinh mã
                shouldGenerateCode = true;
            } else {
                // TRƯỜNG HỢP 2: CẬP NHẬT -> Kiểm tra xem Loại có thay đổi không?
                // Lấy loại cũ trong DB ra so sánh
                const { data: currentData } = await supabase
                    .from("customers")
                    .select("type")
                    .eq("id", formData.id)
                    .single();

                // Nếu loại mới (formData) khác loại cũ (DB) -> Cần sinh mã lại
                if (currentData && currentData.type !== type_id) {
                    shouldGenerateCode = true;
                }
            }

            // --- LOGIC SINH MÃ (CHẠY KHI CẦN THIẾT) ---
            let finalCode = formData.code; // Mặc định giữ mã cũ

            if (shouldGenerateCode) {
                console.log("--> Phát hiện thay đổi Loại hoặc Tạo mới. Đang sinh mã mới...");

                // A. Lấy Prefix từ Dictionary
                const { data: typeConfig } = await supabase
                    .from('sys_dictionaries')
                    .select('meta_data')
                    .eq('id', type_id)
                    .single();

                const meta = typeConfig?.meta_data as { prefix?: string } | null;
                const prefix = meta?.prefix || "KH"; // Default fallback

                // B. Tìm mã lớn nhất theo Prefix này
                const { data: lastCustomer } = await supabase
                    .from("customers")
                    .select("code")
                    .ilike("code", `${prefix}-%`)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .single();

                // C. Tính số thứ tự
                let nextSequence = 1;
                if (lastCustomer?.code) {
                    // Regex lấy số cuối cùng: KHDN-005 -> 5
                    const match = lastCustomer.code.match(/(\d+)$/);
                    if (match && match[0]) {
                        nextSequence = parseInt(match[0], 10) + 1;
                    }
                }

                // D. Gán mã mới
                finalCode = `${prefix}-${String(nextSequence).padStart(3, "0")}`;
                console.log("--> Mã mới được cấp:", finalCode);
            }

            // 2. Prepare Payload (Sử dụng finalCode)
            const payload = {
                name: formData.name,
                code: finalCode, // <-- Dùng mã đã tính toán
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
                business_type: formData.businessType || null,
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

            // 3. Thực hiện SQL (Insert hoặc Update)
            if (formData.id) {
                const { error } = await supabase
                    .from("customers")
                    .update(payload)
                    .eq("id", formData.id);

                if (error) throw error;

                revalidatePath(`/crm/customers/${formData.id}`);
                revalidatePath("/crm/customers");
                return { success: true, id: formData.id };
            } else {
                const { data: inserted, error } = await supabase
                    .from("customers")
                    .insert([payload])
                    .select("id")
                    .single();

                if (error) {
                    if (error.code === "23505") return { success: false, error: "Trùng mã khách hàng (Vui lòng thử lại)." };
                    throw error;
                }

                revalidatePath("/crm/customers");
                return { success: true, id: inserted.id };
            }

        } catch (e: any) {
            console.error("Upsert Error:", e);
            return { success: false, error: e.message || "Lỗi lưu dữ liệu" };
        }
    }

    if (errorMsg) return <div className="text-red-500 text-center mt-10">{errorMsg}</div>;

    return (
        <div className="flex justify-center py-8 px-4">
            <Card className="w-full max-w-5xl shadow-md">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">
                        {initialData ? `Cập nhật: ${initialData.code || initialData.name}` : "Thêm khách hàng mới"}
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <CustomerForm
                        onSubmitAction={handleUpsertCustomerAction}
                        // Bây giờ kiểu dữ liệu đã khớp (RawCustomerDataFromDB)
                        initialData={initialData}
                        tags={tags}
                        users={users}
                        isCustomerProfileEdit={false}
                    />
                </CardContent>
            </Card>
        </div>
    );
}