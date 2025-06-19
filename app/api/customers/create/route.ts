// app/api/customers/create/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { id, name, type, contact_person, email, phone, address, tax_code, birthday, gender, status, tag_id, owner_id, note, source, website, facebook, zalo, avatar_url } = await req.json();

    if (id) {
        // Cập nhật khách hàng
        const { error } = await supabase
            .from('customers')
            .update({
                name,
                type,
                contact_person,
                email,
                phone,
                address,
                tax_code,
                birthday,
                gender,
                status,
                tag_id,
                owner_id,
                note,
                source,
                website,
                facebook,
                zalo,
                avatar_url
            })
            .eq('id', id);

        if (error) {
            console.error("Error updating customer:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ message: "Customer updated successfully" }, { status: 200 });
    } else {
        // Thêm mới khách hàng
        const { data, error } = await supabase
            .from('customers')
            .insert([
                {
                    name,
                    type,
                    contact_person,
                    email,
                    phone,
                    address,
                    tax_code,
                    birthday,
                    gender,
                    status,
                    tag_id,
                    owner_id,
                    note,
                    source,
                    website,
                    facebook,
                    zalo,
                    avatar_url
                },
            ]);

        if (error) {
            console.error("Error creating customer:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data, { status: 201 });
    }
}