export interface Customer {
    id: string; // UUID từ auth.users
    email: string;
    name: string;
    code: string | null;
    phone: string | null;
    address: string | null;
    status: string | null;
    tag_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface Activity {
    id: string;
    activity_type: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    status: string;
    created_at: string;
    customers: {
        id: string;
        name: string;
    } | null; // Supabase return object or array depending on query, assuming single relation here
}