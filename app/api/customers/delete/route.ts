// app/api/customers/delete/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function DELETE(req: Request) {
    const cookieStore = await cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { id } = await req.json(); // Lấy id từ body của yêu cầu

    const { error } = await supabase
        .from('customers')
        .delete()
        .eq('id', id);

    if (error) {
        console.error("Error deleting customer:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Customer deleted successfully" }, { status: 200 });
}