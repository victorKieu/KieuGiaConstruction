"use client";

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import supabase from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, ChevronRight, MessageSquare, X, Edit, Trash2, Reply, Save, MoreVertical } from "lucide-react";
import { useFormState } from 'react-dom';
import { createComment, deleteComment, updateComment } from '@/lib/action/projectActions'; // Cần các actions CRUD
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";


// --- Định nghĩa Kiểu ---
export interface CommentData {
    id: string;
    project_id: string;
    task_id?: string;
    content: string;
    created_at: string;
    updated_at?: string;
    parent_comment_id?: string;
    created_by: {
        id: string;
        name: string;
        avatar_url?: string;
    };
    replies?: CommentData[];
}

interface MemberDisplayData {
    id: string;
    name: string;
    avatar_url?: string;
}

interface TaskCommentSectionProps {
    taskId: string;
    projectId: string;
    members: MemberDisplayData[];
    currentUserId: string;
}

interface ActionFormState {
    success: boolean;
    message?: string;
    error?: string;
}

const initialState: ActionFormState = {
    success: false,
    message: undefined,
    error: undefined,
};

// Tên bảng bình luận thực tế
const COMMENT_TABLE_NAME = 'project_comments';

// Hàm phụ trợ định dạng thời gian
const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return `${date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} - ${date.toLocaleDateString('vi-VN')}`;
};

// --- Component Chính TaskCommentSection ---
export default function TaskCommentSection({ taskId, projectId, members, currentUserId }: TaskCommentSectionProps) {
    const activeUserId = currentUserId;

    // 1. STATE CHO COMMENT VÀ TRẠNG THÁI TẢI
    const [comments, setComments] = useState<CommentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ parentId: string; userName: string } | null>(null);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false); // MẶC ĐỊNH LÀ FALSE (ĐÓNG)

    // 2. ACTION STATE CHO CREATE COMMENT
    const createCommentBound = createComment.bind(null, taskId, projectId);
    const [createState, createAction] = useFormState(createCommentBound, initialState);
    const isSubmitting = createState.message === 'pending';

    // 3. LOGIC TẢI COMMENT
    const fetchComments = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        setReplyingTo(null);

        const supabaseClient = supabase;

        try {
            const { data, error } = await supabaseClient
                .from(COMMENT_TABLE_NAME)
                .select(`
                    id, project_id, task_id, content, created_at, updated_at, parent_comment_id,
                    created_by:user_profiles!created_by (id, name, avatar_url)
                `)
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });

            if (error) throw error;

            const rawComments: CommentData[] = data.map((c: any) => ({
                ...c,
                created_by: {
                    id: c.created_by.id,
                    name: c.created_by.full_name || "Người dùng ẩn danh",
                    avatar_url: c.created_by.avatar_url,
                },
                task_id: c.task_id || undefined,
            }));

            // Xây dựng cây bình luận (chỉ render comment gốc và replies)
            const commentMap = new Map<string, CommentData>();
            const rootComments: CommentData[] = [];

            rawComments.forEach(comment => {
                comment.replies = [];
                commentMap.set(comment.id, comment);

                if (!comment.parent_comment_id) {
                    rootComments.push(comment);
                }
            });

            rawComments.forEach(comment => {
                if (comment.parent_comment_id) {
                    const parent = commentMap.get(comment.parent_comment_id);
                    if (parent) {
                        parent.replies!.push(comment);
                    } else {
                        rootComments.push(comment); // Xử lý comment mồ côi
                    }
                }
            });

            setComments(rootComments);

        } catch (err: any) {
            setFetchError(err.message || "Không thể tải bình luận.");
            console.error("Lỗi khi tải bình luận:", err);
            setComments([]);
        } finally {
            setIsLoading(false);
        }
    }, [taskId]);

    // 4. EFFECT THEO DÕI ACTION & TẢI LẦN ĐẦU
    useEffect(() => {
        fetchComments();
    }, [fetchComments]);

    useEffect(() => {
        if (createState.success) {
            console.log("Bình luận mới đã được tạo thành công.");
            setReplyingTo(null);
            const formElement = document.getElementById('comment-form') as HTMLFormElement;
            if (formElement) formElement.reset();

            fetchComments();
        }
        if (createState.error) {
            console.error("Lỗi khi tạo bình luận:", createState.error);
            alert(`Lỗi khi tạo bình luận: ${createState.error}`);
        }
    }, [createState, fetchComments]);

    // 5. XỬ LÝ PHẢN HỒI
    const handleReply = useCallback((parentId: string, userName: string) => {
        setReplyingTo({ parentId, userName });
        setIsCommentsOpen(true);
        setTimeout(() => {
            document.getElementById('comment-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }, []);

    // 6. XỬ LÝ FORM SUBMIT (GỬI BÌNH LUẬN GỐC/REPLY)
    const handleSubmit = async (formData: FormData) => {
        if (replyingTo) {
            formData.append('parent_comment_id', replyingTo.parentId);
        }
        createAction(formData);
    }

    // Tổng số bình luận (bao gồm cả replies)
    const totalCommentCount = comments.reduce((acc, c) => acc + 1 + (c.replies ? c.replies.length : 0), 0);
    const commentStatusText = isCommentsOpen ? 'Đóng' : `Hiện (${totalCommentCount})`;


    // --- 7. NESTED COMPONENT: COMMENT ITEM (HỢP NHẤT TỪ TaskCommentItem) ---
    const CommentItem = ({ comment, level = 0 }: { comment: CommentData, level?: number }) => {

        const currentId = (activeUserId || '').trim().toLowerCase();
        const creatorId = (comment.created_by.id || '').trim().toLowerCase();
        const isOwner = currentId && creatorId && currentId === creatorId;

        const [isEditing, setIsEditing] = useState(false);
        const [isDeleting, setIsDeleting] = useState(false);
        const [isRepliesOpen, setIsRepliesOpen] = useState(false);

        // Bind comment ID cho Server Actions
        const updateCommentBound = updateComment.bind(null, comment.id);
        const [updateState, updateAction] = useFormState(updateCommentBound, initialState);
        const isUpdating = updateState.message === 'pending';

        const [isPending, startTransition] = useTransition();

        useEffect(() => {
            if (updateState.success) {
                setIsEditing(false); // Thoát khỏi chế độ chỉnh sửa
                fetchComments(); // Tải lại danh sách
            }
            if (updateState.error) {
                console.error("Lỗi cập nhật bình luận:", updateState.error);
                alert(`Lỗi khi cập nhật: ${updateState.error}`);
            }
        }, [updateState, fetchComments]);

        const handleDelete = () => {
            startTransition(async () => {
                const result = await deleteComment(comment.id);
                if (result.success) {
                    fetchComments();
                    setIsDeleting(false);
                } else {
                    console.error("Lỗi xóa bình luận:", result.error);
                    alert(`Lỗi khi xóa: ${result.error}`);
                }
            });
        };

        const marginStyle = level > 0 ? { marginLeft: `${Math.min(level, 4) * 1.5}rem` } : {};
        const bgColor = level % 2 === 0 ? 'bg-white' : 'bg-gray-50';

        return (
            <div
                className={`p-3 rounded-lg border ${bgColor} shadow-sm transition-shadow duration-150`}
                style={marginStyle}
            >
                {/* --- HEADER BÌNH LUẬN --- */}
                <div className="flex justify-between items-start">
                    {/* Thông tin người dùng */}
                    <div className="flex items-center space-x-3">
                        <Avatar className="h-7 w-7">
                            <AvatarImage src={comment.created_by.avatar_url || "/placeholder-avatar.jpg"} alt={comment.created_by.name} />
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-600">
                                {comment.created_by.name[0].toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                            <span className={`text-sm font-semibold ${isOwner ? 'text-blue-600' : 'text-gray-800'}`}>
                                {comment.created_by.name} {isOwner && <span className="text-xs font-normal text-gray-500">(Bạn)</span>}
                            </span>
                            <span className="text-xs text-gray-500">
                                {formatTime(comment.created_at)}
                                {comment.updated_at && <span className="italic ml-2"> (đã sửa)</span>}
                            </span>
                        </div>
                    </div>

                    {/* --- ACTIONS: REPLY & DROPDOWN SỬA/XÓA --- */}
                    <div className="flex items-center space-x-1">
                        {/* Nút Trả lời */}
                        {level < 3 && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleReply(comment.id, comment.created_by.name)} // Sử dụng handleReply từ component cha
                                className="h-7 px-2 text-xs text-blue-500 hover:text-blue-700 hover:bg-blue-50"
                            >
                                <Reply className="h-3 w-3 mr-1" /> Trả lời
                            </Button>
                        )}

                        {/* Dropdown Sửa/Xóa (chỉ hiện cho chủ sở hữu) */}
                        {isOwner && !isEditing && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                                        <MoreVertical className="h-4 w-4 text-gray-500" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-40">
                                    <DropdownMenuItem onClick={() => setIsEditing(true)} className="cursor-pointer text-blue-600">
                                        <Edit className="h-4 w-4 mr-2" /> Sửa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsDeleting(true)} className="cursor-pointer text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" /> Xóa
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* --- NỘI DUNG BÌNH LUẬN --- */}
                <div className="mt-2 pl-2">
                    {isEditing ? (
                        // Form Chỉnh sửa
                        <form action={updateAction} className="space-y-2">
                            <input type="hidden" name="project_id" value={comment.project_id} />
                            <Textarea
                                name="content"
                                defaultValue={comment.content}
                                rows={3}
                                required
                                className="w-full text-sm"
                                disabled={isUpdating}
                            />
                            <div className="flex justify-end space-x-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsEditing(false)}
                                    disabled={isUpdating}
                                >
                                    <X className="h-4 w-4 mr-2" /> Hủy
                                </Button>
                                <Button type="submit" size="sm" disabled={isUpdating}>
                                    {isUpdating ? <><Save className="h-4 w-4 mr-2" /> Đang lưu...</> : <><Save className="h-4 w-4 mr-2" /> Lưu</>}
                                </Button>
                            </div>
                        </form>
                    ) : (
                        // Nội dung hiển thị
                        <p className="text-sm text-gray-700 whitespace-pre-line">{comment.content}</p>
                    )}
                </div>

                {/* --- DELETE CONFIRMATION DIALOG --- */}
                <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Xác nhận xóa bình luận</AlertDialogTitle>
                            <AlertDialogDescription>
                                Bạn có chắc chắn muốn xóa bình luận này? Hành động này không thể hoàn tác.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isPending}>Hủy</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} disabled={isPending} className="bg-red-600 hover:bg-red-700">
                                {isPending ? "Đang xóa..." : "Xóa"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>


                {/* --- PHẢN HỒI (REPLIES) --- */}
                {comment.replies && comment.replies.length > 0 && (
                    <div className={`mt-3 pt-3 border-t ${isRepliesOpen ? 'border-gray-200' : 'border-transparent'} ml-6`}>
                        {/* Toggle Replies Button */}
                        <button
                            onClick={() => setIsRepliesOpen(prev => !prev)}
                            className="flex items-center text-xs text-gray-500 hover:text-blue-600 mb-2 font-medium"
                        >
                            {isRepliesOpen ? (
                                <ChevronDown className="h-3 w-3 mr-1" />
                            ) : (
                                <ChevronRight className="h-3 w-3 mr-1" />
                            )}
                            {isRepliesOpen ? 'Ẩn' : 'Xem'} {comment.replies.length} phản hồi
                        </button>

                        {/* Danh sách Replies (Render Đệ Quy) */}
                        {isRepliesOpen && (
                            <div className="space-y-3 mt-3">
                                {comment.replies.map(reply => (
                                    <CommentItem // GỌI LẠI CHÍNH NÓ (ĐỆ QUY)
                                        key={reply.id}
                                        comment={reply}
                                        level={level + 1}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    };
    // --- KẾT THÚC NESTED COMPONENT COMMENT ITEM ---


    return (
        <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* --- HEADER LÀ NÚT ĐÓNG MỞ TOÀN BỘ KHUNG --- */}
            <button
                onClick={() => setIsCommentsOpen(prev => !prev)}
                className="w-full flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors border border-gray-200 shadow-sm"
                aria-expanded={isCommentsOpen}
                aria-controls="comment-section-content"
            >
                {/* Tiêu đề */}
                <div className="flex items-center space-x-2">
                    <MessageSquare className="h-5 w-5 text-blue-600" />
                    <h3 className="text-base font-semibold text-gray-800">Tương tác & Bình luận</h3>
                </div>

                {/* Icon và trạng thái */}
                <div className="flex items-center space-x-2 text-sm text-blue-600 font-medium">
                    <span>{commentStatusText}</span>
                    {isCommentsOpen ? (
                        <ChevronDown className="h-5 w-5" />
                    ) : (
                        <ChevronRight className="h-5 w-5" />
                    )}
                </div>
            </button>

            {/* --- NỘI DUNG BÌNH LUẬN (CHỈ HIỆN KHI MỞ) --- */}
            {isCommentsOpen && (
                <div id="comment-section-content" className="space-y-4 pt-2">

                    {/* Hộp trả lời hiện tại */}
                    {replyingTo && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between text-sm">
                            <p className="text-blue-700 font-medium">
                                Đang trả lời **{replyingTo.userName}**
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setReplyingTo(null)}
                                className="h-6 w-6 p-0 text-blue-600 hover:text-blue-800"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    {/* Form tạo bình luận */}
                    <form id="comment-form" action={handleSubmit} className="space-y-2 p-4 border rounded-xl bg-white shadow-inner">
                        <input type="hidden" name="task_id" value={taskId} />
                        <input type="hidden" name="project_id" value={projectId} />
                        <input type="hidden" name="parent_comment_id" value={replyingTo?.parentId || ''} />

                        <Textarea
                            name="content"
                            placeholder={replyingTo ? `Viết trả lời cho ${replyingTo.userName}...` : "Viết bình luận mới..."}
                            rows={3}
                            required
                            className="w-full text-sm"
                            disabled={isSubmitting}
                        />
                        <div className="flex justify-end">
                            <Button type="submit" size="sm" disabled={isSubmitting}>
                                {isSubmitting ? "Đang gửi..." : replyingTo ? "Gửi Trả lời" : "Gửi Bình luận"}
                            </Button>
                        </div>
                    </form>

                    {/* Danh sách bình luận */}
                    <div className="space-y-3 pt-2">
                        {fetchError ? (
                            <Alert variant="destructive" className="rounded-xl">
                                <AlertTitle>Lỗi Tải Dữ liệu</AlertTitle>
                                <AlertDescription>{fetchError}</AlertDescription>
                            </Alert>
                        ) : isLoading ? (
                            <div className="text-center py-4 text-gray-500">Đang tải bình luận...</div>
                        ) : comments.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                                Hãy là người đầu tiên bình luận về công việc này!
                            </p>
                        ) : (
                            comments.map((c) => (
                                <CommentItem
                                    key={c.id}
                                    comment={c}
                                    level={0}
                                />
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
