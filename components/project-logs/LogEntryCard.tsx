"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/utils";
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
// ✅ FIX: Thay thế react-modal bằng Dialog của shadcn để hỗ trợ Dark Mode tốt hơn
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea"; // Dùng Textarea chuẩn UI
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"; // Dùng Avatar chuẩn UI

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
            name?: string;
        };
        comments?: { id: string; content: string; created_at: string }[];
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
        // ✅ FIX: bg-white -> bg-card, border colors
        <div className="w-full max-w-3xl mx-auto bg-card border border-border shadow-sm rounded-lg mb-8 overflow-hidden text-card-foreground">
            {/* Header - ✅ FIX: border color */}
            <div className="flex items-center px-6 py-4 border-b border-border gap-4">
                {/* Avatar & Name - ✅ FIX: Sử dụng component Avatar chuẩn */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 border border-border">
                        <AvatarImage src={log.creator?.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-muted text-muted-foreground font-bold">
                            {log.creator?.name?.[0] || "?"}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col min-w-0">
                        {/* ✅ FIX: Text colors */}
                        <span className="font-semibold truncate text-foreground">{log.creator?.name || "Người dùng"}</span>
                        <span className="text-xs text-muted-foreground">
                            Ngày tạo: {formatDate(log.log_date)} <span className="mx-1">||</span> Dự án: {log.projectname?.name}
                        </span>
                    </div>
                </div>

                {/* Dropdown Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        {/* ✅ FIX: Ghost button text color */}
                        <Button size="icon" variant="ghost" className="text-muted-foreground hover:text-foreground">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setIsModalOpen(true)}>
                            <Pencil className="w-4 h-4 mr-2" />
                            Sửa
                        </DropdownMenuItem>
                        {/* ✅ FIX: Text destructive color */}
                        <DropdownMenuItem onClick={handleDeleteLog} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Xóa
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Section - hạng mục */}
            {log.section && (
                // ✅ FIX: Text color blue adapted for dark mode
                <div className="px-6 pt-3 pb-1 text-base font-medium text-blue-700 dark:text-blue-400">
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
                                className="object-cover rounded-lg w-full h-80 max-h-[340px] border border-border"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="px-6 py-3 space-y-2">
                {log.weather && (
                    // ✅ FIX: Text colors
                    <div className="text-xs text-muted-foreground">
                        <b className="text-foreground">Thời tiết:</b> {log.weather}
                        {log.temperature && (
                            <span className="ml-1">({log.temperature})</span>
                        )}
                    </div>
                )}

                {log.content && (
                    // ✅ FIX: Text foreground
                    <div className="text-base text-foreground whitespace-pre-line leading-relaxed">
                        {log.content}
                    </div>
                )}

                {log.directive && (
                    <div className="text-xs text-muted-foreground">
                        <b className="text-foreground">Chỉ đạo:</b> {log.directive}
                    </div>
                )}
                {log.participants && (
                    <div className="text-xs text-muted-foreground">
                        <b className="text-foreground">Người tham gia:</b> {log.participants}
                    </div>
                )}
            </div>

            {/* Like, Unlike, Love - ✅ FIX: Border color */}
            <div className="flex items-center justify-start px-6 py-3 border-t border-border gap-4">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={isLiked ? handleUnlike : handleLike}
                    // ✅ FIX: Active state colors
                    className={isLiked ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "text-muted-foreground hover:text-foreground"}
                >
                    {isLiked ? (
                        <ThumbsUp className="w-4 h-4 fill-current" />
                    ) : (
                        <ThumbsUp className="w-4 h-4" />
                    )}
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleLove}
                    className={isLoved ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20" : "text-muted-foreground hover:text-foreground"}
                >
                    <Heart className={`w-4 h-4 ${isLoved ? "fill-current" : ""}`} />
                </Button>
            </div>

            {/* Comment Box - ✅ FIX: bg-gray-50 -> bg-muted/30, border color */}
            <div className="px-6 py-3 border-t border-border bg-muted/30">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        // ✅ FIX: Input styles for dark mode
                        className="flex-1 border border-input rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-background text-foreground placeholder:text-muted-foreground"
                        placeholder="Viết bình luận..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment();
                        }}
                    />
                    <Button size="icon" onClick={handleAddComment} className="bg-blue-600 hover:bg-blue-700 text-white">
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            {/* Modal Sửa Log - ✅ FIX: Chuyển sang Dialog shadcn */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Sửa Nhật Ký</DialogTitle>
                        <DialogDescription>Chỉnh sửa nội dung nhật ký thi công.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[150px] bg-background"
                            placeholder="Nhập nội dung..."
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)}>
                            Hủy
                        </Button>
                        <Button onClick={handleEditLog} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Lưu
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}