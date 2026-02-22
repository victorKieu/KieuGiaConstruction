"use client"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Loader2, UploadCloud, FileImage, CheckCircle2, Wand2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

// ✅ Đã bỏ surveyId ra khỏi Props
export function DrawingAnalysis({ projectId, onAnalysisComplete }: { projectId: string, onAnalysisComplete?: () => void }) {
    const [file, setFile] = useState<File | null>(null)
    const [analyzing, setAnalyzing] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [imageUrl, setImageUrl] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0])
            setImageUrl(null)
        }
    }

    const uploadFile = async (): Promise<string | null> => {
        if (!file) return null;
        setUploading(true);
        const supabase = createClient();
        const fileExt = file.name.split('.').pop();
        const fileName = `drawing_${projectId}_${Date.now()}.${fileExt}`;

        try {
            const { error } = await supabase.storage.from('drawings').upload(fileName, file);
            if (error) throw error;
            const { data: publicUrlData } = supabase.storage.from('drawings').getPublicUrl(fileName);
            setImageUrl(publicUrlData.publicUrl);
            return publicUrlData.publicUrl;
        } catch (error: any) {
            alert("Lỗi upload: " + error.message);
            return null;
        } finally {
            setUploading(false);
        }
    }

    const handleAITakeoff = async () => {
        if (!file && !imageUrl) return alert("Vui lòng chọn file bản vẽ trước!");
        setAnalyzing(true)
        try {
            let currentUrl = imageUrl || await uploadFile();
            if (!currentUrl) throw new Error("Upload thất bại.");

            const res = await fetch("/api/ai/takeoff", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // ✅ Chỉ cần gửi projectId, Backend sẽ tự tìm Survey mới nhất
                body: JSON.stringify({ projectId, imageUrl: currentUrl })
            })

            const result = await res.json()
            if (result.success) {
                alert(`✨ AI đã bóc tách xong ${result.count} hạng mục!`);
                if (onAnalysisComplete) onAnalysisComplete(); // Reload lại bảng dự toán
            } else {
                alert("Lỗi AI: " + result.error);
            }
        } catch (error: any) {
            alert("Đã xảy ra lỗi: " + error.message);
        } finally {
            setAnalyzing(false)
        }
    }

    return (
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-6 rounded-xl border border-indigo-100 mb-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
            <div>
                <h3 className="font-bold text-indigo-900 flex items-center gap-2">
                    <Wand2 className="w-5 h-5 text-purple-600" /> AI Bóc Tách Khối Lượng (Auto-QTO)
                </h3>
                <p className="text-sm text-indigo-700/70 mt-1">Tải lên bản vẽ thiết kế để AI tự động trích xuất hạng mục và khối lượng.</p>
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
                <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf, image/jpeg, image/png" className="hidden" />

                {!file ? (
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()} className="bg-white hover:bg-indigo-50">
                        <UploadCloud className="w-4 h-4 mr-2" /> Chọn Bản Vẽ
                    </Button>
                ) : (
                    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-md border text-sm font-medium">
                        <FileImage className="w-4 h-4 text-emerald-600" />
                        <span className="max-w-[150px] truncate">{file.name}</span>
                    </div>
                )}

                <Button onClick={handleAITakeoff} disabled={!file || analyzing || uploading} className="bg-indigo-600 hover:bg-indigo-700 text-white min-w-[140px]">
                    {(analyzing || uploading) ? <Loader2 className="w-4 h-4 animate-spin" /> : "Phân tích AI ✨"}
                </Button>
            </div>
        </div>
    )
}