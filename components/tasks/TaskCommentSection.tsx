"use client";

import React, { useState, useEffect, useCallback, useTransition, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import supabase from "@/lib/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { MessageSquare, ThumbsUp, Reply } from "lucide-react";
import { useActionState } from 'react';
import { createComment, deleteComment, updateComment, toggleCommentLike, toggleTaskLike } from '@/lib/action/projectActions';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogCancel,
} from "@/components/ui/alert-dialog";

// --- Type Definitions ---
export interface CommentData {
    id: string;
    project_id: string;
    task_id?: string;
    content: string;
    created_at: string;
    updated_at?: string;
    parent_comment_id?: string;
    likes_count?: number;
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

interface CurrentUserProfile {
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

// --- Helper Functions ---
const formatRelativeTime = (isoString: string) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (seconds < 5) return 'vừa xong';
    const intervals: Record<string, number> = { năm: 31536000, tháng: 2592000, tuần: 604800, ngày: 86400, giờ: 3600, phút: 60 };
    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) return `${interval} ${unit} trước`;
    }
    return `${Math.floor(seconds)} giây trước`;
};

// --- Main Component ---
export default function TaskCommentSection({ taskId, projectId, members, currentUserId }: TaskCommentSectionProps) {
    const [comments, setComments] = useState<CommentData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [replyingTo, setReplyingTo] = useState<{ parentId: string; userName: string } | null>(null);
    const mainCommentFormRef = useRef<HTMLFormElement>(null);
    const [isCommentsOpen, setIsCommentsOpen] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);
    const [likedComments, setLikedComments] = useState<Set<string>>(new Set());
    const [taskLikeState, setTaskLikeState] = useState({ isLiked: false, count: 0 });
    const [isTaskLikePending, startTaskLikeTransition] = useTransition();
    const [totalCommentCount, setTotalCommentCount] = useState(0);
    const [currentUserProfile, setCurrentUserProfile] = useState<CurrentUserProfile | null>(null);
    const createCommentBound = createComment.bind(null, projectId, taskId);
    const [createState, createAction, isCreatePending] = useActionState(createCommentBound, initialState);
    const triggerRefresh = useCallback(() => setRefreshKey(prev => prev + 1), []);
 
    useEffect(() => {
        const fetchCurrentUserProfile = async () => {
            if (!currentUserId) return;
            const { data, error } = await supabase
                .from('user_profiles')
                .select('name, avatar_url')
                .eq('id', currentUserId)
                .single();

            if (data) {
                setCurrentUserProfile(data);
            } else {
                console.error("không thể lấy user profile:", error?.message);
                setCurrentUserProfile({ name: 'Bạn', avatar_url: undefined });
            }
        };
        fetchCurrentUserProfile();
    }, [currentUserId]);

    const fetchCommentsAndLikes = useCallback(async () => {
        setIsLoading(true);
        setFetchError(null);
        try {
            const { data: commentsData, error: commentsError, count } = await supabase
                .from('project_comments')
                .select(`id, project_id, content, created_at, updated_at, parent_comment_id, likes_count, created_by:user_profiles!created_by (id, name, avatar_url)`, { count: 'exact' })
                .eq('task_id', taskId)
                .order('created_at', { ascending: true });
            if (commentsError) throw commentsError;
            setTotalCommentCount(count || 0);

            const commentIds = commentsData.map(c => c.id);
            if (commentIds.length > 0) {
                const { data: commentLikesData } = await supabase.from('comment_likes').select('comment_id').eq('user_id', currentUserId).in('comment_id', commentIds);
                setLikedComments(new Set(commentLikesData?.map(l => l.comment_id) || []));
            }

            const { data: taskData, error: taskError } = await supabase.from('project_tasks').select('likes_count').eq('id', taskId).single();
            if (taskError) throw taskError;
            const { data: taskLikeData, error: taskLikeError } = await supabase.from('task_likes').select('task_id').eq('user_id', currentUserId).eq('task_id', taskId).maybeSingle();
            if (taskLikeError) throw taskLikeError;
            setTaskLikeState({ isLiked: !!taskLikeData, count: taskData.likes_count || 0 });

            const commentMap = new Map<string, CommentData>();
            const rootComments: CommentData[] = [];
            commentsData.forEach(comment => {
                commentMap.set(comment.id, { ...comment, replies: [] } as unknown as CommentData);
            });
            commentMap.forEach(commentNode => {
                if (commentNode.parent_comment_id && commentMap.has(commentNode.parent_comment_id)) {
                    commentMap.get(commentNode.parent_comment_id)!.replies!.push(commentNode);
                } else {
                    rootComments.push(commentNode as unknown as CommentData);
                }
            });
            setComments(rootComments);

        } catch (err: any) {
            setFetchError(err.message || "Could not fetch data.");
        } finally {
            setIsLoading(false);
        }
    }, [taskId, currentUserId]);

    useEffect(() => {
        fetchCommentsAndLikes();
    }, [fetchCommentsAndLikes, refreshKey]);

    useEffect(() => {
        if (createState.success) {
            setReplyingTo(null);
            if (replyingTo) {
                const form = document.getElementById(`comment-form-${replyingTo.parentId}`);
                (form as HTMLFormElement)?.reset();
            } else {
                mainCommentFormRef.current?.reset();
            }
            triggerRefresh();
        } else if (createState.error) {
            alert(`Error creating comment: ${createState.error}`);
        }
    }, [createState, triggerRefresh, replyingTo]);

    const handleReply = useCallback((parentId: string, userName: string) => {
        setReplyingTo(current => (current?.parentId === parentId ? null : { parentId, userName }));
    }, []);

    const handleTaskLike = () => {
        const newLikedState = !taskLikeState.isLiked;
        setTaskLikeState(prev => ({ ...prev, isLiked: newLikedState, count: newLikedState ? prev.count + 1 : prev.count - 1 }));
        startTaskLikeTransition(async () => {
            const result = await toggleTaskLike(taskId, newLikedState);
            if (!result.success) {
                setTaskLikeState(prev => ({ ...prev, isLiked: !newLikedState, count: !newLikedState ? prev.count + 1 : prev.count - 1 }));
                alert(result.error);
            } else {
                triggerRefresh();
            }
        });
    };

    const commentStatusText = isCommentsOpen ? 'Ẩn bình luận' : `Hiện ${totalCommentCount} bình luận`;

    const CommentItem = ({ comment, onActionSuccess }: { comment: CommentData; onActionSuccess: () => void }) => {
        const isOwner = currentUserId === comment.created_by.id;
        const [isEditing, setIsEditing] = useState(false);
        const [isDeleting, setIsDeleting] = useState(false);
        const [isUpdatePending, startUpdateTransition] = useTransition();
        const [isDeletePending, startDeleteTransition] = useTransition();
        const [isLikePending, startLikeTransition] = useTransition();
        const replyTextareaRef = useRef<HTMLTextAreaElement>(null);

        const [isLiked, setIsLiked] = useState(likedComments.has(comment.id));
        const [likeCount, setLikeCount] = useState(comment.likes_count || 0);

        useEffect(() => {
            if (replyingTo?.parentId === comment.id && replyTextareaRef.current) {
                const textarea = replyTextareaRef.current;
                textarea.focus();
                const endPos = textarea.value.length;
                textarea.setSelectionRange(endPos, endPos);
            }
        }, [replyingTo, comment.id]);

        const handleUpdateSubmit = (formData: FormData) => {
            startUpdateTransition(async () => {
                const result = await updateComment(initialState, formData);
                if (result.success) {
                    setIsEditing(false);
                    onActionSuccess();
                } else {
                    alert(`Lỗi khi cập nhật: ${result.error}`);
                }
            });
        };

        const handleDelete = () => {
            startDeleteTransition(async () => {
                const formData = new FormData();
                formData.append('comment_id', comment.id);
                formData.append('project_id', projectId);
                const result = await deleteComment(initialState, formData);
                if (result.success) {
                    setIsDeleting(false);
                    onActionSuccess();
                } else {
                    alert(`Lỗi khi xóa: ${result.error}`);
                }
            });
        };

        const handleLike = () => {
            const newLikedState = !isLiked;
            setIsLiked(newLikedState);
            setLikeCount(prev => newLikedState ? prev + 1 : prev - 1);
            startLikeTransition(async () => {
                const result = await toggleCommentLike(comment.id, newLikedState);
                if (!result.success) {
                    setIsLiked(!newLikedState);
                    setLikeCount(prev => !newLikedState ? prev + 1 : prev - 1);
                    console.error("Like failed:", result.error);
                    alert(`Lỗi khi thích bình luận: ${result.error}`);
                } else {
                    onActionSuccess();
                }
            });
        };

        const handleReplyKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.closest('form')?.requestSubmit();
            }
        };

        const renderContentWithTag = (content: string) => {
            const match = content.match(/^(@(?:[^\s]+\s?)+)\s/);
            if (match) {
                const name = match[1];
                const rest = content.substring(name.length);
                return <><strong className="text-blue-600 font-semibold">{name}</strong>{rest}</>
            }
            return content;
        };

        return (
            <div className="flex space-x-2 group">
                <Avatar className="h-8 w-8 flex-shrink-0"><AvatarImage src={comment.created_by.avatar_url} /><AvatarFallback className="text-xs">{comment.created_by.name?.[0]}</AvatarFallback></Avatar>
                <div className="flex-grow">
                    {!isEditing ? (
                        <>
                            <div className="bg-gray-100 rounded-xl px-3 py-2 relative group/comment">
                                <span className="font-semibold text-sm text-gray-900 hover:underline cursor-pointer">{comment.created_by.name}</span>
                                <p className="text-sm text-gray-800 whitespace-pre-line">{renderContentWithTag(comment.content)}</p>
                                {likeCount > 0 && (<div className="absolute -bottom-3 right-2 bg-white rounded-full p-0.5 shadow-md flex items-center text-xs"><div className="bg-blue-500 rounded-full p-0.5 mr-1"><ThumbsUp size={10} className="text-white" /></div><span className="pr-1">{likeCount}</span></div>)}
                            </div>
                            <div className="flex items-center space-x-3 text-xs text-gray-500 mt-1 pl-3">
                                <button onClick={handleLike} className={`font-semibold hover:underline ${isLiked ? 'text-blue-600' : ''}`} disabled={isLikePending}>Thích</button>
                                <button onClick={() => handleReply(comment.id, comment.created_by.name)} className="font-semibold hover:underline">Trả lời</button>
                                <span>{formatRelativeTime(comment.created_at)}</span>
                                {isOwner && (<><button onClick={() => setIsEditing(true)} className="font-semibold hover:underline">Sửa</button><button onClick={() => setIsDeleting(true)} className="font-semibold hover:underline text-red-500">Xóa</button></>)}
                            </div>
                        </>
                    ) : (<form action={handleUpdateSubmit} className="space-y-2">
                        <input type="hidden" name="comment_id" value={comment.id} /><input type="hidden" name="project_id" value={projectId} />
                        <Textarea name="content" defaultValue={comment.content} rows={2} required disabled={isUpdatePending} className="bg-gray-100 border-none rounded-xl" autoFocus />
                        <div className="flex items-center space-x-2 text-xs">
                            <Button type="submit" size="sm" disabled={isUpdatePending} className="h-6 px-2 text-xs rounded-full">{isUpdatePending ? "Đang lưu..." : "Lưu"}</Button>
                            <Button type="button" variant="ghost" size="sm" onClick={() => setIsEditing(false)} disabled={isUpdatePending} className="h-6 px-2 text-xs rounded-full">Hủy</Button>
                        </div>
                    </form>
                    )}
                    {comment.replies && comment.replies.length > 0 && (
                        <div className="space-y-3 mt-2 relative pl-6"><div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                            {comment.replies.map(reply => (<div key={reply.id} className="relative"><div className="absolute -left-2 top-4 h-0.5 w-2 bg-gray-200"></div><CommentItem comment={reply} onActionSuccess={onActionSuccess} /></div>))}
                        </div>
                    )}
                    {replyingTo?.parentId === comment.id && (
                        <div className="flex items-start space-x-2 mt-2">
                            <Avatar className="h-8 w-8"><AvatarImage src={currentUserProfile?.avatar_url} /><AvatarFallback>{currentUserProfile?.name?.[0]}</AvatarFallback></Avatar>
                            <form action={createAction} id={`comment-form-${comment.id}`} className="flex-grow">
                                <input type="hidden" name="parent_comment_id" value={comment.id} />
                                <Textarea name="content" ref={replyTextareaRef} defaultValue={`@${replyingTo.userName} `} className="w-full bg-gray-100 border-none rounded-xl text-sm p-2 h-10" required onKeyDown={handleReplyKeyDown} />
                                <div className="text-xs text-gray-500 mt-1">Nhấn <button type="button" onClick={() => setReplyingTo(null)} className="font-semibold hover:underline">Hủy</button> để đóng.</div>
                            </form>
                        </div>
                    )}
                </div>
                <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                    <AlertDialogContent>
                        <AlertDialogHeader><AlertDialogTitle>Xác nhận xóa</AlertDialogTitle><AlertDialogDescription>Hành động này không thể hoàn tác.</AlertDialogDescription></AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeletePending}>Hủy</AlertDialogCancel>
                            <Button onClick={handleDelete} variant="destructive" disabled={isDeletePending}>{isDeletePending ? "Đang xóa..." : "Xóa"}</Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    };

    return (
        <div className="space-y-4 pt-4 border-t">
            <div className="flex justify-between items-center">
                <button onClick={() => setIsCommentsOpen(prev => !prev)} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition-colors">
                    <h3 className="text-base font-semibold text-gray-800 flex items-center"><MessageSquare className="h-5 w-5 mr-2 text-gray-500" /> Tương tác & Bình luận</h3>
                    <span className="text-sm font-medium text-blue-600 ml-2">{`(${totalCommentCount})`}</span>
                </button>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleTaskLike} variant="outline" size="sm" disabled={isTaskLikePending} className={`${taskLikeState.isLiked ? 'text-blue-600 border-blue-600' : ''}`}>
                        <ThumbsUp className="h-4 w-4 mr-2" />
                        {taskLikeState.isLiked ? 'Đã thích' : 'Thích'}
                        {taskLikeState.count > 0 && <span className="ml-2">{taskLikeState.count}</span>}
                    </Button>
                </div>
            </div>

            {isCommentsOpen && (
                <>
                    <div className="flex items-start space-x-2">
                        <Avatar className="h-8 w-8"><AvatarImage src={currentUserProfile?.avatar_url} /><AvatarFallback>{currentUserProfile?.name?.[0]}</AvatarFallback></Avatar>
                        <form ref={mainCommentFormRef} action={createAction} id="comment-form-root" className="flex-grow">
                            <Textarea name="content" placeholder="Viết bình luận..." className="w-full bg-gray-100 border-none rounded-xl focus:ring-1 focus:ring-blue-500 text-sm p-2 min-h-[40px]" />
                            <div className="flex justify-end mt-2"><Button type="submit" size="sm" disabled={isCreatePending}>{isCreatePending ? 'Đang gửi...' : 'Gửi'}</Button></div>
                        </form>
                    </div>
                    <div className="space-y-3 pt-2">
                        {fetchError && <Alert variant="destructive"><AlertTitle>Lỗi</AlertTitle><AlertDescription>{fetchError}</AlertDescription></Alert>}
                        {isLoading && <div className="text-center py-4 text-gray-500">Đang tải...</div>}
                        {!isLoading && !fetchError && comments.length === 0 && <p className="text-sm text-center py-4 text-gray-400">Chưa có bình luận nào.</p>}
                        {!isLoading && !fetchError && comments.map(c => <CommentItem key={c.id} comment={c} onActionSuccess={triggerRefresh} />)}
                    </div>
                </>
            )}
        </div>
    );
}

