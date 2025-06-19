import React, { createContext, useContext, useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js"; // Sử dụng createClient từ supabase-js
import { Database } from "@/types/supabase"; // Nếu có types

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!); // Tạo client Supabase

interface EmployeeInfo {
    name: string;
    avatar_url: string;
    email: string;
}

const UserContext = createContext<{
    user: EmployeeInfo | null;
    refreshUser: () => Promise<void>;
}>({ user: null, refreshUser: async () => { } });

export const UserProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<EmployeeInfo | null>(null);

    const fetchUserInfo = async () => {
        const { data: { user: supabaseUser }, error: userError } = await supabase.auth.getUser();
        if (userError || !supabaseUser) {
            console.error("Lỗi khi lấy thông tin người dùng:", userError?.message);
            return setUser(null);
        }

        const { data: usersData, error: usersError } = await supabase
            .from("users")
            .select("employee_id")
            .eq("email", supabaseUser.email)
            .single();

        if (usersError || !usersData || !usersData.employee_id) {
            console.error("Lỗi khi lấy thông tin người dùng từ bảng users:", usersError?.message);
            return setUser(null);
        }

        const { data: employee, error: employeeError } = await supabase
            .from("employees")
            .select("name, avatar_url")
            .eq("id", usersData.employee_id)
            .single();

        if (employeeError || !employee) {
            console.error("Lỗi khi lấy thông tin nhân viên:", employeeError?.message);
            return setUser(null);
        }

        const info: EmployeeInfo = {
            name: employee.name,
            avatar_url: employee.avatar_url,
            email: supabaseUser.email ?? "",
        };
        setUser(info);
    };

    useEffect(() => {
        fetchUserInfo();
    }, []);

    return (
        <UserContext.Provider value={{ user, refreshUser: fetchUserInfo }}>
            {children}
        </UserContext.Provider>
    );
};

export const useUser = () => useContext(UserContext);