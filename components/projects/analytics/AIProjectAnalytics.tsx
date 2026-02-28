"use client";

import React, { useState, useRef } from "react";
import {
    Bot, Volume2, Loader2, Sparkles, AlertTriangle, TrendingUp,
    StopCircle, PlayCircle, Activity
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { formatCurrency } from "@/lib/utils/utils";

interface AIAnalyticsProps {
    project: any;
    financeStats?: any;
}

export default function AIProjectAnalytics({ project, financeStats }: AIAnalyticsProps) {
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [report, setReport] = useState<string | null>(null);

    // State cho Audio (Giọng đọc AI)
    const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [audioSrc, setAudioSrc] = useState<string | null>(null);

    // 1. Hàm gọi AI phân tích số liệu
    const handleAnalyze = async () => {
        setIsAnalyzing(true);
        setReport(null);
        setAudioSrc(null); // Xóa audio cũ nếu phân tích lại

        // Gom data dự án để mớm cho AI
        const promptData = `
        Tên dự án: ${project?.name || "Chưa cập nhật"}
        Trạng thái: ${project?.status_data?.name || "Đang thi công"}
        Tiến độ thực tế: ${project?.progress || 0}%
        Tổng ngân sách: ${formatCurrency(financeStats?.totalRevenue || 0)}
        Thực chi hiện tại: ${formatCurrency(financeStats?.totalCost || 0)}
        Lợi nhuận tạm tính: ${formatCurrency(financeStats?.profit || 0)}
        
        Hãy viết 1 đoạn báo cáo giao ban ngắn gọn (khoảng 150 chữ). 
        Nhận xét về tiến độ, dòng tiền, và cảnh báo 1 rủi ro tiềm ẩn (nếu thực chi cao hoặc tiến độ chậm). Giọng điệu chuyên nghiệp, như một Giám đốc Dự án.
        `;

        try {
            const res = await fetch("/api/ai/analyze", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    prompt: promptData,
                    useSearch: true // Bật tìm kiếm để AI cập nhật giá cả thị trường nếu cần
                })
            });

            const data = await res.json();
            if (data.success) {
                setReport(data.text);
                toast.success("AI đã phân tích xong!");
            } else {
                toast.error(data.error || "Lỗi khi phân tích");
            }
        } catch (error) {
            toast.error("Lỗi hệ thống khi gọi AI");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // 2. Hàm gọi AI đọc báo cáo (TTS)
    const handlePlayAudio = async () => {
        if (!report) return;

        // Nếu đã có file âm thanh thì Play luôn, không cần gọi API lại
        if (audioSrc && audioRef.current) {
            audioRef.current.play();
            setIsPlaying(true);
            return;
        }

        setIsGeneratingAudio(true);
        try {
            const res = await fetch("/api/ai/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: report })
            });

            const data = await res.json();
            if (data.success && data.audioData) {
                // Chuyển Base64 thành Data URL để trình duyệt đọc được
                const newAudioSrc = `data:audio/wav;base64,${data.audioData}`;
                setAudioSrc(newAudioSrc);

                // Đợi React cập nhật state xong thì Play
                setTimeout(() => {
                    if (audioRef.current) {
                        audioRef.current.play();
                        setIsPlaying(true);
                    }
                }, 100);
            } else {
                toast.error(data.error || "Lỗi tạo giọng nói");
            }
        } catch (error) {
            toast.error("Lỗi hệ thống TTS");
        } finally {
            setIsGeneratingAudio(false);
        }
    };

    const handleStopAudio = () => {
        if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0; // Trả về đầu bài
            setIsPlaying(false);
        }
    };

    return (
        <Card className="border-blue-200 shadow-md bg-gradient-to-br from-white to-blue-50/30 dark:from-card dark:to-blue-950/20 overflow-hidden relative">
            {/* Hiệu ứng tia chớp lấp lánh ở góc */}
            <div className="absolute -right-6 -top-6 w-24 h-24 bg-blue-500/10 rounded-full blur-2xl"></div>

            <CardHeader className="pb-2 flex flex-row items-center justify-between z-10 relative">
                <CardTitle className="flex items-center gap-2 text-lg text-blue-800 dark:text-blue-300">
                    <Bot className="w-5 h-5 text-blue-600" />
                    AI Giám sát Dự án (PM Ảo)
                </CardTitle>
                <Button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                    {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Activity className="w-4 h-4 mr-2" />}
                    {report ? "Phân tích lại" : "Khởi động AI"}
                </Button>
            </CardHeader>

            <CardContent className="z-10 relative">
                {!report && !isAnalyzing && (
                    <div className="text-center py-6 text-muted-foreground text-sm italic border-2 border-dashed border-blue-100 dark:border-blue-900 rounded-lg">
                        Chưa có báo cáo. Nhấn "Khởi động AI" để tổng hợp tình hình dự án ngày hôm nay.
                    </div>
                )}

                {isAnalyzing && (
                    <div className="text-center py-8 space-y-3">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                        <p className="text-sm text-blue-600 animate-pulse">AI đang tổng hợp số liệu tài chính & tiến độ...</p>
                    </div>
                )}

                {report && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Khung hiển thị text báo cáo */}
                        <div className="p-4 bg-white dark:bg-slate-900 rounded-lg border border-blue-100 dark:border-blue-800 shadow-sm text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {report}
                        </div>

                        {/* Thanh điều khiển Giọng nói */}
                        <div className="flex items-center justify-between bg-blue-100/50 dark:bg-blue-900/30 p-2 rounded-lg">
                            <div className="flex items-center gap-2 text-sm font-medium text-blue-800 dark:text-blue-300">
                                <Volume2 className="w-4 h-4" />
                                Báo cáo bằng Giọng nói
                            </div>

                            <div className="flex items-center gap-2">
                                {!isPlaying ? (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 border-blue-300 hover:bg-blue-200 dark:hover:bg-blue-800 text-blue-700 dark:text-blue-300"
                                        onClick={handlePlayAudio}
                                        disabled={isGeneratingAudio}
                                    >
                                        {isGeneratingAudio ? (
                                            <><Loader2 className="w-4 h-4 mr-1 animate-spin" /> Đang tạo...</>
                                        ) : (
                                            <><PlayCircle className="w-4 h-4 mr-1" /> Nghe</>
                                        )}
                                    </Button>
                                ) : (
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        className="h-8"
                                        onClick={handleStopAudio}
                                    >
                                        <StopCircle className="w-4 h-4 mr-1" /> Dừng
                                    </Button>
                                )}
                            </div>
                        </div>

                        {/* Thẻ audio ẩn dùng để phát nhạc */}
                        {audioSrc && (
                            <audio
                                ref={audioRef}
                                src={audioSrc}
                                onEnded={() => setIsPlaying(false)}
                                className="hidden"
                            />
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}