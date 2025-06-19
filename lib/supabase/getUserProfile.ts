import supabase from '@/lib/supabase/client';

export async function getUserProfile() {
    try {
        //const supabase = createSupabaseClient(); // Tạo client Supabase

        // Lấy thông tin người dùng hiện tại
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (userError) {
            console.error("Lỗi khi lấy thông tin user:", userError.message);
            return null;
        }

        if (!user) {
            console.log("Không có người dùng nào đăng nhập.");
            return null;
        }

        // Lấy thông tin nhân viên dựa trên user_id
        const { data: employees, error: employeeError } = await supabase
            .from("employees")
            .select("*")
            .eq("user_id", user.id)
            .limit(1); // Lấy tối đa 1 bản ghi

        if (employeeError) {
            console.error("Lỗi khi lấy thông tin nhân viên:", employeeError.message);
            return null;
        }

        if (employees.length === 0) {
            console.log("Không tìm thấy thông tin nhân viên cho user_id:", user.id);
            return null;
        }

        const employee = employees[0]; // Lấy bản ghi đầu tiên

        // Kiểm tra và xử lý trường hợp avatar_url không tồn tại
        if (!employee.avatar_url) {
            console.warn("Thông tin avatar_url không có, nhưng vẫn lấy được thông tin nhân viên:", employee);
            employee.avatar_url = "default_avatar_url.png"; // Gán giá trị mặc định nếu cần
        }

        console.log("Thông tin nhân viên lấy được:", employee);
        return employee; // Trả về thông tin nhân viên
    } catch (error: any) {
        console.error("Lỗi không xác định khi lấy thông tin người dùng:", error.message);
        return null;
    }
}