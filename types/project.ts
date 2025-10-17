// types/project.ts
import { Database } from '@/types/supabase';

export type TaskStatus = "pending" | "in_progress" | "completed" | "cancelled" | "on_hold" | "done" | "todo";
export type PriorityLevel = "low" | "medium" | "high" | "critical";
export type project = Database['public']['Tables']['projects']['Row'];

export interface ProjectData {
    id: string;
    name: string; // Đổi từ project_name
    code: string;
    description: string | null;
    address: string | null;
    location: string | null;
    status: string;
    project_type: string;
    construction_type: string;
    risk_level: string | null;
    project_manager: string | null;
    customer_id: string | null;
    progress: number | null;
    budget: number;
    actual_cost: number;
    start_date: string;
    end_date: string;
    created_at: string;
    updated_at: string;
    customers: { name: string } | null;
    manager?: { name: string } | null;
    created_by: string;
    created?: { name: string } | null;
    progress_percent: number;
    member_count: number;
    document_count: number;
}

export interface ProjectMember { 
    id: string;
    project_id: string;
    user_id: string;
    role: string;
    joined_at: string;
    employee: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        position: string;
        avatar_url?: string;
    };
}   

export interface MilestoneData {
    id: string;
    // name: string;
    milestone: string;
    description: string;
    planned_start_date: string;
    planned_end_date: string;
    actual_start_date: string;
    actual_end_date: string;
    status: string; // Tạm giữ string
    created_at: string;
    updated_at: string;
    completion_percentage: number;
    project_id?: string;
}

// --- MEMBER DATA ---
export interface MemberData {
    project_id: string;
    role: string;
    joined_at: string;
    employee: {
        id: string;
        name: string;
        email: string;
        phone?: string;
        position: string;
        avatar_url?: string;
    };
}

// --- DOCUMENT DATA ---
export interface DocumentData {
    id: string;
    name: string;
    type: string;
    url: string;
    uploaded_at: string;
    uploaded_by: {
        name: string;
    };
}

// --- FINANCE DATA ---
export interface FinanceData {
    id: string;
    budget: number;
    spent: number;
    remaining: number;
    allocation: string;
    updated_at: string;
}

// --- TASK DATA ---
export interface TaskData {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    status: TaskStatus; // Dùng TaskStatus type đã định nghĩa
    priority?: PriorityLevel; // Dùng PriorityLevel type đã định nghĩa
    progress?: number;
    start_date?: string;
    completed_at?: string;
    assigned_to?: {
        id: string;
        name: string;
        avatar_url?: string;
    };
    due_date?: string;
    created_at: string;
    updated_at: string;
}

// --- COMMENT DATA ---
export interface CommentData {
    id: string;
    project_id: string;
    task_id?: string;
    content: string;
    created_at: string;
    update_at: string;
    parent_comment_id?: string; // <-- ID của bình luận cha
    created_by: {
        id: string;
        name: string;
        avatar_url?: string;
    };
    replies?: CommentData[]; // <-- Mảng các bình luận trả lời (cho Tree View)
}

// --- TASK FEED ITEM (Dành cho Activity Log) ---
export interface TaskFeedItem {
    id: string;
    type: 'task_status_change' | 'comment' | 'milestone_update';
    timestamp: string;
    user_name: string;
    details: string;
}
