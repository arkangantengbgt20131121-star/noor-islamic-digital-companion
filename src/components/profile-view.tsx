"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownToLine,
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  Globe2,
  ImagePlus,
  LockKeyhole,
  LogOut,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  Volume2,
  Vibrate,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/http";
import type { AppUser } from "@/lib/types";

type Props = {
  user: AppUser | null;
  darkMode: boolean;
  onUserChange: (user: AppUser | null) => void;
  onThemeToggle: () => Promise<void>;
  onSignIn: () => void;
  onSignedOut: () => Promise<void>;
  onNotice: (message: string) => void;
};

export function ProfileView({ user, darkMode, onUserChange, onThemeToggle, onSignIn, onSignedOut, onNotice }: Props) {
  const [fullName, setFullName] = useState(user?.profile.fullName ?? "");
  const [avatarUrl, setAvatarUrl] = useState(user?.profile.avatarUrl ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [verificationBusy, setVerificationBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);

  useEffect(() => {
    setFullName(user?.profile.fullName ?? "");
    setAvatarUrl(user?.profile.avatarUrl ?? "");
  }, [user]);

  const saveProfile = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const result = await apiFetch<{ user: AppUser }>("/api/auth/me", { method: "PATCH", body: JSON.stringify({ fullName, avatarUrl: avatarUrl || null }) });
      onUserChange(result.user);
      onNotice("Your profile has been updated.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your profile could not be saved.");
    } finally { setSaving(false); }
  };

  const updatePreference = async (patch: Record<string, unknown>) => {
    if (!user) return;
    setSaving(true);
    setError("");
    try {
      const result = await apiFetch<{ user: AppUser }>("/api/auth/me", { method: "PATCH", body: JSON.stringify(patch) });
      onUserChange(result.user);
      onNotice("Your preference has been saved.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your preference could not be saved.");
    } finally { setSaving(false); }
  };

  const exportData = async () => {
    if (!user) return;
    setExportBusy(true);
    setError("");
    try {
      const response = await fetch("/api/auth/export", { credentials: "same-origin" });
      if (!response.ok) throw new Error("Your data could not be exported.");
      const payload = await response.json();
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `noor-data-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      onNotice("Your data export has been downloaded.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Export failed.");
    } finally { setExportBusy(false); }
  };

  const resendVerification = async () => {
    setVerificationBusy(true);
    setError("");
    try {
      const result = await apiFetch<{ message: string; verificationUrl?: string }>("/api/auth/resend-verification", { method: "POST", body: JSON.stringify({}) });
      onNotice(result.message);
      if (result.verificationUrl) window.open(result.verificationUrl, "_blank", "noopener,noreferrer");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "A verification email could not be sent.");
    } finally { setVerificationBusy(false); }
  };

  const deleteAccount = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setDeleteBusy(true);
    setError("");
    try {
      await apiFetch("/api/auth/me", { method: "DELETE", body: JSON.stringify({ password: deletePassword }) });
      onUserChange(null);
      setDeleteOpen(false);
      setDeletePassword("");
      onNotice("Your account and associated personal data have been deleted.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your account could not be deleted.");
    } finally { setDeleteBusy(false); }
  };

  if (!user) return <div className="profile-page page-enter"><div className="page-heading"><div><p className="eyebrow">PROFILE & SETTINGS</p><h1>Your space, your way<span className="heading-period">.</span></h1><p className="page-subtitle">Sign in to keep your preferences and personal learning journey together.</p></div></div><div className="profile-guest-card"><div className="profile-guest-mark"><LockKeyhole size={24} /></div><span className="eyebrow">A PRIVATE ACCOUNT</span><h2>Keep your progress close.</h2><p>Your dhikr history, reading position, and saved lessons stay private to your account and follow you between devices.</p><button className="button button-primary" onClick={onSignIn}>Create an account <ChevronRight size={16} /></button></div></div>;

  const profile = user.profile;
  const createdDate = new Intl.DateTimeFormat(profile.preferredLanguage === "en" ? "en-US" : "id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(user.createdAt));

  return (
    <div className="profile-page page-enter"><div className="page-heading"><div><p className="eyebrow">PROFILE & SETTINGS</p><h1>Your space, your way<span className="heading-period">.</span></h1><p className="page-subtitle">Make Noor feel a little more like yours.</p></div></div>
      {error && <div className="inline-alert" role="alert">{error}<button onClick={() => setError("")} aria-label="Dismiss"><X size={14} /></button></div>}
      <div className="profile-layout"><main className="profile-main">
        <section className="profile-card"><div className="profile-card-heading"><div><span className="eyebrow">YOUR ACCOUNT</span><h2>Personal details</h2></div><span className="profile-since">Since {createdDate}</span></div><form onSubmit={saveProfile} className="profile-form"><div className="profile-avatar-row"><div className="profile-avatar">{profile.avatarUrl ? <img src={profile.avatarUrl} alt="Profile" /> : user.profile.fullName.slice(0, 1).toUpperCase()}</div><div><strong>Your profile</strong><p>Your name and profile image are shown only in your Noor space.</p></div></div><label className="field-label">Full name<input required minLength={2} maxLength={120} value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label className="field-label">Profile image URL <span className="field-optional">optional</span><span className="profile-url-input"><ImagePlus size={16} /><input type="url" value={avatarUrl} onChange={(event) => setAvatarUrl(event.target.value)} placeholder="https://example.com/photo.jpg" /></span></label><div className="profile-readonly-row"><span>Email address</span><strong>{user.email}</strong></div><div className="profile-form-actions"><span>{saving ? "Saving…" : "Changes are saved to your account."}</span><button className="button button-primary" disabled={saving} type="submit">Save changes <Check size={15} /></button></div></form></section>
        <section className="profile-card"><div className="profile-card-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h2>Reading preferences</h2></div><Globe2 size={19} className="profile-section-icon" /></div><div className="preference-row"><span className="preference-icon"><Globe2 size={17} /></span><div className="preference-copy"><strong>Language</strong><small>Interface and translation preference</small></div><select value={profile.preferredLanguage} onChange={(event) => void updatePreference({ preferredLanguage: event.target.value })}><option value="id">Bahasa Indonesia</option><option value="en">English</option></select></div><div className="preference-row"><span className="preference-icon">{darkMode ? <Moon size={17} /> : <Sun size={17} />}</span><div className="preference-copy"><strong>Appearance</strong><small>Choose a calm light or dark reading space</small></div><button className={`switch ${darkMode ? "switch-on" : ""}`} role="switch" aria-checked={darkMode} onClick={() => void onThemeToggle()}><span /></button><span className="preference-value">{darkMode ? "Dark" : "Light"}</span></div><div className="preference-row"><span className="preference-icon"><BookOpenTextIcon /></span><div className="preference-copy"><strong>Arabic text size</strong><small>Adjust the Quran reader typography</small></div><div className="font-setting"><button onClick={() => void updatePreference({ arabicFontSize: Math.max(24, profile.arabicFontSize - 2) })} aria-label="Decrease Arabic size">−</button><span>{profile.arabicFontSize}px</span><button onClick={() => void updatePreference({ arabicFontSize: Math.min(48, profile.arabicFontSize + 2) })} aria-label="Increase Arabic size">+</button></div></div><div className="preference-row"><span className="preference-icon"><BookOpenTextIcon /></span><div className="preference-copy"><strong>Show translation</strong><small>Display a translation under Arabic text</small></div><button className={`switch ${profile.showTranslation ? "switch-on" : ""}`} role="switch" aria-checked={profile.showTranslation} onClick={() => void updatePreference({ showTranslation: !profile.showTranslation })}><span /></button></div></section>
        <section className="profile-card"><div className="profile-card-heading"><div><span className="eyebrow">YOUR DAILY RHYTHM</span><h2>Notifications & sound</h2></div><Bell size={18} className="profile-section-icon" /></div><div className="preference-row"><span className="preference-icon"><Bell size={17} /></span><div className="preference-copy"><strong>Reminders</strong><small>Preference only; no notification service is connected yet</small></div><button className={`switch ${profile.notificationsEnabled ? "switch-on" : ""}`} role="switch" aria-checked={profile.notificationsEnabled} onClick={() => void updatePreference({ notificationsEnabled: !profile.notificationsEnabled })}><span /></button></div><div className="preference-row"><span className="preference-icon"><Volume2 size={17} /></span><div className="preference-copy"><strong>Counter sound</strong><small>Soft feedback when counting dhikr</small></div><button className={`switch ${profile.soundEnabled ? "switch-on" : ""}`} role="switch" aria-checked={profile.soundEnabled} onClick={() => void updatePreference({ soundEnabled: !profile.soundEnabled })}><span /></button></div><div className="preference-row"><span className="preference-icon"><Vibrate size={17} /></span><div className="preference-copy"><strong>Vibration feedback</strong><small>Only on supported mobile devices</small></div><button className={`switch ${profile.vibrationEnabled ? "switch-on" : ""}`} role="switch" aria-checked={profile.vibrationEnabled} onClick={() => void updatePreference({ vibrationEnabled: !profile.vibrationEnabled })}><span /></button></div></section>
      </main><aside className="profile-side"><section className="profile-status-card"><span className="profile-status-icon"><ShieldCheck size={21} /></span><span className="eyebrow">ACCOUNT STATUS</span><h3>{user.emailVerifiedAt ? "Email verified" : "Email not verified"}</h3><p>{user.emailVerifiedAt ? "Your account email has been confirmed." : "Your account works now; email confirmation is available when delivery is configured."}</p>{!user.emailVerifiedAt && <button className="text-button" onClick={() => void resendVerification()} disabled={verificationBusy}>{verificationBusy ? "Preparing link…" : "Resend verification"}<ChevronRight size={15} /></button>}</section><section className="profile-actions-card"><span className="eyebrow">YOUR DATA</span><h3>Manage your information</h3><p>Take your data with you, or remove your account and private records.</p><button className="profile-action-link" onClick={() => void exportData()} disabled={exportBusy}><span><ArrowDownToLine size={16} /> Export my data</span><span>{exportBusy ? "Preparing…" : <ChevronRight size={15} />}</span></button><button className="profile-action-link profile-danger-link" onClick={() => setDeleteOpen(true)}><span><Trash2 size={16} /> Delete account</span><ChevronRight size={15} /></button></section><section className="profile-security-note"><LockKeyhole size={16} /><p>Your account data is scoped to your user ID. Noor never displays another person’s private progress.</p></section><button className="button button-outline signout-button" onClick={() => void onSignedOut()}><LogOut size={16} /> Sign out</button><button className="profile-help-link" onClick={() => onNotice("For questions about sources, consult the source listed with each item. Noor study notes are educational, not fatwas.")}><CircleHelp size={15} /> About Noor & sources</button></aside></div>
      {deleteOpen && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteOpen(false); }}><section className="delete-account-modal" role="dialog" aria-modal="true" aria-labelledby="delete-title"><button className="icon-button modal-close" aria-label="Close" onClick={() => setDeleteOpen(false)}><X size={18} /></button><span className="delete-warning-icon"><Trash2 size={20} /></span><p className="eyebrow">ACCOUNT MANAGEMENT</p><h2 id="delete-title">Delete your Noor account?</h2><p>This permanently removes your profile, dhikr history, bookmarks, learning progress, and sessions. This action cannot be undone.</p><form onSubmit={deleteAccount} className="auth-form"><label className="field-label">Confirm with your password<input required type="password" autoComplete="current-password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} /></label>{error && <p className="form-alert form-alert-error" role="alert">{error}</p>}<div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setDeleteOpen(false)}>Keep account</button><button type="submit" className="button button-danger" disabled={deleteBusy}>{deleteBusy ? "Deleting…" : "Delete permanently"}</button></div></form></section></div>}
    </div>
  );
}

function BookOpenTextIcon() {
  return <span className="font-icon-arabic" aria-hidden="true">ع</span>;
}
