"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import supabase from '@/lib/supabase/client';
// ✅ 1. Thêm AuthChangeEvent vào import để sửa lỗi TS
import type { Session, User, SupabaseClient, AuthChangeEvent } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import Cookies from "js-cookie"; // ✅ 2. Import lại js-cookie (QUAN TRỌNG)
import GlobalLoader from '@/components/ui/GlobalLoader';

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

        // Hàm xử lý chung để cập nhật State và Cookie
        const handleAuthState = (currentSession: Session | null) => {
            if (mounted) {
                setSession(currentSession);
                setUser(currentSession?.user ?? null);

                // ✅ 3. LOGIC QUAN TRỌNG: Đồng bộ Cookie cho Middleware
                // Nếu thiếu đoạn này, Middleware sẽ không biết bạn đã đăng nhập -> Redirect loop
                if (currentSession?.access_token) {
                    Cookies.set("sb-access-token", currentSession.access_token, {
                        path: "/",
                        secure: process.env.NODE_ENV === "production",
                        sameSite: "lax",
                        expires: 7, // 7 ngày
                    });
                } else {
                    // Nếu logout hoặc hết hạn -> Xóa cookie
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

        // ✅ 4. Sửa lỗi TS: Khai báo kiểu cho _event và session
        const { data: listener } = supabase.auth.onAuthStateChange(
            (_event: AuthChangeEvent, session: Session | null) => {
                handleAuthState(session);
            }
        );

        return () => {
            mounted = false;
            listener?.subscription.unsubscribe();
        };
    }, []);

    const signOut = async () => {
        setIsLoading(true);
        setError(null);
        try {
            await supabase.auth.signOut();
            // onAuthStateChange sẽ tự chạy và xóa cookie
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
                console.error("Lỗi đăng nhập:", authError.message);
                setError(authError);
                throw new Error(authError.message || "Đăng nhập thất bại.");
            }
            // onAuthStateChange sẽ tự chạy và set cookie
        } catch (e: any) {
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
                .select(`permissions ( code )`)
                .eq("user_id", user.id);

            if (error || !data) return false;

            // ✅ 5. Sửa lỗi TS: Dùng item: any hoặc định nghĩa interface nếu cần
            return data.some((item: any) => {
                if (Array.isArray(item.permissions)) {
                    return item.permissions.some((p: any) => p.code === permissionToCheck);
                }
                return item.permissions?.code === permissionToCheck;
            });

        } catch (error) {
            console.error("Lỗi checkPermission:", error);
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
            {/* ✅ 6. Hiển thị Loader khi đang tải, tránh màn hình trắng */}
            {isLoading && <GlobalLoader text="Đang xác thực..." />}

            {/* Chỉ hiển thị nội dung khi đã load xong (hoặc vẫn hiển thị bên dưới loader) */}
            {!isLoading && children}
        </AuthContext.Provider>
    );
};