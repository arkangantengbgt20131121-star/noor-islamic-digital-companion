"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, ArrowUpRight, Eye, EyeOff, KeyRound, Mail, X } from "lucide-react";
import { apiFetch } from "@/lib/http";
import type { AppUser } from "@/lib/types";

type Mode = "login" | "register" | "forgot" | "reset";
type Props = {
  initialMode: "login" | "register";
  resetToken?: string;
  onClose: () => void;
  onAuthenticated: (user: AppUser, message?: string, link?: string) => void;
};

export function AuthDialog({ initialMode, resetToken, onClose, onAuthenticated }: Props) {
  const [mode, setMode] = useState<Mode>(resetToken ? "reset" : initialMode);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState(resetToken ?? "");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [actionLink, setActionLink] = useState("");

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setActionLink("");
    setBusy(true);
    try {
      if (mode === "login") {
        const result = await apiFetch<{ user: AppUser; message: string }>("/api/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
        onAuthenticated(result.user, result.message);
      } else if (mode === "register") {
        const result = await apiFetch<{ user: AppUser; message: string; verificationUrl?: string }>("/api/auth/register", { method: "POST", body: JSON.stringify({ fullName, email, password }) });
        onAuthenticated(result.user, result.message, result.verificationUrl);
      } else if (mode === "forgot") {
        const result = await apiFetch<{ message: string; resetUrl?: string }>("/api/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) });
        setMessage(result.message);
        setActionLink(result.resetUrl ?? "");
      } else {
        const result = await apiFetch<{ message: string }>("/api/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) });
        setMessage(result.message);
        setPassword("");
        setMode("login");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const titles: Record<Mode, string> = {
    login: "Welcome back",
    register: "Make room for Noor",
    forgot: "Reset your password",
    reset: "Choose a new password",
  };

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <button className="icon-button modal-close" aria-label="Close dialog" onClick={onClose}><X size={20} /></button>
        <div className="auth-mark" aria-hidden="true">ن</div>
        {mode === "forgot" || mode === "reset" ? <button className="auth-back" onClick={() => { setMode("login"); setError(""); setMessage(""); }}><ArrowLeft size={15} /> Back to sign in</button> : null}
        <p className="eyebrow">YOUR PERSONAL SPACE</p>
        <h2 id="auth-title">{titles[mode]}</h2>
        <p className="auth-intro">{mode === "register" ? "A calm place to build your learning and worship rhythms." : mode === "login" ? "Sign in to pick up where you left off." : mode === "forgot" ? "We’ll help you get back to your account." : "Use at least 8 characters for your new password."}</p>
        {(mode === "login" || mode === "register") && <div className="auth-tabs" role="tablist" aria-label="Account access">
          <button role="tab" aria-selected={mode === "login"} className={mode === "login" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("login"); setError(""); }}>Sign in</button>
          <button role="tab" aria-selected={mode === "register"} className={mode === "register" ? "auth-tab active" : "auth-tab"} onClick={() => { setMode("register"); setError(""); }}>Create account</button>
        </div>}
        <form onSubmit={submit} className="auth-form">
          {mode === "register" && <label className="field-label">Full name<div className="field-wrap"><input required minLength={2} maxLength={120} autoComplete="name" value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Your name" /></div></label>}
          {(mode === "login" || mode === "register" || mode === "forgot") && <label className="field-label">Email address<div className="field-wrap"><Mail size={17} /><input required type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" /></div></label>}
          {mode === "reset" && <label className="field-label">Reset token<div className="field-wrap"><KeyRound size={17} /><input required value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste the reset token" /></div></label>}
          {(mode === "login" || mode === "register" || mode === "reset") && <label className="field-label">{mode === "reset" ? "New password" : "Password"}<div className="field-wrap"><KeyRound size={17} /><input required type={showPassword ? "text" : "password"} minLength={mode === "login" ? 1 : 8} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={mode === "login" ? "Your password" : "At least 8 characters"} /><button type="button" className="field-suffix" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>}
          {mode === "login" && <button type="button" className="forgot-link" onClick={() => { setMode("forgot"); setError(""); setMessage(""); }}>Forgot password?</button>}
          {error && <p className="form-alert form-alert-error" role="alert">{error}</p>}
          {message && <div className="form-alert form-alert-success" role="status">{message}{actionLink && <a href={actionLink}>Continue password reset <ArrowUpRight size={14} /></a>}</div>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? <span className="button-spinner" /> : null}{busy ? "Please wait…" : mode === "login" ? "Sign in" : mode === "register" ? "Create my account" : mode === "forgot" ? "Send reset instructions" : "Update password"}</button>
        </form>
        <p className="auth-privacy">Your personal progress is private to your account. <a href="#privacy" onClick={(event) => { event.preventDefault(); setMessage("Noor stores account data securely in this app’s PostgreSQL database. You can export or delete it from Profile & settings."); }}>How data is used</a></p>
      </section>
    </div>
  );
}
