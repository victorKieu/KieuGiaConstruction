"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/utils";
import {
    Pencil,
    Trash2,
    Send,
    ThumbsUp,
    Heart,
    MoreVertical,
} from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
        <div className="w-full max-w-3xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl mb-8 overflow-hidden transition-colors">

            {/* Header */}
            <div className="flex items-center px-6 py-4 border-b border-slate-100 dark:border-slate-800 gap-4 transition-colors">
                {/* Avatar & Name */}
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                        <AvatarImage src={log.creator?.avatar_url} className="object-cover" />
                        <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold">
                            {log.creator?.name?.[0] || "?"}
                        </AvatarFallback>
                    </Avatar>

                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold truncate text-slate-800 dark:text-slate-100 transition-colors">
                            {log.creator?.name || "Người dùng"}
                        </span>
                        <span className="text-xs text-slate-500 dark:text-slate-400 transition-colors">
                            Ngày tạo: {formatDate(log.log_date)} <span className="mx-1">|</span> Dự án: <span className="font-medium text-slate-600 dark:text-slate-300">{log.projectname?.name}</span>
                        </span>
                    </div>
                </div>

                {/* Dropdown Menu */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                            <MoreVertical className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="dark:bg-slate-900 dark:border-slate-800">
                        <DropdownMenuItem onClick={() => setIsModalOpen(true)} className="dark:text-slate-300 dark:focus:bg-slate-800 cursor-pointer">
                            <Pencil className="w-4 h-4 mr-2" /> Sửa
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={handleDeleteLog} className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400 dark:focus:bg-slate-800 cursor-pointer">
                            <Trash2 className="w-4 h-4 mr-2" /> Xóa
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Section - hạng mục */}
            {log.section && (
                <div className="px-6 pt-4 pb-1 text-base font-bold text-blue-700 dark:text-blue-400 transition-colors">
                    {log.section}
                </div>
            )}

            {/* Images */}
            {log.images && log.images.length > 0 && (
                <div className="flex flex-row gap-2 w-full p-3 bg-slate-50/50 dark:bg-slate-950/30 transition-colors">
                    {log.images.map((url, idx) => (
                        <div key={url} className="flex-1 flex justify-center items-center">
                            <img
                                src={url}
                                alt={`log-${idx}`}
                                className="object-cover rounded-lg w-full h-80 max-h-[340px] border border-slate-200 dark:border-slate-800 shadow-sm"
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Content */}
            <div className="px-6 py-4 space-y-3">
                {log.weather && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 transition-colors">
                        <span className="font-bold text-slate-700 dark:text-slate-300">Thời tiết:</span>
                        <span className="bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">{log.weather}</span>
                        {log.temperature && (
                            <span className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border border-orange-100 dark:border-orange-900/50 px-2 py-0.5 rounded-md font-medium ml-1 transition-colors">
                                {log.temperature}
                            </span>
                        )}
                    </div>
                )}

                {log.content && (
                    <div className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-line leading-relaxed transition-colors">
                        {log.content}
                    </div>
                )}

                {log.directive && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 bg-red-50 dark:bg-red-900/10 border-l-2 border-red-500 p-2 rounded-r-md transition-colors">
                        <b className="text-red-700 dark:text-red-400 uppercase tracking-widest block mb-0.5 text-[10px]">Chỉ đạo CHT/CĐT:</b>
                        <span className="font-medium">{log.directive}</span>
                    </div>
                )}

                {log.participants && (
                    <div className="text-xs text-slate-500 dark:text-slate-400 transition-colors">
                        <b className="text-slate-700 dark:text-slate-300">Nhân sự tham gia:</b> {log.participants}
                    </div>
                )}
            </div>

            {/* Like, Love Actions */}
            <div className="flex items-center justify-start px-6 py-3 border-t border-slate-100 dark:border-slate-800 gap-4 transition-colors">
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={isLiked ? handleUnlike : handleLike}
                    className={`h-8 w-8 rounded-full transition-all ${isLiked ? "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30" : "text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                >
                    <ThumbsUp className={`w-4 h-4 ${isLiked ? "fill-current" : ""}`} />
                </Button>
                <Button
                    size="icon"
                    variant="ghost"
                    onClick={handleLove}
                    className={`h-8 w-8 rounded-full transition-all ${isLoved ? "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30" : "text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-slate-100 dark:hover:bg-slate-800"}`}
                >
                    <Heart className={`w-4 h-4 ${isLoved ? "fill-current" : ""}`} />
                </Button>
            </div>

            {/* Comment Box */}
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 transition-colors">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        className="flex-1 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors shadow-sm"
                        placeholder="Viết bình luận..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment();
                        }}
                    />
                    <Button size="icon" onClick={handleAddComment} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full h-9 w-9 shadow-sm shrink-0">
                        <Send className="w-4 h-4 ml-0.5" />
                    </Button>
                </div>
            </div>

            {/* Modal Sửa Log */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="sm:max-w-md dark:bg-slate-900 dark:border-slate-800 transition-colors">
                    <DialogHeader>
                        <DialogTitle className="dark:text-slate-100">Sửa Nhật Ký</DialogTitle>
                        <DialogDescription className="dark:text-slate-400">Chỉnh sửa nội dung chi tiết của nhật ký thi công.</DialogDescription>
                    </DialogHeader>

                    <div className="py-4">
                        <Textarea
                            value={editedContent}
                            onChange={(e) => setEditedContent(e.target.value)}
                            className="min-h-[150px] bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 transition-colors focus-visible:ring-blue-500"
                            placeholder="Nhập nội dung..."
                        />
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsModalOpen(false)} className="dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800">
                            Hủy
                        </Button>
                        <Button onClick={handleEditLog} className="bg-blue-600 hover:bg-blue-700 text-white">
                            Lưu thay đổi
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}