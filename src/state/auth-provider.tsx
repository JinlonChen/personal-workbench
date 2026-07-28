"use client";

import type { Session } from "@supabase/supabase-js";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";

import { getSupabaseClient, isSupabaseConfigured } from "@/data/supabase-client";

export type AuthStatus = "loading" | "signed_out" | "signed_in";

interface AuthContextValue {
  configured: boolean;
  status: AuthStatus;
  session: Session | null;
  error: string | null;
  signInWithEmail: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = isSupabaseConfigured();
  const [status, setStatus] = useState<AuthStatus>(configured ? "loading" : "signed_out");
  const [session, setSession] = useState<Session | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) return;
    const client = getSupabaseClient();
    let mounted = true;

    client.auth.getSession().then(({ data, error: sessionError }) => {
      if (!mounted) return;
      if (sessionError) {
        setError(`账号状态读取失败：${sessionError.message}`);
        setStatus("signed_out");
        return;
      }
      setSession(data.session);
      setStatus(data.session ? "signed_in" : "signed_out");
    });

    const { data } = client.auth.onAuthStateChange((_event, nextSession) => {
      if (!mounted) return;
      setSession(nextSession);
      setStatus(nextSession ? "signed_in" : "signed_out");
      setError(null);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, [configured]);

  const value = useMemo<AuthContextValue>(() => ({
    configured,
    status,
    session,
    error,
    async signInWithEmail(email: string) {
      if (!configured) return;
      setError(null);
      const normalizedEmail = email.trim();
      if (!normalizedEmail) throw new Error("请输入邮箱地址。");
      const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}${window.location.pathname}`;
      const { error: signInError } = await getSupabaseClient().auth.signInWithOtp({
        email: normalizedEmail,
        options: { emailRedirectTo: redirectTo },
      });
      if (signInError) {
        const message = `登录邮件发送失败：${signInError.message}`;
        setError(message);
        throw new Error(message);
      }
    },
    async signOut() {
      if (!configured) return;
      const { error: signOutError } = await getSupabaseClient().auth.signOut();
      if (signOutError) {
        const message = `退出登录失败：${signOutError.message}`;
        setError(message);
        throw new Error(message);
      }
    },
  }), [configured, error, session, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth 必须在 AuthProvider 内使用");
  return context;
}
