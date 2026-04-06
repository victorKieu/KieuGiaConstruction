"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, UploadCloud, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";

import QTOClient from "@/components/projects/qto/QTOClient";

// 🔴 IMPORT THÊM 2 HÀM NÀY ĐỂ COMPONENT TỰ LẤY DATA
import { getProjectQTO } from "@/lib/action/qtoActions";
import { getNorms } from "@/lib/action/normActions";

interface Props {
    projectId: string;
    qtoItems?: any[];
    norms?: any[];
}

export default function ProjectQTOTab({ projectId, qtoItems = [], norms = [] }: Props) {
    const router = useRouter();
    const supabase = createClient();

    const [file, setFile] = useState<File | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // 🔴 STATE TỰ QUẢN LÝ DỮ LIỆU
    const [localItems, setLocalItems] = useState<any[]>(qtoItems);
    const [localNorms, setLocalNorms] = useState<any[]>(norms);
    const [isLoadingData, setIsLoadingData] = useState(false);

    // 🔴 HÀM TỰ ĐỘNG KÉO DỮ LIỆU TỪ DATABASE
    const fetchLatestData = async () => {
        setIsLoadingData(true);
        try {
            const freshItems = await getProjectQTO(projectId);
            const freshNorms = await getNorms();

            // ✅ ĐÃ FIX LỖI TS2339: Ép kiểu (as any) để TypeScript bỏ qua việc check strict type
            const validItems = Array.isArray(freshItems) ? freshItems : ((freshItems as any)?.data || []);
            const validNorms = Array.isArray(freshNorms) ? freshNorms : ((freshNorms as any)?.data || []);

            setLocalItems(validItems);
            setLocalNorms(validNorms);
        } catch (error) {
            console.error("Lỗi kéo dữ liệu:", error);
        } finally {
            setIsLoadingData(false);
        }
    };

    // Tự động chạy khi vừa mở Tab
    useEffect(() => {
        fetchLatestData();
    }, [projectId]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
        }
    };

    const handleAnalyzeAI = async () => {
        if (!file) {
            toast.error("Vui lòng chọn bản vẽ (File ảnh hoặc PDF) trước khi phân tích!");
            return;
        }

        try {
            setIsAnalyzing(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `qto-drawings/${projectId}-${Date.now()}.${fileExt}`;

            // Upload vào bucket drawings
            const { error: uploadError } = await supabase.storage
                .from('drawings')
                .upload(fileName, file);

            if (uploadError) {
                throw new Error("Lỗi upload ảnh: " + uploadError.message);
            }

            const { data: { publicUrl } } = supabase.storage
                .from('drawings')
                .getPublicUrl(fileName);

            toast.info("Đã tải ảnh lên, AI đang phân tích (vui lòng đợi 10-30s)...");

            const response = await fetch('/api/ai/takeoff', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: projectId,
                    imageUrl: publicUrl
                })
            });

            const result = await response.json();

            if (result.success) {
                toast.success(result.message || "AI đã bóc tách xong!");
                setFile(null);
                // 🔴 Thay vì refresh trang, tự động kéo data mới nhất nạp vào Bảng
                await fetchLatestData();
            } else {
                toast.error(result.error || "Lỗi khi phân tích AI");
            }

        } catch (error: any) {
            console.error("Lỗi:", error);
            toast.error(error.message || "Đã xảy ra lỗi hệ thống");
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6">
            <Card className="border-purple-200 dark:border-purple-900/50 bg-purple-50/50 dark:bg-purple-900/10 shadow-sm transition-colors">
                <CardHeader className="pb-3">
                    <CardTitle className="text-purple-800 dark:text-purple-400 flex items-center gap-2 text-lg">
                        <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-500" />
                        AI Bóc Tách Khối Lượng (Auto-QTO)
                    </CardTitle>
                    <p className="text-sm text-purple-600/80 dark:text-purple-400/80">
                        Tải lên bản vẽ thiết kế để AI tự động trích xuất các hạng mục, diễn giải và khối lượng.
                    </p>
                </CardHeader>
                <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4">
                        <div className="relative flex-1 w-full">
                            <input
                                type="file"
                                accept="image/*,.pdf"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                disabled={isAnalyzing}
                            />
                            <div className="flex items-center gap-3 p-3 border-2 border-dashed border-purple-300 dark:border-purple-800/60 rounded-lg bg-white dark:bg-slate-950 hover:bg-purple-50 dark:hover:bg-purple-900/20 transition-colors">
                                <UploadCloud className="w-5 h-5 text-purple-500 dark:text-purple-400" />
                                <span className="text-sm font-medium text-slate-600 dark:text-slate-300 truncate">
                                    {file ? file.name : "Nhấn để Chọn Bản Vẽ (Ảnh/PDF)..."}
                                </span>
                            </div>
                        </div>

                        <Button
                            onClick={handleAnalyzeAI}
                            disabled={isAnalyzing || !file}
                            className="w-full sm:w-auto bg-purple-600 hover:bg-purple-700 dark:bg-purple-700 dark:hover:bg-purple-600 text-white shadow-md h-12 px-6 transition-colors"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Đang xử lý...
                                </>
                            ) : (
                                <>
                                    Phân tích AI <Sparkles className="w-4 h-4 ml-2" />
                                </>
                            )}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors relative">
                <div className="mb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                            Bảng Tiên Lượng (Khối lượng bóc tách)
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                            Kết quả do AI trả về hoặc do bạn tạo thủ công.
                        </p>
                    </div>

                    <Button variant="outline" size="sm" onClick={fetchLatestData} disabled={isLoadingData} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                        <RefreshCw className={`w-4 h-4 mr-2 ${isLoadingData ? 'animate-spin' : ''}`} />
                        Làm mới
                    </Button>
                </div>

                {isLoadingData ? (
                    <div className="py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500 dark:text-blue-400" /></div>
                ) : (
                    <QTOClient
                        projectId={projectId}
                        items={localItems}
                        norms={localNorms}
                    />
                )}
            </div>
        </div>
    );
}