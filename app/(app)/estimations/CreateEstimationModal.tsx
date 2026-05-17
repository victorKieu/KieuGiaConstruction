"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Loader2, Calculator } from "lucide-react";
import { Button } from "@/components/ui/button";
import { initializeProjectEstimation } from "./actions";

interface UnestimatedProject {
    id: string;
    name: string;
    code: string;
}

// ✅ FIX: Thêm '= []' và '?' để đảm bảo không bao giờ bị lỗi undefined
export default function CreateEstimationModal({ unestimatedProjects = [] }: { unestimatedProjects?: UnestimatedProject[] }) {
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [selectedProjectId, setSelectedProjectId] = useState("");
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProjectId) return;

        setIsLoading(true);
        try {
            await initializeProjectEstimation(selectedProjectId);
            setIsOpen(false);
            router.push(`/estimations/${selectedProjectId}`);
        } catch (error) {
            console.error(error);
            alert("Có lỗi xảy ra khi khởi tạo hồ sơ dự toán.");
            setIsLoading(false);
        }
    };

    return (
        <>
            <Button
                onClick={() => setIsOpen(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white shadow-md font-bold"
            >
                <Plus className="w-4 h-4 mr-2" /> Khởi tạo hồ sơ dự toán
            </Button>

            {isOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4 animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">

                        <div className="flex justify-between items-center p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
                                <Calculator className="w-5 h-5 text-blue-600" />
                                Chọn Dự Án Cần Lập Dự Toán
                            </h2>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-red-500 transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-5 space-y-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-700 dark:text-slate-300">
                                    Danh sách công trình hiện có <span className="text-red-500">*</span>
                                </label>

                                {/* An toàn 100% nhờ unestimatedProjects luôn là mảng */}
                                {unestimatedProjects.length > 0 ? (
                                    <select
                                        required
                                        value={selectedProjectId}
                                        onChange={(e) => setSelectedProjectId(e.target.value)}
                                        className="w-full px-3 py-2.5 border rounded-md dark:bg-slate-950 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                    >
                                        <option value="">-- Chọn công trình từ hệ thống thi công --</option>
                                        {unestimatedProjects.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                [{p.code}] - {p.name}
                                            </option>
                                        ))}
                                    </select>
                                ) : (
                                    <p className="text-sm text-amber-600 bg-amber-50 dark:bg-amber-950/20 p-3 rounded-lg border border-amber-200 dark:border-amber-900">
                                        💡 Tất cả các công trình hiện có trong hệ thống đều đã được thiết lập hồ sơ dự toán.
                                    </p>
                                )}
                            </div>

                            <div className="pt-4 flex justify-end gap-3 border-t dark:border-slate-800 mt-6">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsOpen(false)}
                                    disabled={isLoading}
                                >
                                    Hủy bỏ
                                </Button>
                                <Button
                                    type="submit"
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5"
                                    disabled={isLoading || !selectedProjectId}
                                >
                                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Vào bảng tính dự toán"}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}