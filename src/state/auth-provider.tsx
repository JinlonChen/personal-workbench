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
  sendEmailCode: (email: string) => Promise<void>;
  verifyEmailCode: (email: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function readableAuthError(error: { message?: string }, fallback: string) {
  const message = error.message?.trim();
  return !message || message === "{}" ? fallback : message;
}

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
    async sendEmailCode(email: string) {
      if (!configured) return;
      setError(null);
      const normalizedEmail = email.trim();
      if (!normalizedEmail) throw new Error("请输入邮箱地址。");
      const { error: signInError } = await getSupabaseClient().auth.signInWithOtp({
        email: normalizedEmail,
      });
      if (signInError) {
        const message = `验证码发送失败：${readableAuthError(signInError, "邮件服务暂时不可用，请稍后重试。")}`;
        setError(message);
        throw new Error(message);
      }
    },
    async verifyEmailCode(email: string, code: string) {
      if (!configured) return;
      setError(null);
      const normalizedEmail = email.trim();
      const normalizedCode = code.trim();
      if (!normalizedEmail) throw new Error("请输入邮箱地址。");
      if (!normalizedCode) throw new Error("请输入邮箱验证码。");
      const { error: verifyError } = await getSupabaseClient().auth.verifyOtp({
        email: normalizedEmail,
        token: normalizedCode,
        type: "email",
      });
      if (verifyError) {
        const message = `验证码验证失败：${readableAuthError(verifyError, "验证服务暂时不可用，请稍后重试。")}`;
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
