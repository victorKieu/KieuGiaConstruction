import { useEffect, useState } from "react";
import { createClient } from "@supabase/supabase-js"; // Sử dụng createClient từ supabase-js
import { useAuth } from "./auth-context";

export function useCurrentEmployee() {
    const { user } = useAuth();
    const [employee, setEmployee] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null); // Thêm state để lưu lỗi

    useEffect(() => {
        const fetchEmployee = async () => {
            if (!user?.id) {
                setEmployee(null);
                return;
            }

            setLoading(true);
            const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); // Tạo client Supabase

            const { data, error: fetchError } = await supabase
                .from("employees")
                .select("*")
                .eq("id", user.id)
                .single();

            if (fetchError) {
                console.error("Lỗi khi lấy thông tin nhân viên:", fetchError.message);
                setError(fetchError.message); // Lưu lỗi vào state
                setEmployee(null);
            } else {
                setEmployee(data);
            }

            setLoading(false);
        };

        fetchEmployee();
    }, [user?.id]);

    return { employee, loading, error }; // Trả về error
}