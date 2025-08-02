// lib/auth/auth-context.tsx
"use client"; // Đảm bảo rằng đây là client component

import React, { createContext, useContext, useState, useEffect } from "react";
import supabase from '@/lib/supabase/client'; // Đảm bảo đường dẫn này đúng
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase"; // Đảm bảo đường dẫn này đúng
import Cookies from "js-cookie";

interface AuthContextProps {
    session: Session | null;
    user: User | null;
    signOut: () => Promise<void>;
    supabase: SupabaseClient<Database>;
    signIn: (email: string, password: string) => Promise<void>; // Đã đổi kiểu trả về thành Promise<void>
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
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        let mounted = true;

        const getSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.access_token) {
                    Cookies.set("sb-oshquiqzokyyawgoemql-auth-token", session.access_token, {
                        path: "/",
                        secure: true,
                        sameSite: "lax",
                        expires: 7,
                    });
                }
            }
        };
        getSession();

        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.access_token) {
                    Cookies.set("sb-oshquiqzokyyawgoemql-auth-token", session.access_token, {
                        path: "/",
                        secure: true,
                        sameSite: "lax",
                        expires: 7,
                    });
                } else {
                    Cookies.remove("sb-oshquiqzokyyawgoemql-auth-token");
                }
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
            setSession(null);
            setUser(null);
            Cookies.remove("sb-oshquiqzokyyawgoemql-auth-token");
        } catch (e) {
            setError(e);
            throw e; // Ném lỗi để bên ngoài có thể bắt
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = async (email: string, password: string): Promise<void> => { // Đã thay đổi kiểu trả về thành Promise<void>
        setIsLoading(true);
        setError(null); // Reset lỗi trước khi thử đăng nhập
        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });

            if (authError) {
                // RẤT QUAN TRỌNG: Ném lỗi để `LoginForm` có thể bắt và hiển thị
                console.error("Lỗi đăng nhập từ Supabase Auth:", authError.message);
                setError(authError); // Set lỗi vào state của context
                throw new Error(authError.message || "Đăng nhập thất bại."); // Ném lỗi cụ thể
            }

            // Nếu không có lỗi, session và user sẽ được cập nhật bởi onAuthStateChange listener
            // và cookies sẽ được set.
            if (data.session?.access_token) {
                Cookies.set("sb-oshquiqzokyyawgoemql-auth-token", data.session.access_token, {
                    path: "/",
                    secure: true,
                    sameSite: "lax",
                    expires: 7,
                });
            }

            console.log("Đăng nhập thành công trong AuthProvider. Session data:", data); // Debugging
            // Không cần return gì ở đây vì kiểu trả về là Promise<void>
        } catch (e: any) { // Bắt các lỗi không phải từ Supabase Auth (ví dụ: lỗi mạng)
            console.error("Lỗi không mong muốn trong signIn (AuthContext):", e.message);
            setError(e);
            throw new Error(e.message || "Đã xảy ra lỗi không mong muốn.");
        } finally {
            setIsLoading(false);
        }
    };

    const checkPermission = async (permissionToCheck: string): Promise<boolean> => {
        if (!user) return false;
        try {
            const { data: permissions, error } = await supabase
                .from("user_permissions")
                .select("permission_id")
                .eq("user_id", user.id);
            if (error) {
                console.error("Lỗi khi lấy quyền của người dùng:", error);
                return false;
            }
            if (!permissions) return false;
            const permissionIds = permissions.map((p) => p.permission_id);
            if (permissionIds.length === 0) return false;
            const { data: perms } = await supabase
                .from("permissions")
                .select("code")
                .in("id", permissionIds);
            return perms?.some((p) => p.code === permissionToCheck) || false;
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
            {children}
        </AuthContext.Provider>
    );
};