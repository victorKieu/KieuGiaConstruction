"use client";

import React, { useState } from "react";
import LogEntryCard from "./LogEntryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Plus, X } from "lucide-react";

interface ProjectLogsPageClientProps {
    logs: any[];
    projectId: string;
}

function ProjectLogsPageClient({ logs, projectId }: ProjectLogsPageClientProps) {
    const [newLogContent, setNewLogContent] = useState("");
    const [newLogSection, setNewLogSection] = useState("");
    const [newLogWeather, setNewLogWeather] = useState("");
    const [newLogTemperature, setNewLogTemperature] = useState("");
    const [newLogImages, setNewLogImages] = useState<string[]>([]);
    const [newLogParticipants, setNewLogParticipants] = useState("");
    const [newLogDirective, setNewLogDirective] = useState("");
    const [isCreatingLog, setIsCreatingLog] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleEdit = (log: any) => {
        console.log("Edit log:", log);
    };

    const handleDelete = async (logId: string) => {
        console.log("Delete log:", logId);
    };

    const handleAddComment = async (logId: string, comment: string) => {
        console.log("Add comment:", logId, comment);
    };

    const handleLike = async (logId: string) => {
        console.log("Like log:", logId);
    };

    const handleUnlike = async (logId: string) => {
        console.log("Unlike log:", logId);
    };

    const handleLove = async (logId: string) => {
        console.log("Love log:", logId);
    };

    const handleCreateLog = async () => {
        setIsSubmitting(true);

        const newLog = {
            content: newLogContent,
            section: newLogSection,
            weather: newLogWeather,
            temperature: newLogTemperature,
            images: newLogImages,
            participants: newLogParticipants,
            directive: newLogDirective,
            project_id: projectId,
            log_date: new Date().toISOString(),
        };

        try {
            const response = await fetch('/api/project-logs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newLog),
            });

            const text = await response.text();
            let data: any = {};

            try {
                data = JSON.parse(text);
            } catch {
                console.warn('Phản hồi không phải JSON:', text);
            }

            if (!response.ok) {
                console.error('Tạo nhật ký thất bại:', data?.error || 'Lỗi không xác định');
                alert(data?.error || 'Không thể tạo nhật ký');
                return;
            }

            console.log('Tạo nhật ký thành công:', data);
            alert('Đã tạo nhật ký thành công!');
        } catch (err: any) {
            console.error('Lỗi khi gọi API:', err.message);
            alert('Đã xảy ra lỗi khi tạo nhật ký.');
        } finally {
            setNewLogContent('');
            setNewLogSection('');
            setNewLogWeather('');
            setNewLogTemperature('');
            setNewLogImages([]);
            setNewLogParticipants('');
            setNewLogDirective('');
            setIsSubmitting(false);
            setIsCreatingLog(false);
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const urls = Array.from(files).map(file => URL.createObjectURL(file));
            setNewLogImages(prev => [...prev, ...urls]);
        }
    };

    const removeImage = (indexToRemove: number) => {
        setNewLogImages(prev => prev.filter((_, index) => index !== indexToRemove));
    };

    // Class dùng chung cho Input/Textarea chuẩn giao diện
    const inputClass = "mb-3 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus-visible:ring-blue-500 transition-colors";

    return (
        <div className="animate-in fade-in duration-500 transition-colors">
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 transition-colors">Nhật Ký Công Trình</h2>
                <Button
                    onClick={() => setIsCreatingLog(!isCreatingLog)}
                    variant={isCreatingLog ? "outline" : "default"}
                    className={isCreatingLog ? "dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800" : "bg-blue-600 hover:bg-blue-700 text-white"}
                >
                    {isCreatingLog ? "Hủy tạo" : <><Plus className="w-4 h-4 mr-2" /> Tạo nhật ký</>}
                </Button>
            </div>

            {isCreatingLog && (
                <div className="px-6 py-5 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50 dark:bg-slate-900 shadow-sm mb-8 animate-in fade-in slide-in-from-top-4 transition-colors">
                    <h3 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4 border-b border-slate-200 dark:border-slate-800 pb-2">Báo cáo Mới</h3>

                    <Input
                        placeholder="Hạng mục (VD: Thi công móng, Đổ bê tông...)"
                        value={newLogSection}
                        onChange={(e) => setNewLogSection(e.target.value)}
                        className={inputClass}
                    />
                    <Textarea
                        placeholder="Nội dung chi tiết công việc..."
                        value={newLogContent}
                        onChange={(e) => setNewLogContent(e.target.value)}
                        className={inputClass}
                        rows={4}
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-3">
                        <Input
                            placeholder="Thời tiết (VD: Nắng ráo)"
                            value={newLogWeather}
                            onChange={(e) => setNewLogWeather(e.target.value)}
                            className={`mb-0 ${inputClass}`}
                        />
                        <Input
                            placeholder="Nhiệt độ (VD: 32°C)"
                            value={newLogTemperature}
                            onChange={(e) => setNewLogTemperature(e.target.value)}
                            className={`mb-0 ${inputClass}`}
                        />
                    </div>

                    <div className="mb-4 bg-white dark:bg-slate-950 p-3 rounded-lg border border-slate-200 dark:border-slate-800 transition-colors">
                        <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Hình ảnh đính kèm hiện trường</label>
                        <Input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="cursor-pointer dark:bg-slate-900 dark:border-slate-700 dark:text-slate-300 file:bg-blue-50 file:text-blue-700 dark:file:bg-blue-900/30 dark:file:text-blue-400 file:border-0 file:rounded-md file:px-4 file:py-1 hover:file:bg-blue-100 dark:hover:file:bg-blue-900/50 transition-colors"
                        />

                        {newLogImages.length > 0 && (
                            <div className="flex flex-row gap-3 mt-4 overflow-x-auto pb-2">
                                {newLogImages.map((image, index) => (
                                    <div key={index} className="relative group shrink-0">
                                        <img
                                            src={image}
                                            alt={`preview-${index}`}
                                            className="object-cover rounded-lg w-20 h-20 border border-slate-200 dark:border-slate-700 shadow-sm"
                                        />
                                        <button
                                            onClick={() => removeImage(index)}
                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <Input
                        placeholder="Nhân sự tham gia (VD: Nguyễn Văn A, Trần Văn B...)"
                        value={newLogParticipants}
                        onChange={(e) => setNewLogParticipants(e.target.value)}
                        className={inputClass}
                    />
                    <Input
                        placeholder="Ý kiến chỉ đạo của CHT / CĐT (Nếu có)"
                        value={newLogDirective}
                        onChange={(e) => setNewLogDirective(e.target.value)}
                        className={inputClass}
                    />

                    <div className="flex justify-end mt-4 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <Button
                            onClick={handleCreateLog}
                            disabled={isSubmitting}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-8 shadow-md"
                        >
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Đang lưu...</>
                            ) : (
                                "Lưu Nhật Ký"
                            )}
                        </Button>
                    </div>
                </div>
            )}

            <div className="space-y-6">
                {logs.length === 0 && !isCreatingLog && (
                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 transition-colors">
                        Chưa có nhật ký nào được ghi nhận.
                    </div>
                )}
                {logs.map((log) => (
                    <LogEntryCard
                        key={log.id}
                        log={log}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                        onAddComment={handleAddComment}
                        onLike={handleLike}
                        onUnlike={handleUnlike}
                        onLove={handleLove}
                    />
                ))}
            </div>
        </div>
    );
}

export default ProjectLogsPageClient;