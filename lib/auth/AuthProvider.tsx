"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import supabase from '@/lib/supabase/client';
import type { Session, User, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
import Cookies from "js-cookie";

interface AuthContextProps {
    session: Session | null;
    user: User | null;
    signOut: () => Promise<void>;
    supabase: SupabaseClient<Database>;
    signIn: (email: string, password: string) => Promise<any>;
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

    // ❌ KHÔNG tạo supabase client ở đây nữa
    // const supabase = createSupabaseClient(); // XÓA DÒNG NÀY!

    useEffect(() => {
        let mounted = true;
        //const supabase = createSupabaseClient(); // Tạo client Supabase
        // Lấy session ban đầu
        const getSession = async () => {

            const { data: { session } } = await supabase.auth.getSession();
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                // Lưu access_token vào cookie cho SSR/RLS
                if (session?.access_token) {
                    Cookies.set("sb-access-token", session.access_token, {
                        path: "/",
                        secure: true,
                        sameSite: "lax",
                        expires: 7,
                    });
                }
            }
        };
        getSession();

        // Lắng nghe sự kiện auth thay đổi
        const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
            if (mounted) {
                setSession(session);
                setUser(session?.user ?? null);
                if (session?.access_token) {
                    Cookies.set("sb-access-token", session.access_token, {
                        path: "/",
                        secure: true,
                        sameSite: "lax",
                        expires: 7,
                    });
                } else {
                    Cookies.remove("sb-access-token");
                }
            }
        });

        return () => {
            mounted = false;
            listener?.subscription.unsubscribe();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Chỉ chạy 1 lần, supabase không đổi

    const signOut = async () => {
        setIsLoading(true);
        setError(null);
        try {
            //const supabase = createSupabaseClient(); // Tạo client Supabase
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            Cookies.remove("sb-access-token");
        } catch (e) {
            setError(e);
        } finally {
            setIsLoading(false);
        }
    };

    const signIn = async (email: string, password: string) => {
        setIsLoading(true);
        setError(null);
        try {
            //const supabase = createSupabaseClient(); // Tạo client Supabase
            const { data, error: authError } = await supabase.auth.signInWithPassword({ email, password });
            if (authError) {
                setError(authError);
                return null;
            }
            if (data.session?.access_token) {
                Cookies.set("sb-access-token", data.session.access_token, {
                    path: "/",
                    secure: true,
                    sameSite: "lax",
                    expires: 7,
                });
            }
            return data;
        } catch (e) {
            setError(e);
            return null;
        } finally {
            setIsLoading(false);
        }
    };

    const checkPermission = async (permissionToCheck: string) => {
        if (!user) return false;
        try {
            //const supabase = createSupabaseClient(); // Tạo client Supabase
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