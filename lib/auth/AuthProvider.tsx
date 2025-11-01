// --- START OF FILE auth-context.tsx (sửa đổi tiếp) ---

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import supabase from '@/lib/supabase/client';
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";

interface AuthContextProps {
    session: Session | null;
    user: User | null;
    signOut: () => Promise<void>;
    supabase: SupabaseClient<Database>;
    signIn: (email: string, password: string) => Promise<void>;
    isLoading: boolean;
    error: any;
    checkPermission: (permission: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextProps | undefined>(undefined);

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
    return ctx;
}

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const [session, setSession] = useState<Session | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        let mounted = true;

        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                setIsLoading(false);
            }
        };
        getSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                // Supabase SDK tự động quản lý cookie cho session này.
                // Nếu bạn muốn lưu 'sb-access-token' riêng cho server-side reads,
                // bạn cần thêm logic tại đây để ghi cookie bằng `js-cookie` nếu cần.
                // Tuy nhiên, việc này KHÔNG được khuyến khích vì có thể gây không nhất quán.
                // Tốt nhất là sử dụng `createServerClient` trên server để tự động đọc cookie Supabase.
            }
        });

        return () => {
            mounted = false;
            listener?.subscription.unsubscribe();
        };
    }, [supabase]);

    const signOut = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await supabase.auth.signOut();
            // onAuthStateChange sẽ tự cập nhật state.
        } catch (e) {
            setError(e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = async (email: string, password: string): Promise<void> => {
        setIsLoading(true);
        setError(null);
        try {
            const { error: authError } = await supabase.auth.signInWithPassword({ email, password });

            if (authError) {
                console.error("Lỗi đăng nhập từ Supabase Auth:", authError.message);
                setError(authError);
                throw new Error(authError.message || "Đăng nhập thất bại.");
            }
            // onAuthStateChange sẽ tự cập nhật state.
        } catch (e: any) {
            console.error("Lỗi không mong muốn trong signIn (AuthContext):", e.message);
            setError(e);
            throw e;
        } finally {
            setIsLoading(false);
        }
    };

    const checkPermission = async (permissionToCheck: string): Promise<boolean> => {
        if (!user) return false;
        try {
            const { data, error } = await supabase
                .from("user_permissions")
                .select(`
                    permissions ( code )
                `)
                .eq("user_id", user.id);

            if (error) {
                console.error("Lỗi khi lấy quyền (đã tối ưu):", error);
                return false;
            }

            if (!data) return false;

            return data.some((item) =>
                item.permissions.some(p => p.code === permissionToCheck)
            );

        } catch (error) {
            console.error("Lỗi không xác định khi kiểm tra quyền:", error);
            return false;
        }
    };

    const value: AuthContextProps = {
        session,
        user,
        signOut,
        supabase,
        signIn,
        isLoading,
        error,
        checkPermission,
    };

    return (
        <AuthContext.Provider value={value}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};