// app/(app)/crm/customers/[id]/edit/page.tsx
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { cookies } from "next/headers";
// Import hàm tạo Supabase client từ lib/supabase/server
import { createSupabaseServerClient } from "@/lib/supabase/server";

// Import các kiểu dữ liệu và component CustomerForm
import { CustomerForm, CustomerFormData, RawCustomerDataFromDB } from "@/components/crm/CustomerForm";

// Định nghĩa các Interface cho dữ liệu (đảm bảo khớp với DB của bạn)
interface CustomerTag {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
    email: string;
}

/**
 * Hàm tiện ích này đảm bảo mọi giá trị trong object được chuẩn bị đúng kiểu
 * cho Client Component, đặc biệt xử lý các trường `Select` và `Date`.
 *
 * - Các trường ID của Select (tag_id, owner_id) được giữ nguyên là `null` hoặc chuỗi ID.
 * - Các trường enum/literal string (type, gender, status) được giữ nguyên là `null` hoặc chuỗi giá trị hợp lệ.
 * - Các trường Date được chuyển đổi thành định dạng "YYYY-MM-DD".
 * - Các trường khác (ngoại trừ những trường đã nêu) sẽ được chuyển đổi thành chuỗi rỗng `""` nếu là `null`/`undefined`.
 */
function cleanCustomerDataForClient<T extends RawCustomerDataFromDB>(data: T | null): RawCustomerDataFromDB {
    if (!data) {
        // Nếu không có dữ liệu, trả về một đối tượng RawCustomerDataFromDB với các giá trị mặc định hợp lệ.
        // Điều này đảm bảo initialDataForForm luôn khớp với kiểu RawCustomerDataFromDB
        // và các trường Select có giá trị hợp lệ (null hoặc giá trị enum mặc định).
        return {
            id: "",
            name: "",
            code: "",
            // Các trường Select/Enum: gán null hoặc giá trị mặc định hợp lệ (ví dụ: "individual")
            type: null,
            contact_person: "",
            email: "",
            phone: "",
            address: "",
            tax_code: "",
            birthday: "",
            gender: null,
            status: null,
            tag_id: null,
            owner_id: null,
            notes: "",
            source: "",
            avatar_url: "",
            created_at: "",
            updated_at: "",
        } as unknown as RawCustomerDataFromDB;
    }

    const cleanedData: RawCustomerDataFromDB = { ...data };

    // Danh sách các trường mà chúng ta muốn giữ nguyên null/undefined
    // HOẶC các trường có kiểu enum/literal string mà không nên là chuỗi rỗng.
    // Đảm bảo tất cả các trường được sử dụng trong Radix Select có ở đây.
    const fieldsToKeepNullOrOriginal = ['tag_id', 'owner_id', 'type', 'gender', 'status'];

    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];

            if (fieldsToKeepNullOrOriginal.includes(key)) {
                // Giữ nguyên giá trị null/undefined hoặc giá trị gốc (không chuyển sang "")
                // Điều này quan trọng cho các trường SELECT, ENUM, v.v.
                // Nếu giá trị là undefined, chuyển về null để nhất quán
                (cleanedData as any)[key] = (value === undefined) ? null : value;
            } else if (typeof value === 'object' && value !== null && value instanceof Date) {
                // Xử lý đối tượng Date thành định dạng "YYYY-MM-DD"
                (cleanedData as any)[key] = value.toISOString().split('T')[0];
            } else {
                // Chuyển đổi các giá trị khác thành chuỗi rỗng nếu là null/undefined
                // hoặc thành chuỗi nếu là kiểu nguyên thủy khác.
                (cleanedData as any)[key] = (value === null || value === undefined) ? "" : String(value);
            }
        }
    }
    return cleanedData;
}

/**
 * Trang chỉnh sửa chi tiết khách hàng.
 * Là một Server Component để fetch dữ liệu và xử lý Server Action.
 */
export default async function CustomerEditPage({ params }: { params: { id: string } }) {
    
    const resolvedParams = await params; // <--- THAY ĐỔI TẠI ĐÂY: await params
    const customerId = resolvedParams.id; // Truy cập id từ resolvedParams
    // Sử dụng hàm tiện ích để khởi tạo Supabase client
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);
   
    let initialCustomerData: RawCustomerDataFromDB | null = null;
    let tags: CustomerTag[] = [];
    let users: User[] = [];

    // 1. Lấy dữ liệu khách hàng ban đầu
    try {
        const { data, error } = await supabase.from("customers").select("*").eq("id", customerId).single();
        if (error) {
            if (error.code === 'PGRST116') {
                notFound(); // Hiển thị trang 404 nếu không tìm thấy khách hàng
            }
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
        initialCustomerData = data as RawCustomerDataFromDB;
    } catch (err: any) {
        console.error("Lỗi không mong muốn khi tải dữ liệu khách hàng:", err.message);
        return (
            <div className="flex justify-center items-center min-h-[80vh] text-red-500">
                <Card className="w-full max-w-2xl">
                    <CardHeader><CardTitle>Lỗi tải dữ liệu</CardTitle></CardHeader>
                    <CardContent>Đã xảy ra lỗi không mong muốn khi tải dữ liệu khách hàng.</CardContent>
                </Card>
            </div>
        );
    }

    // 2. Lấy danh sách tags và users (dành cho các dropdown/select trong form)
    const { data: tagData, error: tagError } = await supabase.from("customer_tags").select("id, name").order("name");
    if (tagError) console.error("Lỗi khi tải danh sách nhãn khách hàng:", tagError.message);
    tags = tagData || [];

    // Assuming your employees table contains user information
    const { data: userData, error: userError } = await supabase.from("employees").select("id, name, email").order("name");
    if (userError) console.error("Lỗi khi tải danh sách nhân viên:", userError.message);
    users = userData || [];

    // --- BƯỚC QUAN TRỌNG: LÀM SẠCH DỮ LIỆU TRƯỚC KHI TRUYỀN VÀO CLIENT COMPONENT ---
    const initialDataForForm: RawCustomerDataFromDB = cleanCustomerDataForClient(initialCustomerData);
    console.log("Final initial data for CustomerForm:", initialDataForForm);
    // --- Server Action để cập nhật khách hàng ---
    async function handleUpdateCustomerAction(formData: CustomerFormData) {
        "use server"; // Đánh dấu đây là một Server Action

        // Sử dụng hàm tiện ích để khởi tạo lại Supabase client trong Server Action
        const cookieStore = await cookies(); // phải await
        const token = cookieStore.get("sb-access-token")?.value || null;
        const actionSupabase = createSupabaseServerClient(token);

        try {
            if (!formData.id) {
                return { error: "Không tìm thấy ID khách hàng để cập nhật." };
            }

            // Chuyển đổi dữ liệu từ camelCase (form) sang snake_case (database)
            const dataToUpdate = {
                name: formData.name,
                code: formData.code,
                type: formData.type,
                contact_person: formData.contactPerson || null,
                email: formData.email || null,
                phone: formData.phone || null,
                address: formData.address || null,
                tax_code: formData.taxCode || null,
                // Chuyển đổi ngày sinh về định dạng "YYYY-MM-DD" nếu có và không rỗng
                birthday: formData.birthday ? new Date(formData.birthday).toISOString().split('T')[0] : null,
                gender: formData.gender,
                status: formData.status,
                // Xử lý các giá trị đặc biệt "all"/"none" thành null cho khóa ngoại
                tag_id: formData.tag === "all" ? null : formData.tag,
                owner_id: formData.ownerId === "none" ? null : formData.ownerId,
                notes: formData.notes || null,
                source: formData.source || null,
                //website: formData.website || null,
                //facebook: formData.facebook || null,
                //zalo: formData.zalo || null,
                avatar_url: formData.avatarUrl || null,
            };

            const { error: updateError } = await actionSupabase
                .from("customers")
                .update(dataToUpdate)
                .eq("id", formData.id); // Điều kiện cập nhật dựa trên ID

            if (updateError) {
                if (updateError.code === '23505' && updateError.message.includes('code')) {
                    return { error: "Mã khách hàng đã tồn tại. Vui lòng thử lại với mã khác." };
                } else {
                    console.error("Lỗi cập nhật Supabase:", updateError);
                    return { error: updateError.message || "Có lỗi xảy ra khi cập nhật khách hàng." };
                }
            }

            // Revalidate các đường dẫn để dữ liệu được cập nhật trên các trang khác
            revalidatePath("/crm/customers"); // Trang danh sách khách hàng
            revalidatePath(`/crm/customers/${formData.id}`); // Trang chi tiết khách hàng
            revalidatePath(`/crm/customers/${formData.id}/edit`); // Trang hiện tại (nếu cần hiển thị dữ liệu mới)

            // Chuyển hướng người dùng sau khi cập nhật thành công
            redirect("/crm/customers");

        } catch (err: any) {
            console.error("Lỗi Server Action khi cập nhật khách hàng:", err);
            return { error: err.message || "Có lỗi xảy ra khi cập nhật khách hàng." };
        }
    }

    // Hiển thị form chỉnh sửa
    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Chỉnh sửa khách hàng</CardTitle>
                </CardHeader>
                <CardContent>
                    <CustomerForm
                        initialData={initialDataForForm} // Truyền dữ liệu khách hàng ban đầu đã làm sạch
                        onSubmitAction={handleUpdateCustomerAction} // Truyền Server Action
                        tags={tags} // Truyền danh sách tags (có thể rỗng)
                        users={users} // Truyền danh sách users (có thể rỗng)
                        isCustomerProfileEdit={false} // Đây là form chỉnh sửa của quản trị viên
                    />
                </CardContent>
            </Card>
        </div>
    );
}