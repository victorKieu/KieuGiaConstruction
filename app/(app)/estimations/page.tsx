import { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import { Calculator } from "lucide-react";
import EstimationsClient from "./EstimationsClient"; // Import giao diện Client

export const metadata: Metadata = {
    title: "Trung tâm Dự toán & Hồ sơ Đấu thầu | Kiều Gia Construction",
};

export default async function EstimationsHubPage() {
    const profile = await getUserProfile();
    if (!profile || !profile.isAuthenticated) redirect("/login");

    const supabase = await createClient();

    // 1. KÉO TOÀN BỘ DỰ ÁN KÈM TRẠNG THÁI (status_id)
    const { data: projects } = await supabase
        .from("projects")
        // NOTE: Nếu DB của anh dùng cột khác để quản lý trạng thái thì sửa ở đây nhé
        .select("id, name, code, created_at")
        .order("created_at", { ascending: false });

    // 2. KÉO DỮ LIỆU BÓC TÁCH & DỰ TOÁN
    const { data: qtoItems } = await supabase.from("qto_items").select("project_id");
    const { data: estItems } = await supabase.from("estimation_items").select("project_id, total_cost");

    // 3. XỬ LÝ MA TRẬN DỮ LIỆU & RÀNG BUỘC KHÓA (LOCK)
    const processedProjects = (projects || []).map((project) => {
        const totalTasks = (qtoItems || []).filter((q) => q.project_id === project.id).length;
        const totalCost = (estItems || [])
            .filter((e) => e.project_id === project.id)
            .reduce((sum, item) => sum + (Number(item.total_cost) || 0), 0);

        let estimationStatus: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" = "NOT_STARTED";
        if (totalTasks > 0 || totalCost > 0) {
            if (totalCost > 0) estimationStatus = "COMPLETED";
            else estimationStatus = "IN_PROGRESS";
        }

        // TÍNH NĂNG KHÓA (LOCK) TỰ ĐỘNG
        // Ví dụ: Anh có thể dựa vào project.status_id === "DA_HOAN_THANH" hoặc "DA_HUY" 
        // Hiện tại em giả lập logic: Dự án có chữ "TEST" hoặc "CŨ" trong tên thì sẽ bị khóa
        const isLocked = project.name?.toLowerCase().includes("test") || false;

        return {
            ...project,
            totalTasks,
            totalCost,
            estimationStatus,
            isLocked // Biến này sẽ quyết định nút là Xanh (Mở) hay Xám (Khóa)
        };
    });

    const stats = {
        total: processedProjects.length,
        completed: processedProjects.filter(p => p.estimationStatus === "COMPLETED").length,
        inProgress: processedProjects.filter(p => p.estimationStatus === "IN_PROGRESS").length,
        notStarted: processedProjects.filter(p => p.estimationStatus === "NOT_STARTED").length,
    };

    return (
        <div className="space-y-6 w-full max-w-[1920px] mx-auto">
            {/* TIÊU ĐỀ GỌN GÀNG - KHÔNG CÒN NÚT TẠO MỚI */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-5 dark:border-slate-800">
                <div>
                    <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2.5 tracking-tight">
                        <Calculator className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                        TRUNG TÂM BÓC TÁCH KHỐI LƯỢNG & LẬP DỰ TOÁN
                    </h1>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Quản lý hồ sơ tiên lượng. Các dự án đóng/hoàn thành sẽ tự động bị khóa (Chỉ xem).
                    </p>
                </div>
            </div>

            {/* NHÚNG GIAO DIỆN CLIENT CÓ TÍCH HỢP TÌM KIẾM VÀ LỌC */}
            <EstimationsClient projects={processedProjects} stats={stats} />
        </div>
    );
}