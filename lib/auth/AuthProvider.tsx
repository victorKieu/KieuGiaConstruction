"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import supabase from '@/lib/supabase/client';
import type { Session, User, SupabaseClient, AuthChangeEvent } from "@supabase/supabase-js";
import { Database } from "@/types/supabase";
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

        const handleAuthState = (currentSession: Session | null) => {
            if (mounted) {
                setSession(currentSession);
                setUser(currentSession?.user ?? null);
                // ✅ KHÔNG CẦN JS-COOKIE NỮA: @supabase/ssr tự động đồng bộ Cookie ngầm cho Middleware rồi!
                setIsLoading(false);
            }
        };

        const getSessionInitial = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            handleAuthState(session);
        };
        getSessionInitial();

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
        session, user, signOut, supabase, signIn, isLoading, error, checkPermission,
    };

    return (
        <AuthContext.Provider value={value}>
            {isLoading && <GlobalLoader text="Đang xác thực..." />}
            {!isLoading && children}
        </AuthContext.Provider>
    );
};