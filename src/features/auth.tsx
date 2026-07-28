"use client";

import { Mail, Sparkles } from "lucide-react";
import { type FormEvent, type ReactNode, useState } from "react";

import { useAuth } from "@/state/auth-provider";
import { isLocalModeRequested } from "@/data/local-mode";

export function AuthGate({ children }: { children: ReactNode }) {
  const { configured, status } = useAuth();
  const localMode = typeof window !== "undefined" && isLocalModeRequested(window.location.search);
  if (localMode) return <>{children}</>;
  if (!configured) return <>{children}</>;
  if (status === "loading") return <AuthLoading />;
  if (status === "signed_out") return <SignInView />;
  return <>{children}</>;
}

export function AuthLoading() {
  return (
    <main className="loading-screen" aria-label="正在检查登录状态">
      <span className="spinner" aria-hidden="true" />
      <p>正在检查账号状态…</p>
    </main>
  );
}

export function SignInView() {
  const { error, signInWithEmail } = useAuth();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await signInWithEmail(email);
      setSent(true);
    } catch {
      // The provider exposes the actionable error below the form.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="sign-in-title">
        <div className="auth-brand"><span className="brand-mark"><Sparkles size={18} /></span><div><strong>一页</strong><span>个人工作台</span></div></div>
        <div className="auth-copy">
          <span className="eyebrow">跨设备同步</span>
          <h1 id="sign-in-title">登录你的工作台</h1>
          <p>{sent ? "登录链接已发送，请打开邮箱中的链接完成登录。" : "使用邮箱接收一次性登录链接，不需要记密码。"}</p>
        </div>
        {sent ? (
          <button className="button secondary auth-submit" type="button" onClick={() => setSent(false)}>换一个邮箱</button>
        ) : (
          <form className="auth-form" onSubmit={submit}>
            <label className="field"><span>邮箱地址</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required /></label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button primary auth-submit" type="submit" disabled={submitting}><Mail size={16} />{submitting ? "发送中…" : "发送登录链接"}</button>
          </form>
        )}
        <p className="auth-footnote">你的数据属于你的账号，并受到 Supabase 行级权限保护。</p>
      </section>
    </main>
  );
}
