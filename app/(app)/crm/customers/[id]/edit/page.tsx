import { createSupabaseServerClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import CustomerForm from "@/components/crm/CustomerForm";

export default async function CustomerEditPage({ params }: { params: { id: string } }) {
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { data: customer, error: customerError } = await supabase
        .from("customers")
        .select("*")
        .eq("id", params.id)
        .single();

    if (customerError) {
        return <div>Error: {customerError.message}</div>;
    }

    if (!customer) {
        return <div>Customer not found</div>;
    }

    // Lấy danh sách khách hàng và người dùng
    const { data: tags } = await supabase.from("customer_tags").select("id, name");
    const { data: users } = await supabase.from("users").select("id, name");

    return (
        <CustomerForm
            initialData={customer}
            tags={tags ?? []}
            users={users ?? []}
        />
    );
}