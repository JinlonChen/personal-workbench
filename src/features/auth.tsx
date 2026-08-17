"use client";

import { KeyRound, Mail } from "lucide-react";
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
  const { error, sendEmailCode, verifyEmailCode } = useAuth();
  const [email, setEmail] = useState("");
  const [sentEmail, setSentEmail] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function sendCode(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await sendEmailCode(email);
      setSentEmail(email.trim());
    } catch {
      // The provider exposes the actionable error below the form.
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyCode(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await verifyEmailCode(sentEmail, code);
    } catch {
      // The provider exposes the actionable error below the form.
    } finally {
      setSubmitting(false);
    }
  }

  function changeEmail() {
    setSentEmail("");
    setCode("");
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel" aria-labelledby="sign-in-title">
        <div className="auth-brand"><span className="brand-mark" role="img" aria-label="龍字标识">龍</span><div><strong>龍序</strong><span>日日自新，事事有序</span></div></div>
        <div className="auth-copy">
          <span className="eyebrow">跨设备同步</span>
          <h1 id="sign-in-title">登录你的工作台</h1>
          <p>{sentEmail ? <>验证码已发送至 <strong>{sentEmail}</strong>，请在下方输入。</> : "使用邮箱接收一次性验证码，不需要记密码。"}</p>
        </div>
        {sentEmail ? (
          <form className="auth-form" onSubmit={verifyCode}>
            <label className="field"><span>邮箱验证码</span><input type="text" value={code} onChange={(event) => setCode(event.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]*" placeholder="输入邮件中的验证码" required /></label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button primary auth-submit" type="submit" disabled={submitting}><KeyRound size={16} />{submitting ? "验证中…" : "验证并登录"}</button>
            <button className="button secondary auth-submit" type="button" onClick={changeEmail} disabled={submitting}>更换邮箱</button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={sendCode}>
            <label className="field"><span>邮箱地址</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="name@example.com" autoComplete="email" required /></label>
            {error ? <p className="form-error" role="alert">{error}</p> : null}
            <button className="button primary auth-submit" type="submit" disabled={submitting}><Mail size={16} />{submitting ? "发送中…" : "发送验证码"}</button>
          </form>
        )}
        <p className="auth-footnote">你的数据属于你的账号，并受到 Supabase 行级权限保护。</p>
      </section>
    </main>
  );
}
