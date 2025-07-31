// app/(app)/crm/customers/new/page.tsx
// Đây là Server Component (KHÔNG CÓ "use client" ở đầu)

import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
// Import createClient (Server Component) hoặc createServerClient nếu bạn cần cookies cho auth
import { createClient } from "@supabase/supabase-js";
import { CustomerForm, CustomerFormData } from "@/components/crm/CustomerForm"; // Client Component
//import Link from "next/link"; // Để nút Hủy
//import { Button } from "@/components/ui/button";

// Khởi tạo Supabase client cho Server Component
const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

interface CustomerTag {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
    email: string;
}

// Đây là Server Component, hàm này sẽ được gọi khi trang được render trên Server
export default async function CustomerNewPage() {
    let tags: CustomerTag[] = [];
    let users: User[] = [];
    let error: string | null = null;

    // Fetch dữ liệu tags và users trên Server
    try {
        const { data: tagData, error: tagError } = await supabase.from("customer_tags").select("id, name").order("name");
        if (tagError) throw tagError;
        tags = tagData || [];
    } catch (err: any) {
        console.error("Error loading tags on server:", err.message);
        error = "Không thể tải danh sách nhãn khách hàng.";
    }

    try {
        const { data: userData, error: userError } = await supabase.from("users").select("id, name, email").order("name");
        if (userError) throw userError;
        users = userData || [];
    } catch (err: any) {
        console.error("Error loading users on server:", err.message);
        error = "Không thể tải danh sách nhân viên.";
    }

    // --- Server Action để thêm khách hàng ---
    async function handleAddCustomerAction(formData: CustomerFormData) {
        "use server"; // <-- Dòng ma thuật biến hàm này thành Server Action

        // Đảm bảo Supabase client được khởi tạo trong Server Action nếu nó không global
        const actionSupabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

        try {
            // Logic sinh mã khách hàng tự động, chạy trên server
            let prefix = "";
            switch (formData.type) { // Sử dụng formData.type
                case "individual":
                    prefix = "KHCN";
                    break;
                case "company":
                    prefix = "KHDN";
                    break;
                case "agency":
                    prefix = "KHCQ";
                    break;
                default:
                    prefix = "KH";
            }

            const { data: lastCodeData, error: codeError } = await actionSupabase
                .from('customers')
                .select('code')
                .like('code', `${prefix}-%`)
                .order('code', { ascending: false })
                .limit(1);

            if (codeError) {
                console.error("Error fetching last customer code for generation:", codeError);
                return { error: "Không thể sinh mã khách hàng tự động." };
            }

            let nextSequence = 1;
            if (lastCodeData && lastCodeData.length > 0) {
                const lastCode = lastCodeData[0].code;
                const parts = lastCode.split('-');
                if (parts.length === 2) {
                    const lastNumber = parseInt(parts[1], 10);
                    if (!isNaN(lastNumber)) {
                        nextSequence = lastNumber + 1;
                    }
                }
            }
            const newCode = `${prefix}-${String(nextSequence).padStart(3, '0')}`;

            // Insert dữ liệu vào Supabase
            const { error: insertError } = await actionSupabase.from("customers").insert([{
                name: formData.name,
                code: newCode, // Sử dụng mã đã sinh
                type: formData.type,
                contact_person: formData.contactPerson,
                email: formData.email,
                phone: formData.phone,
                address: formData.address,
                tax_code: formData.taxCode,
                birthday: formData.birthday || null, // Đảm bảo null nếu rỗng
                gender: formData.gender,
                status: formData.status,
                tag_id: formData.tag === "all" ? null : formData.tag, // null nếu "all"
                owner_id: formData.ownerId === "none" ? null : formData.ownerId, // null nếu "none"
                note: formData.notes, // Đổi tên prop từ 'note' sang 'notes' nếu schema DB dùng 'notes'
                source: formData.source,
                website: formData.website,
                facebook: formData.facebook,
                zalo: formData.zalo,
                avatar_url: formData.avatarUrl,
            }]);

            if (insertError) {
                if (insertError.code === '23505' && insertError.message.includes('code')) {
                    // Trả về lỗi để Client Component hiển thị
                    return { error: "Mã khách hàng đã tồn tại. Vui lòng thử lại." };
                } else {
                    return { error: insertError.message || "Có lỗi xảy ra khi lưu khách hàng." };
                }
            }

            revalidatePath("/crm/customers"); // Revalidate danh sách khách hàng
            redirect("/crm/customers");       // Chuyển hướng về trang danh sách

        } catch (err: any) {
            console.error("Server Action add customer error:", err);
            return { error: err.message || "Có lỗi xảy ra khi thêm khách hàng." };
        }
    }

    if (error) {
        return (
            <div className="flex justify-center items-center min-h-[80vh] text-red-500">
                <Card className="w-full max-w-2xl">
                    <CardHeader>
                        <CardTitle>Lỗi tải dữ liệu</CardTitle>
                    </CardHeader>
                    <CardContent>{error}</CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="flex justify-center items-center min-h-[80vh]">
            <Card className="w-full max-w-2xl">
                <CardHeader>
                    <CardTitle>Thêm khách hàng mới</CardTitle>
                </CardHeader>
                <CardContent>
                    {/* CustomerForm là Client Component, nhận dữ liệu và Server Action */}
                    <CustomerForm
                        onSubmitAction={handleAddCustomerAction}
                        // Thêm props tags và users để CustomerForm có thể hiển thị Select
                        tags={tags}
                        users={users}
                        // initialData để rỗng cho form tạo mới
                        initialData={null}
                    />
                </CardContent>
            </Card>
        </div>
    );
}