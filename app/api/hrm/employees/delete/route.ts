import { NextRequest } from "next/server";
import { deleteEmployee } from "@/lib/employees/deleteEmployee";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const data = await deleteEmployee(params.id);
        return Response.json({ success: true, data });
    } catch (err: unknown) {
        if (err instanceof Error) {
            console.error("Đã xảy ra lỗi:", err.message);
        } else {
            console.error("Đã xảy ra lỗi không xác định:", err);
        }
    }
}