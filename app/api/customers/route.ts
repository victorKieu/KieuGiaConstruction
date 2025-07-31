import { NextResponse } from 'next/server';
import { z } from 'zod';
import { cookies } from 'next/headers';

// Import hàm helper chính xác của bạn
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { db } from "@/lib/prisma"; // Vẫn dùng Prisma để truy vấn cho type safety

// Schema Zod (giữ nguyên)
const createCustomerSchema = z.object({
    name: z.string().min(1, { message: "Tên khách hàng là bắt buộc" }),
    type: z.enum(["individual", "company"]),
    email: z.string().email({ message: "Email không hợp lệ" }).optional().or(z.literal('')),
    phone: z.string().optional(),
    contactPerson: z.string().optional(),
    address: z.string().optional(),
    taxCode: z.string().optional(),
    birthday: z.string().optional(),
    gender: z.string().optional(),
    status: z.string().optional(),
    ownerId: z.string().min(1, { message: "Cần chỉ định người phụ trách" }),
    tagId: z.string().optional()
});

export async function POST(req: Request) {
    try {
        // --- BƯỚC 1: XÁC THỰC NGƯỜI DÙNG THEO CÁCH CỦA BẠN ---
        const cookieStore = await cookies();

        // Tìm cookie chứa access token. Tên cookie có thể khác, 
        // hãy kiểm tra trong trình duyệt của bạn. Thường là 'sb-...'
        const accessToken = cookieStore.get('sb-access-token')?.value || null; // Giả định tên cookie là 'sb-access-token'

        if (!accessToken) {
            return new NextResponse("Access token not found. Unauthorized.", { status: 401 });
        }

        const supabase = createSupabaseServerClient(accessToken);
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError || !user) {
            return new NextResponse("Invalid user. Unauthorized.", { status: 401 });
        }

        // --- BƯỚC 2: XỬ LÝ REQUEST VÀ VALIDATE ---
        const body = await req.json();
        const validatedData = createCustomerSchema.parse(body);

        // --- BƯỚC 3: TẠO KHÁCH HÀNG BẰNG PRISMA ---
        const customer = await db.customers.create({
            data: validatedData,
        });

        return NextResponse.json(customer, { status: 201 });

    } catch (error) {
        if (error instanceof z.ZodError) {
            return new NextResponse(JSON.stringify(error.errors), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        console.error("[CUSTOMERS_POST_API_ERROR]", error);
        return new NextResponse("Internal Server Error", { status: 500 });
    }
}