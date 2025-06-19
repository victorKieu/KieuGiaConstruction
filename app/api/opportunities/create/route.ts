import { NextRequest, NextResponse } from 'next/server';
import supabase from '@/lib/supabase/client';

export async function POST(request: NextRequest) {
    try {
        const { title, description, stage, estimatedValue, probability, expectedCloseDate, customerId } = await request.json();

        const { data, error } = await supabase
            .from('opportunities')
            .insert([
                {
                    title,
                    description,
                    stage,
                    estimated_value: estimatedValue,
                    probability,
                    expected_close_date: expectedCloseDate,
                    customer_id: customerId,
                },
            ])
            .select();

        if (error) {
            console.error("Error creating opportunity:", error);
            return NextResponse.json({ error: "Failed to create opportunity" }, { status: 500 });
        }

        return NextResponse.json({ data }, { status: 201 });
    } catch (err: unknown) { // Thay đổi ở đây
        if (err instanceof Error) {
            console.error("Đã xảy ra lỗi tại /api/opportunities/create:", err.message);
        } else {
            console.error("Đã xảy ra lỗi không xác định:", err), { status: 500 };
        }
    }
}