"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { resetProjectEstimation } from "../actions"; // Import action vừa viết

export default function EstimationHeaderControls({ projectId }: { projectId: string }) {
    const [isResetting, setIsResetting] = useState(false);
    const router = useRouter();

    const handleReset = async () => {
        const confirmed = window.confirm(
            "⚠️ CẢNH BÁO HỆ THỐNG:\n\nBạn có chắc chắn muốn XÓA SẠCH toàn bộ dữ liệu bóc tách khối lượng (QTO) và định mức hao phí dự toán của công trình này không?\n\nHành động này sẽ đưa hồ sơ về trạng thái trống ban đầu và KHÔNG THỂ HOÀN TÁC!"
        );

        if (!confirmed) return;

        setIsResetting(true);
        try {
            await resetProjectEstimation(projectId);
            alert("🔄 Hệ thống đã dọn dẹp sạch sẽ dữ liệu. Bạn có thể bắt đầu lập lại hồ sơ mới!");
            //router.refresh(); // Tải lại dữ liệu trang để bảng tính cập nhật trạng thái trống
            window.location.reload()
        } catch (error: any) {
            console.error(error);
            alert(`🔥 Có lỗi xảy ra: ${error.message}`);
        } finally {
            setIsResetting(false);
        }
    };

    return (
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end mt-3 sm:mt-0">
            {/* CHỨC NĂNG 1: NÚT QUAY VỀ TRANG CHỦ ESTIMATIONS */}
            <Link href="/estimations">
                <Button
                    variant="outline"
                    className="font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
                >
                    <ArrowLeft className="w-4 h-4" /> Quay lại danh sách
                </Button>
            </Link>

            {/* CHỨC NĂNG 2: NÚT RESET DỌN DẸP SÀN DỮ LIỆU */}
            <Button
                variant="destructive"
                disabled={isResetting}
                onClick={handleReset}
                className="font-bold text-xs uppercase tracking-wider bg-red-600 hover:bg-red-700 text-white flex items-center gap-1.5 shadow-sm"
            >
                {isResetting ? (
                    <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Đang xóa dữ liệu...
                    </>
                ) : (
                    <>
                        <Trash2 className="w-3.5 h-3.5" />
                        Xóa dữ liệu (Reset)
                    </>
                )}
            </Button>
        </div>
    );
}