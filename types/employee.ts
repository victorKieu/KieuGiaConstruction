export interface DictionaryOption {
    id: string;
    code: string;
    name: string;
    color?: string; // Dùng để tô màu badge trạng thái
}

// Kiểu dữ liệu hiển thị trên Danh sách & Chi tiết
export interface EmployeeData {
    id: string;
    code: string;
    name: string;
    email: string | null;
    phone: string | null;
    avatar_url: string | null;

    // Thông tin cá nhân
    identity_card: string | null;
    birth_date?: string | null;
    place_of_birth: string | null;
    address: string | null;
    current_address: string | null;

    // Các trường quan hệ (Relation) - Có thể null nếu chưa chọn
    gender: DictionaryOption | null;
    position: DictionaryOption | null;
    department: DictionaryOption | null;
    status: DictionaryOption | null;
    contract_type: DictionaryOption | null;
    marital_status: DictionaryOption | null;

    // Tài chính
    bank_name: string | null;
    bank_account: string | null;
    basic_salary: number;

    // Hệ thống
    auth_id: string | null; // Quan trọng: Check xem đã có tài khoản chưa
    created_at: string;
    hire_date: string;
}

// Kiểu dữ liệu dùng cho Form (Gửi lên Server)
export interface EmployeeFormData {
    code: string;
    name: string;
    email: string; // Email liên hệ
    phone: string;
    identity_card: string;
    address: string;
    birth_date?: string;
    avatar_url?: string | null;

    // Dropdown chỉ gửi ID
    gender_id?: string;
    position_id?: string;
    department_id?: string;
    status_id?: string;
    contract_type_id?: string;
    marital_status_id?: string;

    basic_salary: number;
    hire_date: string;
}