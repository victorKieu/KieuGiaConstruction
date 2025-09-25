export interface ProjectData {
    id: string;
    name: string;
    code: string;
    budget: number;
    start_date: string;
    end_date: string;
    status: string;
    progress_percent: number;
    address?: string;
    description?: string;
    project_type?: string;
    construction_type?: string;
    manager?: {
        name: string;
    };
    customers?: {
        name: string;
    };
}

export interface MilestoneData {
    id: string;
    name: string;
    due_date: string;
    status: string;
}

export interface MemberData {
    id: string;
    role: string;
    joined_at: string;
    employee: {
        name: string;
        email: string;
        position: string;
        avatar_url?: string;
    };
}

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

export interface FinanceData {
    budget: number;
    spent: number;
    remaining: number;
    allocation: {
        materials: number;
        labor: number;
        equipment: number;
        others: number;
    };
}
export interface TaskData {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    status: "todo" | "in_progress" | "done";
    assigned_to?: {
        id: string;
        name: string;
        avatar_url?: string;
    };
    due_date?: string;
    created_at: string;
}
export interface CommentData {
    id: string;
    project_id: string;
    task_id?: string;
    content: string;
    created_at: string;
    created_by: {
        id: string;
        name: string;
        avatar_url?: string;
    };
}

export interface TaskData {
    id: string;
    project_id: string;
    name: string;
    description?: string;
    status: "todo" | "in_progress" | "done";
    assigned_to?: {
        id: string;
        name: string;
        avatar_url?: string;
    };
    due_date?: string;
    created_at: string;
}

export interface CommentData {
    id: string;
    project_id: string;
    task_id?: string;
    content: string;
    created_at: string;
    created_by: {
        id: string;
        name: string;
        avatar_url?: string;
    };
}