export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
    public: {
        Tables: {
            projects: {
                Row: {
                    id: string;
                    name: string;
                    code: string;
                    description: string | null;
                    location: string | null;
                    status: string | null;
                    project_type: string | null;
                    construction_type: string | null;
                    complexity: string | null;
                    priority: string | null;
                    risk_level: string | null;
                    project_manager: string | null;
                    customer_id: string | null;
                    progress: number | null;
                    budget: number | null;
                    start_date: string | null;
                    end_date: string | null;
                    created_at: string;
                    updated_at: string | null;
                    created_by: string;
                };
                Insert: {
                    id?: string;
                    name: string;
                    code: string;
                    description?: string | null;
                    location?: string | null;
                    status?: string | null;
                    project_type?: string | null;
                    construction_type?: string | null;
                    complexity?: string | null;
                    priority?: string | null;
                    risk_level?: string | null;
                    project_manager?: string | null;
                    customer_id?: string | null;
                    progress?: number | null;
                    budget?: number | null;
                    start_date?: string | null;
                    end_date?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    name?: string;
                    code?: string;
                    description?: string | null;
                    location?: string | null;
                    status?: string | null;
                    project_type?: string | null;
                    construction_type?: string | null;
                    complexity?: string | null;
                    priority?: string | null;
                    risk_level?: string | null;
                    project_manager?: string | null;
                    customer_id?: string | null;
                    progress?: number | null;
                    budget?: number | null;
                    start_date?: string | null;
                    end_date?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
            };
            user_permissions: {
                Row: {
                    id: string;
                    user_id: string; // uuid
                    permission_id: string; // uuid
                    granted_by: string | null;
                    granted_at: string | null;
                    created_at: string | null;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    user_id: string;
                    permission_id: string;
                    granted_by?: string | null;
                    granted_at?: string | null;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    user_id?: string;
                    permission_id?: string;
                    granted_by?: string | null;
                    granted_at?: string | null;
                    created_at?: string | null;
                    updated_at?: string | null;
                };
            };
            employees: {
                Row: {
                    id: string;
                    code: string;
                    name: string;
                    position: string | null;
                    department: string | null;
                    phone: string | null;
                    email: string | null;
                    address: string | null;
                    gender: string | null;
                    birth_date: string | null;
                    hire_date: string | null;
                    id_number: string | null;
                    tax_code: string | null;
                    bank_account: string | null;
                    bank_name: string | null;
                    emergency_contact: string | null;
                    emergency_phone: string | null;
                    status: string | null;
                    notes: string | null;
                    avatar_url: string | null;
                    created_at: string;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    code: string;
                    name: string;
                    position?: string | null;
                    department?: string | null;
                    phone?: string | null;
                    email?: string | null;
                    address?: string | null;
                    gender?: string | null;
                    birth_date?: string | null;
                    hire_date?: string | null;
                    id_number?: string | null;
                    tax_code?: string | null;
                    bank_account?: string | null;
                    bank_name?: string | null;
                    emergency_contact?: string | null;
                    emergency_phone?: string | null;
                    status?: string | null;
                    notes?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    code?: string;
                    name?: string;
                    position?: string | null;
                    department?: string | null;
                    phone?: string | null;
                    email?: string | null;
                    address?: string | null;
                    gender?: string | null;
                    birth_date?: string | null;
                    hire_date?: string | null;
                    id_number?: string | null;
                    tax_code?: string | null;
                    bank_account?: string | null;
                    bank_name?: string | null;
                    emergency_contact?: string | null;
                    emergency_phone?: string | null;
                    status?: string | null;
                    notes?: string | null;
                    avatar_url?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
            };
            customers: {
                Row: {
                    id: string;
                    code: string;
                    name: string;
                    type: string | null;
                    contact_person: string | null;
                    position: string | null;
                    phone: string | null;
                    email: string | null;
                    address: string | null;
                    tax_code: string | null;
                    status: string | null;
                    notes: string | null;
                    birthday: string | null;
                    sales_channel: string | null;
                    geocode: string | null;
                    created_at: string;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    code: string;
                    name: string;
                    type?: string | null;
                    contact_person?: string | null;
                    position?: string | null;
                    phone?: string | null;
                    email?: string | null;
                    address?: string | null;
                    tax_code?: string | null;
                    status?: string | null;
                    notes?: string | null;
                    birthday?: string | null;
                    sales_channel?: string | null;
                    geocode?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    code?: string;
                    name?: string;
                    type?: string | null;
                    contact_person?: string | null;
                    position?: string | null;
                    phone?: string | null;
                    email?: string | null;
                    address?: string | null;
                    tax_code?: string | null;
                    status?: string | null;
                    notes?: string | null;
                    birthday?: string | null;
                    sales_channel?: string | null;
                    geocode?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
            };
            users: {
                Row: {
                    id: string;
                    name: string | null;
                    email: string;
                    password: string | null;
                    role: string | null;
                    status: string | null;
                    employee_id: string | null;
                    last_login: string | null;
                    created_at: string;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    name?: string | null;
                    email: string;
                    password?: string | null;
                    role?: string | null;
                    status?: string | null;
                    employee_id?: string | null;
                    last_login?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    name?: string | null;
                    email?: string;
                    password?: string | null;
                    role?: string | null;
                    status?: string | null;
                    employee_id?: string | null;
                    last_login?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
            };
            permissions: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    code: string;
                    module: string;
                    created_at: string;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    code: string;
                    module: string;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    code?: string;
                    module?: string;
                    created_at?: string;
                    updated_at?: string | null;
                };
            };
            roles: {
                Row: {
                    id: string;
                    name: string;
                    description: string | null;
                    created_at: string;
                    updated_at: string | null;
                };
                Insert: {
                    id?: string;
                    name: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
                Update: {
                    id?: string;
                    name?: string;
                    description?: string | null;
                    created_at?: string;
                    updated_at?: string | null;
                };
            };
        };
    };
}