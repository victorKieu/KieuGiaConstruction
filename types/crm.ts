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