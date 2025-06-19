"use client"; // Đánh dấu đây là client component

import React, { useState } from "react";
import LogEntryCard from "./LogEntryCard";
import { Button } from "@/components/ui/button";

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
    const [isCreatingLog, setIsCreatingLog] = useState(false); // Trạng thái để hiển thị form tạo nhật ký

    const handleEdit = (log: any) => {
        console.log("Edit log:", log);
    };

    const handleDelete = async (logId: string) => {
        console.log("Delete log:", logId);
        // Gọi API để xóa log
    };

    const handleAddComment = async (logId: string, comment: string) => {
        console.log("Add comment:", logId, comment);
        // Gọi API để thêm bình luận
    };

    const handleLike = async (logId: string) => {
        console.log("Like log:", logId);
        // Gọi API để thích log
    };

    const handleUnlike = async (logId: string) => {
        console.log("Unlike log:", logId);
        // Gọi API để bỏ thích log
    };

    const handleLove = async (logId: string) => {
        console.log("Love log:", logId);
        // Gọi API để thả tim log
    };

    const handleCreateLog = async () => {
        const newLog = {
            content: newLogContent,
            section: newLogSection,
            weather: newLogWeather,
            temperature: newLogTemperature,
            images: newLogImages,
            participants: newLogParticipants,
            directive: newLogDirective,
            project_id: projectId,
            log_date: new Date().toISOString(), // Lưu cả ngày và giờ
        };

        const response = await fetch('/api/project-logs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newLog),
        });

        if (response.ok) {
            console.log("Log created successfully");
            // Cập nhật lại danh sách logs nếu cần
            // Có thể gọi lại API để lấy danh sách logs mới
        } else {
            const errorData = await response.json(); // Lấy thông tin lỗi từ phản hồi
            console.error("Failed to create log:", errorData); // Log thông tin lỗi
        }

        // Reset form
        setNewLogContent("");
        setNewLogSection("");
        setNewLogWeather("");
        setNewLogTemperature
        setNewLogImages([]);
        setNewLogParticipants("");
        setNewLogDirective("");
        setIsCreatingLog(false); // Đóng form sau khi tạo nhật ký
    };

    const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files) {
            const urls = Array.from(files).map(file => URL.createObjectURL(file));
            setNewLogImages(urls);
        }
    };

    return (
        <div>
            <h2 className="text-lg font-semibold mb-2">Nhật Ký Công Trình</h2>
            {/* Nút để mở form tạo mới nhật ký */}
            <Button onClick={() => setIsCreatingLog(!isCreatingLog)}>
                {isCreatingLog ? "Hủy" : "Tạo nhật ký"}
            </Button>
            {isCreatingLog && (
                <div className="px-6 py-4 border-b">
                    <input
                        type="text"
                        placeholder="Hạng mục"
                        value={newLogSection}
                        onChange={(e) => setNewLogSection(e.target.value)}
                        className="border rounded px-3 py-2 mb-2 w-full"
                    />
                    <textarea
                        placeholder="Nội dung nhật ký"
                        value={newLogContent}
                        onChange={(e) => setNewLogContent(e.target.value)}
                        className="border rounded px-3 py-2 mb-2 w-full"
                        rows={3}
                    />
                    <input
                        type="text"
                        placeholder="Thời tiết"
                        value={newLogWeather}
                        onChange={(e) => setNewLogWeather(e.target.value)}
                        className="border rounded px-3 py-2 mb-2 w-full"
                    />
                    <input
                        type="text"
                        placeholder="Nhiệt độ"
                        value={newLogTemperature}
                        onChange={(e) => setNewLogTemperature(e.target.value)}
                        className="border rounded px-3 py-2 mb-2 w-full"
                    />
                    <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleImageUpload}
                        className="border rounded px-3 py-2 mb-2 w-full"
                    />
                    <div className="flex flex-row gap-2">
                        {newLogImages.map((image, index) => (
                            <img
                                key={index}
                                src={image}
                                alt={`preview-${index}`}
                                className="object-cover rounded-lg w-20 h-20"
                            />
                        ))}
                    </div>
                    <input
                        type="text"
                        placeholder="Người tham gia"
                        value={newLogParticipants}
                        onChange={(e) => setNewLogParticipants(e.target.value)}
                        className="border rounded px-3 py-2 mb-2 w-full"
                    />
                    <input
                        type="text"
                        placeholder="Chỉ đạo"
                        value={newLogDirective}
                        onChange={(e) => setNewLogDirective(e.target.value)}
                        className="border rounded px-3 py-2 mb-2 w-full"
                    />
                    <Button onClick={handleCreateLog} className="mt-2">Tạo Nhật Ký</Button>
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
    );
}

export default ProjectLogsPageClient;