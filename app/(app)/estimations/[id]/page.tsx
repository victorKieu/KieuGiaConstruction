import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile } from "@/lib/supabase/getUserProfile";
import ProjectBOQTab from "@/components/estimation/ProjectBOQTab";
import { Calculator } from "lucide-react";
import EstimationHeaderControls from "./EstimationHeaderControls"; // ✅ Nhúng bộ nút điều khiển mới

export const metadata: Metadata = {
    title: "Không gian Tính toán Dự toán | Kiều Gia Construction",
    description: "Phân hệ lập dự toán bóc tách tự động và tổng hợp kinh phí công trình",
};

export default async function EstimationDetailPage(props: any) {
    // 1. PHÂN GIẢI PARAMS AN TOÀN
    const resolvedParams = props?.params ? await props.params : null;
    const projectId = resolvedParams?.id;

    if (!projectId) return notFound();

    // 2. XÁC THỰC DANH TÍNH (SHARED ID ARCHITECTURE)
    const profile = await getUserProfile();
    if (!profile || !profile.isAuthenticated) redirect("/login");

    const supabase = await createClient();

    // 3. KIỂM TRA PHÂN QUYỀN TRUY CẬP HỒ SƠ TỪ PROJECT_MEMBERS
    let currentRole = "";
    if (profile.type === 'EMPLOYEE' && profile.entityId) {
        const { data: member } = await supabase
            .from("project_members")
            .select("role_code")
            .eq("project_id", projectId)
            .eq("user_id", profile.entityId)
            .maybeSingle();

        currentRole = member?.role_code || "";
    }

    const isSystemAdmin = profile.role === 'ADMIN';
    const isProjectAuthorized = ["ADMIN", "MANAGER", "QS_ENGINEER"].includes(currentRole);

    if (!isSystemAdmin && !isProjectAuthorized) {
        return (
            <div className="flex items-center justify-center min-h-[80vh] p-4 bg-slate-50 dark:bg-slate-950">
                <div className="max-w-md w-full bg-white dark:bg-slate-900 border border-red-200 dark:border-red-950 p-6 rounded-xl text-center space-y-3 shadow-md">
                    <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-950 flex items-center justify-center text-red-600 rounded-full text-xl">⚠️</div>
                    <h3 className="font-black text-lg text-slate-900 dark:text-slate-100 uppercase tracking-wide">Truy cập bị từ chối</h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        Dữ liệu đơn giá gốc và biên lợi nhuận thầu thuộc danh mục bảo mật. Tài khoản của bạn chưa được cấp quyền điều hành tại dự án này.
                    </p>
                </div>
            </div>
        );
    }

    // 4. KIỂM TRA HỒ SƠ THÔNG TIN CÔNG TRÌNH
    const { data: project } = await supabase
        .from("projects")
        .select("id, name, code")
        .eq("id", projectId)
        .maybeSingle();

    if (!project) return notFound();

    return (
        <div className="flex flex-col space-y-4 p-4 md:p-6 w-full max-w-[1920px] mx-auto animate-in fade-in duration-300">

            {/* WORKSPACE HEADER DÀNH RIÊNG CHO KHÔNG GIAN BẢNG TÍNH */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-4 dark:border-slate-800 gap-3">
                <div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-400 mb-1 font-medium">
                        <span>Workspace Tổng công ty</span>
                        <span>/</span>
                        <span>Dự toán & Báo giá</span>
                        <span>/</span>
                        <span className="text-blue-600 font-bold font-mono">{project.code || "---"}</span>
                    </div>
                    <h1 className="text-xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2 tracking-tight">
                        <Calculator className="w-5.5 h-5.5 text-blue-600 dark:text-blue-400" />
                        HỒ SƠ BẢNG TÍNH: {project.name.toUpperCase()}
                    </h1>
                </div>

                {/* ✅ ĐÃ TÍCH HỢP BỘ ĐIỀU KHIỂN: QUAY LẠI & RESET */}
                <EstimationHeaderControls projectId={projectId} />
            </div>

            {/* SIÊU PHÂN HỆ TÍNH TOÁN DỰ TOÁN HIỂN THỊ ĐA TAB TRỰC QUAN */}
            <div className="w-full bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-100 dark:border-slate-900 overflow-hidden">
                <ProjectBOQTab projectId={projectId} />
            </div>
        </div>
    );
}