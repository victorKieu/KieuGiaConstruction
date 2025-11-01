// --- START OF FILE auth-context.tsx (PHIÊN BẢN CẦN THAY ĐỔI) ---

"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import supabase from '@/lib/supabase/client';
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import Cookies from "js-cookie"; // <-- Thêm lại js-cookie

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

        const handleAuthState = (currentSession: Session | null) => {
            if (mounted) {
                setSession(currentSession);
                setUser(currentSession?.user ?? null);
                // Ghi access_token vào cookie cho Server Components/Actions/Middleware đọc
                if (currentSession?.access_token) {
                    Cookies.set("sb-access-token", currentSession.access_token, {
                        path: "/",
                        secure: process.env.NODE_ENV === "production", // Chỉ secure trong production
                        sameSite: "lax",
                        expires: 7, // Hoặc thời gian hết hạn của session Supabase
                    });
                } else {
                    Cookies.remove("sb-access-token");
                }
                setIsLoading(false);
            }
        };

        const getSessionInitial = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            handleAuthState(session);
        };
        getSessionInitial();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            handleAuthState(session);
        });

        return () => {
            mounted = false;
            listener?.subscription.unsubscribe();
        };
        // Dependency supabase là cần thiết nếu supabase client có thể thay đổi, nhưng thường là không.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Chỉ chạy 1 lần khi component mount

    const signOut = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await supabase.auth.signOut();
            // handleAuthState sẽ tự cập nhật và xóa cookie
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
            // handleAuthState sẽ tự cập nhật và ghi cookie
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