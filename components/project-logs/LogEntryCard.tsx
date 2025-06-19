"use client"; // Đánh dấu đây là client component

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import {
    Pencil,
    Trash2,
    Send,
    ThumbsUp,
    ThumbsDown,
    Heart,
    MoreVertical,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Modal from "react-modal"; // Import modal

interface LogEntryCardProps {
    log: {
        id: string;
        log_date: string;
        section?: string;
        content?: string;
        images: string[];
        weather?: string;
        temperature?: string;
        participants?: string;
        directive?: string;
        projectname?: {
            name?: string;
        };
        creator?: {
            avatar_url?: string;
            name?: string; // Đảm bảo tên trường là full_name
        };
        comments?: { id: string; content: string; created_at: string }[]; // Thêm thuộc tính comments
    };
    onEdit?: (log: any) => void;
    onDelete?: (logId: string) => void;
    onAddComment?: (logId: string, comment: string) => void;
    onLike?: (logId: string) => void;
    onUnlike?: (logId: string) => void;
    onLove?: (logId: string) => void;
}

export default function LogEntryCard({
    log,
    onEdit,
    onDelete,
    onAddComment,
    onLike,
    onUnlike,
    onLove,
}: LogEntryCardProps) {
    const [comment, setComment] = useState("");
    const [isLiked, setIsLiked] = useState(false);
    const [isLoved, setIsLoved] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editedContent, setEditedContent] = useState(log.content || "");

    const handleAddComment = () => {
        if (comment.trim() && onAddComment) {
            onAddComment(log.id, comment);
            setComment("");
        }
    };

    const handleLike = () => {
        if (onLike) {
            onLike(log.id);
            setIsLiked(true);
        }
    };

    const handleUnlike = () => {
        if (onUnlike) {
            onUnlike(log.id);
            setIsLiked(false);
        }
    };

    const handleLove = () => {
        if (onLove) {
            onLove(log.id);
            setIsLoved(!isLoved);
        }
    };

    const handleEditLog = () => {
        if (onEdit) {
            onEdit({ ...log, content: editedContent });
            setIsModalOpen(false);
        }
    };

    const handleDeleteLog = () => {
        if (onDelete) {
            onDelete(log.id);
        }
    };

    return (
        <div className="w-full max-w-3xl mx-auto bg-white shadow rounded-lg mb-8 overflow-hidden">
            {/* Header */}
            <div className="flex items-center px-6 py-4 border-b gap-4">
                {/* Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {log.creator?.avatar_url ? (
                        <img
                            src={log.creator.avatar_url}
                            alt="avatar"
                            className="w-10 h-10 rounded-full object-cover bg-gray-200 border"
                        />
                    ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold text-xl">
                            {log.creator?.name?.[0] || "?"}
                        </div>
                    )}
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold truncate">{log.creator?.name || "Người dùng"}</span>
                        <span className="text-xs text-gray-1000">
                            Ngày tạo: {formatDate(log.log_date)} || Dự án: {log.projectname?.name}
                        </span>
                    </div>
                </div>
                {/* Dropdown Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsModalOpen(true)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDeleteLog}>
                            <Trash2 className="w-4 h-4 text-red-500 mr-2" />
                            Xóa
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
            {/* Section - hạng mục */}
            {log.section && (
                <div className="px-6 pt-3 pb-1 text-base font-medium text-blue-800">
                    {log.section}
                </div>
            )}
            {/* Images */}
            {log.images && log.images.length > 0 && (
                <div className="flex flex-row gap-2 w-full p-2">
                    {log.images.map((url, idx) => (
                        <div key={url} className="flex-1 flex justify-center items-center">
                            <img
                                src={url}
                                alt={`log-${idx}`}
                                className="object-cover rounded-lg w-full h-80 max-h-[340px]"
                            />
                        </div>
                    ))}
                </div>
            )}
            {/* Content */}
            <div className="px-6 py-3">
                {log.weather && (
                    <div className="text-xs text-gray-600 mb-1">
                        <b>Thời tiết:</b> {log.weather}
                        {log.temperature && (
                            <span className="ml-1 text-gray-500">({log.temperature})</span>
                        )}
                    </div>
                )}
                {log.content && (
                    <div className="text-base text-gray-800 whitespace-pre-line mb-2">
                        {log.content}
                    </div>
                )}
                {log.directive && (
                    <div className="text-xs text-gray-600 mb-1">
                        <b>Chỉ đạo:</b> {log.directive}
                    </div>
                )}
                {log.participants && (
                    <div className="text-xs text-gray-600 mb-1">
                        <b>Người tham gia:</b> {log.participants}
                    </div>
                )}
            </div>
            {/* Like, Unlike, Love */}
            <div className="flex items-center justify-start px-6 py-3 border-t gap-4">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={isLiked ? handleUnlike : handleLike}
                >
                    {isLiked ? (
                        <ThumbsDown className="w-4 h-4" />
                    ) : (
                        <ThumbsUp className="w-4 h-4" />
                    )}
                </Button>
                <Button size="icon" variant="ghost" onClick={handleLove}>
                    <Heart className={`w-4 h-4 ${isLoved ? "text-red-500" : ""}`} />
                </Button>
            </div>
            {/* Comment Box */}
            <div className="px-6 py-3 border-t bg-gray-50">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        className="flex-1 border rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Viết bình luận..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment();
                        }}
                    />
                    <Button size="icon" onClick={handleAddComment}>
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Modal Sửa Log */}
            <Modal
                isOpen={isModalOpen}
                onRequestClose={() => setIsModalOpen(false)}
                contentLabel="Sửa Log"
                className="modal"
                overlayClassName="overlay"
            >
                <h2 className="text-lg font-semibold mb-4">Sửa Nhật Ký</h2>
                <textarea
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    className="w-full border rounded p-2"
                    rows={4}
                />
                <div className="flex justify-end mt-4">
                    <Button onClick={handleEditLog}>Lưu</Button>
                    <Button variant="outline" onClick={() => setIsModalOpen(false)} className="ml-2">
                        Hủy
                    </Button>
                </div>
            </Modal>
        </div>
    );
}