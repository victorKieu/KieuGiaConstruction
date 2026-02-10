"use client";

import React, { useState } from "react";
import LogEntryCard from "./LogEntryCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Sử dụng Input chuẩn UI nếu có, hoặc style lại input thường
import { Textarea } from "@/components/ui/textarea"; // Sử dụng Textarea chuẩn UI

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
        setIsCreatingLog(true);

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
            setIsCreatingLog(false);
        }
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const urls = Array.from(files).map(file => URL.createObjectURL(file));
            setNewLogImages(urls);
        }
    };

    // ✅ Helper class cho input để tái sử dụng style Dark Mode
    const inputClass = "w-full bg-background border border-input rounded px-3 py-2 mb-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

    return (
        <div>
            {/* ✅ FIX: Text foreground */}
            <h2 className="text-lg font-semibold mb-2 text-foreground">Nhật Ký Công Trình</h2>

            <Button onClick={() => setIsCreatingLog(!isCreatingLog)} className="mb-4">
                {isCreatingLog ? "Hủy" : "Tạo nhật ký"}
            </Button>

            {isCreatingLog && (
                // ✅ FIX: Border & Background colors
                <div className="px-6 py-4 border border-border rounded-lg bg-card shadow-sm mb-6 animate-in fade-in slide-in-from-top-2">
                    <input
                        type="text"
                        placeholder="Hạng mục"
                        value={newLogSection}
                        onChange={(e) => setNewLogSection(e.target.value)}
                        className={inputClass}
                    />
                    <textarea
                        placeholder="Nội dung nhật ký"
                        value={newLogContent}
                        onChange={(e) => setNewLogContent(e.target.value)}
                        className={inputClass}
                        rows={3}
                    />
                    <div className="grid grid-cols-2 gap-4">
                        <input
                            type="text"
                            placeholder="Thời tiết"
                            value={newLogWeather}
                            onChange={(e) => setNewLogWeather(e.target.value)}
                            className={inputClass}
                        />
                        <input
                            type="text"
                            placeholder="Nhiệt độ"
                            value={newLogTemperature}
                            onChange={(e) => setNewLogTemperature(e.target.value)}
                            className={inputClass}
                        />
                    </div>

                    <div className="mb-2">
                        <label className="block text-sm font-medium text-muted-foreground mb-1">Hình ảnh đính kèm</label>
                        <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className={`${inputClass} py-1 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90`}
                        />
                    </div>

                    {newLogImages.length > 0 && (
                        <div className="flex flex-row gap-2 mb-2 overflow-x-auto pb-2">
                            {newLogImages.map((image, index) => (
                                <img
                                    key={index}
                                    src={image}
                                    alt={`preview-${index}`}
                                    className="object-cover rounded-lg w-20 h-20 border border-border"
                                />
                            ))}
                        </div>
                    )}

                    <input
                        type="text"
                        placeholder="Người tham gia"
                        value={newLogParticipants}
                        onChange={(e) => setNewLogParticipants(e.target.value)}
                        className={inputClass}
                    />
                    <input
                        type="text"
                        placeholder="Chỉ đạo"
                        value={newLogDirective}
                        onChange={(e) => setNewLogDirective(e.target.value)}
                        className={inputClass}
                    />
                    <div className="flex justify-end mt-2">
                        <Button onClick={handleCreateLog}>Lưu Nhật Ký</Button>
                    </div>
                </div>
            )}

            <div className="space-y-6">
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