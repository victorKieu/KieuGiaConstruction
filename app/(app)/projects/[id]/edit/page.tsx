// app/(app)/projects/[id]/edit/page.tsx
import { createSupabaseServerClient } from "@/lib/supabase/server";
import ProjectForm from '@/components/projects/ProjectForm';
import { cookies } from "next/headers";
import { notFound } from "next/navigation"; // Quan trọng: Import notFound

// Hàm tiện ích này sẽ đảm bảo mọi giá trị trong object là một chuỗi.
// Bạn có thể đặt hàm này ở đây, hoặc tạo một file utility riêng (ví dụ: utils/data-helpers.ts)
// và import nó nếu bạn cần sử dụng lại ở nhiều nơi.
function cleanProjectDataForClient<T extends Record<string, any>>(data: T | null): T | Record<string, string | undefined> {
    if (!data) return {}; // Nếu không có dữ liệu, trả về object rỗng
    const cleanedData: Record<string, string | undefined> = {};
    for (const key in data) {
        if (Object.prototype.hasOwnProperty.call(data, key)) {
            const value = data[key];
            // Chuyển đổi null hoặc undefined thành chuỗi rỗng, các giá trị khác thành chuỗi
            cleanedData[key] = (value === null || value === undefined) ? "" : String(value);
        }
    }
    return cleanedData as T; // Ép kiểu lại về T hoặc loại bỏ T nếu không cần thiết
}


export default async function EditProjectPage({ params }: { params: { id: string } }) {

    const resolvedParams = await params; // <--- THAY ĐỔI TẠI ĐÂY: await params
    const projectId = resolvedParams.id; // Truy cập id từ resolvedParams
    // `cookies()` là hàm đồng bộ, không cần `await` ở đây
    const cookieStore = await cookies(); // phải await
    const token = cookieStore.get("sb-access-token")?.value || null;
    const supabase = createSupabaseServerClient(token);

    const { data: project, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

    if (error) {
        console.error("Lỗi khi tải dự án:", error.message);
        // Bạn có thể hiển thị một thông báo lỗi thân thiện hơn cho người dùng
        return <div>Đã xảy ra lỗi khi tải dữ án. Vui lòng thử lại.</div>;
    }

    if (!project) {
        // Nếu không tìm thấy dự án, hiển thị trang 404
        notFound();
    }

    // Lấy danh sách khách hàng và quản lý
    const { data: customers, error: customersError } = await supabase.from("customers").select("id, name");
    const { data: managers, error: managersError } = await supabase.from("employees").select("id, name");

    if (customersError) console.error("Lỗi khi tải khách hàng:", customersError.message);
    if (managersError) console.error("Lỗi khi tải quản lý:", managersError.message);

    // --- BƯỚC QUAN TRỌNG: LÀM SẠCH DỮ LIỆU TRƯỚC KHI TRUYỀN VÀO CLIENT COMPONENT ---
    const initialDataForForm = cleanProjectDataForClient(project);

    return (
        <ProjectForm
            // Truyền dữ liệu đã được làm sạch
            initialData={initialDataForForm}
            // Đảm bảo customers và managers luôn là mảng, ngay cả khi fetch lỗi
            customers={customers ?? []}
            managers={managers ?? []}
        />
    );
}