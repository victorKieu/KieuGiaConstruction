"use client";

import React, {
    useState,
    useEffect,
    useCallback,
    useTransition,
    useActionState
} from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
// ✅ KHẮC PHỤC LỖI ĐƯỜNG DẪN: Đã chuyển lại sang đường dẫn tương đối
import supabase from "../../lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ChevronDown, ChevronRight, MessageSquare, X, Edit, Trash2, Reply, Save, MoreVertical } from "lucide-react";

// ✅ KHẮC PHỤC LỖI ĐƯỜNG DẪN: Đã chuyển lại sang đường dẫn tương đối
import { createComment, deleteComment, updateComment } from '../../lib/action/projectActions';
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
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';


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
    activeUserId: string;
}

// --- Định nghĩa Kiểu Trạng Thái Form ---
interface ActionFormState {
    success: boolean;
    message?: string;
    error?: string;
}

// Trạng thái khởi tạo cho useActionState
const initialFormState: ActionFormState = {
    success: false,
    message: undefined,
    error: undefined
};

// --- Component Con: Hiển thị từng Bình luận và xử lý Edit/Delete ---

interface TaskCommentItemProps {
    comment: CommentData;
    level: number;
    currentUserId: string;
    onReply: (parentId: string, userName: string) => void;
    refreshComments: () => void;
}

function TaskCommentItem({ comment, level, currentUserId, onReply, refreshComments }: TaskCommentItemProps) {
    const isOwner = comment.created_by.id === currentUserId;
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState(comment.content);
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
    const [isRepliesOpen, setIsRepliesOpen] = useState(level < 1 || comment.replies && comment.replies.length > 0);


    // --- 1. Xử lý CẬP NHẬT Bình luận (Edit) ---

    // Gán commentId cho updateComment (dùng .bind)
    const updateCommentBound = updateComment.bind(null, comment.id);

    // Dùng useActionState
    const [updateState, updateAction] = useActionState<ActionFormState, FormData>(
        updateCommentBound,
        initialFormState
    );

    useEffect(() => {
        if (updateState.success) {
            setIsEditing(false);
            refreshComments();
        } else if (updateState.error) {
            console.error("Lỗi cập nhật bình luận:", updateState.error);
        }
    }, [updateState, refreshComments]);


    // --- 2. Xử lý XÓA Bình luận (Delete) ---

    // Gán commentId cho deleteComment (dùng .bind)
    const deleteCommentBound = deleteComment.bind(null, comment.id);

    // Dùng useActionState
    const [deleteState, deleteAction] = useActionState<ActionFormState, FormData>(
        deleteCommentBound,
        initialFormState
    );

    useEffect(() => {
        if (deleteState.success) {
            setIsDeleteDialogOpen(false);
            refreshComments();
        } else if (deleteState.error) {
            console.error("Lỗi xóa bình luận:", deleteState.error);
        }
    }, [deleteState, refreshComments]);


    const avatarFallbackText = comment.created_by.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const paddingLeft = level * 1.5; // Đẩy vào 1.5 rem cho mỗi cấp độ

    const handleEditSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        // Thêm các trường cần thiết (ví dụ: project_id cho revalidate)
        formData.set("project_id", comment.project_id);
        updateAction(formData);
    };

    const handleDelete = () => {
        const formData = new FormData();
        // Thêm các trường cần thiết (ví dụ: project_id cho revalidate)
        formData.set("project_id", comment.project_id);
        deleteAction(formData);
    };

    const formattedDate = format(new Date(comment.created_at), 'HH:mm dd/MM/yyyy', { locale: vi });

    return (
        <div
            className="group relative"
            style={{ paddingLeft: `${paddingLeft}rem` }}
        >
            <div className="flex items-start space-x-3 p-3 bg-gray-50 border-l-2 border-gray-200 rounded-lg shadow-sm hover:bg-gray-100 transition duration-150 mb-2">
                <Avatar className="w-8 h-8 flex-shrink-0">
                    <AvatarImage src={comment.created_by.avatar_url} alt={comment.created_by.name} />
                    <AvatarFallback className="bg-blue-500 text-white text-xs">{avatarFallbackText}</AvatarFallback>
                </Avatar>

                <div className="flex-1 min-w-0">
                    {/* Tên & Thời gian */}
                    <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-800 text-sm">
                            {comment.created_by.name}
                        </span>
                        <span className="text-xs text-gray-500 ml-2">
                            {formattedDate} {comment.updated_at && "(đã sửa)"}
                        </span>
                    </div>

                    {/* Nội dung */}
                    <div className="mt-1 text-sm text-gray-700 break-words whitespace-pre-wrap">
                        {isEditing ? (
                            <form onSubmit={handleEditSubmit} className="space-y-2">
                                <Textarea
                                    name="content"
                                    value={editedContent}
                                    onChange={(e) => setEditedContent(e.target.value)}
                                    rows={3}
                                    required
                                    className="resize-none"
                                />
                                {updateState.error && (
                                    <Alert variant="destructive" className="rounded-lg text-xs py-2">
                                        <AlertDescription>{updateState.error}</AlertDescription>
                                    </Alert>
                                )}
                                <div className="flex justify-end space-x-2">
                                    <Button type="button" variant="outline" size="sm" onClick={() => setIsEditing(false)}>
                                        Hủy
                                    </Button>
                                    <Button type="submit" size="sm" disabled={updateState.success || editedContent.trim() === comment.content.trim()}>
                                        <Save className="h-4 w-4 mr-1" /> Lưu
                                    </Button>
                                </div>
                            </form>
                        ) : (
                            comment.content
                        )}
                    </div>

                    {/* Hành động */}
                    <div className="flex items-center space-x-3 mt-2 text-xs text-gray-500">
                        {/* Chỉ hiển thị Reply nếu không phải cấp độ quá sâu */}
                        {level < 3 && (
                            <button
                                onClick={() => onReply(comment.id, comment.created_by.name)}
                                className="flex items-center hover:text-blue-600 transition"
                            >
                                <Reply className="h-3 w-3 mr-1" /> Trả lời
                            </button>
                        )}

                        {isOwner && !isEditing && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition"
                                    >
                                        <MoreVertical className="h-3 w-3" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => setIsEditing(true)}>
                                        <Edit className="h-4 w-4 mr-2" /> Sửa
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setIsDeleteDialogOpen(true)} className="text-red-600">
                                        <Trash2 className="h-4 w-4 mr-2" /> Xóa
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>
            </div>

            {/* Hiển thị Replies */}
            {comment.replies && comment.replies.length > 0 && (
                <div className="mt-2">
                    <button
                        onClick={() => setIsRepliesOpen(!isRepliesOpen)}
                        className="flex items-center text-sm font-medium text-blue-600 hover:text-blue-700 ml-4 mb-2 transition"
                        style={{ paddingLeft: `${paddingLeft}rem` }}
                    >
                        {isRepliesOpen ? (
                            <ChevronDown className="h-4 w-4 mr-1" />
                        ) : (
                            <ChevronRight className="h-4 w-4 mr-1" />
                        )}
                        Xem {comment.replies.length} phản hồi
                    </button>

                    {isRepliesOpen && (
                        <div className="space-y-2 pt-1">
                            {comment.replies.map(reply => (
                                <TaskCommentItem
                                    key={reply.id}
                                    comment={reply}
                                    level={level + 1}
                                    currentUserId={currentUserId}
                                    onReply={onReply}
                                    refreshComments={refreshComments}
                                />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Dialog Xác nhận Xóa */}
            <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Xác nhận Xóa Bình luận</AlertDialogTitle>
                        <AlertDialogDescription>
                            Bạn có chắc chắn muốn xóa bình luận này không? Hành động này không thể hoàn tác.
                        </AlertDialogDescription>
                        {deleteState.error && (
                            <Alert variant="destructive" className="rounded-lg text-xs py-2 mt-2">
                                <AlertDescription>{deleteState.error}</AlertDescription>
                            </Alert>
                        )}
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleteState.success}>Hủy</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            disabled={deleteState.success}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleteState.success ? "Đang Xóa..." : "Xóa"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}


// --- Component Chính TaskCommentSection ---

export default function TaskCommentSection({ taskId, projectId, members, activeUserId }: TaskCommentSectionProps) {
    const [comments, setComments] = useState<CommentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [commentContent, setCommentContent] = useState('');
    const [isSubmitting, startTransition] = useTransition();

    // State cho chức năng Reply
    const [replyingTo, setReplyingTo] = useState<{ id: string, name: string } | null>(null);
    const [parentCommentId, setParentCommentId] = useState<string | null>(null);

    // State cho Server Action (Gửi bình luận)
    const [formState, formAction] = useActionState<ActionFormState, FormData>(
        (prevState, formData) => createComment(projectId, prevState, formData),
        initialFormState
    );

    // Xử lý khi Server Action hoàn thành
    useEffect(() => {
        if (formState.success) {
            setCommentContent(''); // Xóa nội dung
            setReplyingTo(null); // Reset trạng thái trả lời
            setParentCommentId(null);
            // Sau khi tạo thành công, tự động refresh dữ liệu
            fetchComments();
        } else if (formState.error) {
            console.error("Lỗi gửi bình luận:", formState.error);
        }
    }, [formState]);


    // Hàm ánh xạ dữ liệu thành viên vào bình luận
    const mapCommentData = useCallback((rawComments: any[]): CommentData[] => {
        const memberMap = new Map(members.map(m => [m.id, m]));

        // 1. Chuyển đổi dữ liệu thô sang CommentData và tạo cấu trúc phẳng
        const flatComments: CommentData[] = rawComments.map(c => ({
            id: c.id,
            project_id: c.project_id,
            task_id: c.task_id,
            content: c.content,
            created_at: c.created_at,
            updated_at: c.updated_at,
            parent_comment_id: c.parent_comment_id,
            created_by: memberMap.get(c.created_by_user_id) || { id: c.created_by_user_id, name: "Thành viên đã rời đi" },
            replies: [],
        }));

        // 2. Xây dựng cây bình luận (chỉ giữ lại bình luận cấp cao nhất)
        const commentMap = new Map<string, CommentData>();
        const rootComments: CommentData[] = [];

        flatComments.forEach(comment => {
            commentMap.set(comment.id, comment);
            if (comment.parent_comment_id) {
                const parent = commentMap.get(comment.parent_comment_id);
                if (parent) {
                    // Sửa lỗi tiềm ẩn: Nếu replies bị undef
                    if (!parent.replies) parent.replies = [];
                    parent.replies.push(comment);
                } else {
                    rootComments.push(comment);
                }
            } else {
                rootComments.push(comment);
            }
        });

        // Sắp xếp replies và root comments
        rootComments.forEach(root => {
            if (root.replies) {
                root.replies.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
            }
        });
        rootComments.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        return rootComments;

    }, [members]);


    // Hàm tải dữ liệu bình luận
    const fetchComments = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);

        const { data, error } = await supabase
            .from('project_comments')
            .select('*')
            .eq('task_id', taskId)
            .order('created_at', { ascending: true });

        if (error) {
            console.error('Lỗi tải bình luận:', error);
            setFetchError(error.message);
            setComments([]);
        } else if (data) {
            const mappedComments = mapCommentData(data);
            setComments(mappedComments);
        }

        setIsLoading(false);
    }, [taskId, mapCommentData]);


    // Xử lý sự kiện subscribe/fetch ban đầu
    useEffect(() => {
        fetchComments();

        const channel = supabase
            .channel(`task_comments_${taskId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'project_comments', filter: `task_id=eq.${taskId}` },
                (payload) => {
                    console.log('Realtime change received!', payload);
                    fetchComments();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchComments, taskId]);

    // Hàm xử lý Reply
    const handleReply = useCallback((parentId: string, userName: string) => {
        setReplyingTo({ id: parentId, name: userName });
        setParentCommentId(parentId);
        document.getElementById('comment-textarea')?.focus();
    }, []);

    // Hàm hủy Reply
    const handleCancelReply = useCallback(() => {
        setReplyingTo(null);
        setParentCommentId(null);
    }, []);

    // Gửi Form
    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        const form = e.currentTarget;
        const formData = new FormData(form);

        if (parentCommentId) {
            formData.set("parent_comment_id", parentCommentId);
        } else {
            formData.delete("parent_comment_id");
        }

        formData.set("task_id", taskId);

        startTransition(() => {
            formAction(formData);
        });
    };

    return (
        <div className="pt-4 space-y-4">
            <h3 className="text-lg font-semibold flex items-center text-gray-800">
                <MessageSquare className="h-5 w-5 mr-2 text-blue-500" />
                Bình luận ({comments.length})
            </h3>

            <div className="bg-white p-4 rounded-xl border shadow-sm">

                {/* Khu vực Gửi Bình luận */}
                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Input ẩn chứa Task ID và Parent ID */}
                    <input type="hidden" name="task_id" value={taskId} />

                    {/* Hiển thị trạng thái đang trả lời */}
                    {replyingTo && (
                        <div className="flex items-center space-x-2 p-2 bg-blue-50 rounded-lg border border-blue-200 text-sm">
                            <Reply className="h-4 w-4 text-blue-600" />
                            <span className="text-gray-700">Đang trả lời:
                                <span className="font-semibold text-blue-700 ml-1">@{replyingTo.name}</span>
                            </span>
                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={handleCancelReply}
                                className="h-6 w-6 text-gray-500 hover:text-red-500"
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}

                    <Textarea
                        id="comment-textarea"
                        name="content"
                        placeholder={replyingTo ? `Trả lời @${replyingTo.name}...` : "Viết bình luận của bạn..."}
                        value={commentContent}
                        onChange={(e) => setCommentContent(e.target.value)}
                        required
                        disabled={isSubmitting || isLoading}
                        className="min-h-[80px] rounded-lg focus:ring-blue-500"
                    />

                    {formState.error && (
                        <Alert variant="destructive" className="rounded-lg">
                            <AlertTitle>Lỗi Gửi Bình luận</AlertTitle>
                            <AlertDescription>{formState.error}</AlertDescription>
                        </Alert>
                    )}

                    <div className="flex justify-end items-center">
                        <Button type="submit" disabled={isSubmitting || commentContent.trim().length === 0 || isLoading}>
                            {isSubmitting ? "Đang gửi..." : replyingTo ? "Gửi Trả lời" : "Gửi Bình luận"}
                        </Button>
                    </div>
                </form>

                {/* Danh sách bình luận */}
                <div className="space-y-3 pt-4 border-t mt-4">
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
                            <TaskCommentItem
                                key={c.id}
                                comment={c}
                                level={0}
                                currentUserId={activeUserId}
                                onReply={handleReply}
                                refreshComments={fetchComments}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
