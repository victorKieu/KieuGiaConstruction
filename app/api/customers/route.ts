// app/api/customers/[id]/route.ts
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function GET(req: Request, { params }: { params: { id: string } }) {
    const cookieStore = cookies();
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { id } = params;

    const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('id', id)
        .single();

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
}