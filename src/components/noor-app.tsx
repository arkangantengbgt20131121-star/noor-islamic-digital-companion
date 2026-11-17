"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpenText,
  Bookmark,
  CircleDot,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Search,
  Settings2,
  Sparkles,
  Sun,
  UserRound,
  X,
} from "lucide-react";
import { AuthDialog } from "@/components/auth-dialog";
import { BookmarksView } from "@/components/bookmarks-view";
import { DashboardView } from "@/components/dashboard-view";
import { DhikrView } from "@/components/dhikr-view";
import { LearningView } from "@/components/learning-view";
import { LibraryView } from "@/components/library-view";
import { ProfileView } from "@/components/profile-view";
import { QuranView } from "@/components/quran-view";
import { apiFetch } from "@/lib/http";
import type { AppUser, DashboardSummary } from "@/lib/types";

type Section = "dashboard" | "dhikr" | "quran" | "learning" | "library" | "bookmarks" | "profile";
type Notice = { message: string; link?: string };

const NAV_ITEMS: { id: Section; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "dashboard", label: "Overview", icon: LayoutDashboard },
  { id: "dhikr", label: "Dzikir", icon: CircleDot },
  { id: "quran", label: "Al-Quran", icon: BookOpenText },
  { id: "learning", label: "Learning", icon: GraduationCap },
  { id: "library", label: "Library", icon: LibraryBig },
  { id: "bookmarks", label: "Bookmarks", icon: Bookmark },
];

const SECTION_TITLES: Record<Section, string> = {
  dashboard: "Your space",
  dhikr: "A moment of remembrance",
  quran: "Read & reflect",
  learning: "A path of learning",
  library: "The reading room",
  bookmarks: "Saved for later",
  profile: "Your preferences",
};

export function NoorApp() {
  const [section, setSection] = useState<Section>("dashboard");
  const [user, setUser] = useState<AppUser | null>(null);
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [resetToken, setResetToken] = useState<string | undefined>();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [globalSearch, setGlobalSearch] = useState("");
  const [quranQuery, setQuranQuery] = useState("");
  const [quranReference, setQuranReference] = useState("");
  const [libraryTarget, setLibraryTarget] = useState("");
  const [lessonTarget, setLessonTarget] = useState("");
  const [isReady, setIsReady] = useState(false);

  const refreshDashboard = useCallback(async () => {
    try {
      const data = await apiFetch<DashboardSummary>(`/api/dashboard?date=${new Date().toLocaleDateString("en-CA")}`);
      setDashboard(data);
    } catch {
      setDashboard(null);
    }
  }, []);

  useEffect(() => {
    let active = true;
    const params = new URLSearchParams(window.location.search);
    const reset = params.get("reset");
    if (reset) {
      setResetToken(reset);
      setAuthOpen(true);
    }
    const verified = params.get("verified");
    if (verified === "success") setNotice({ message: "Your email is verified. Thank you." });
    if (verified === "invalid") setNotice({ message: "That verification link is invalid or has expired." });
    if (reset || verified) window.history.replaceState({}, "", window.location.pathname);

    apiFetch<{ user: AppUser | null }>("/api/auth/me")
      .then(({ user: current }) => {
        if (!active) return;
        setUser(current);
        const storedTheme = window.localStorage.getItem("noor-theme");
        setDarkMode(current?.profile.theme === "dark" || (!current && storedTheme === "dark"));
        setIsReady(true);
        if (current) void refreshDashboard();
      })
      .catch(() => {
        if (!active) return;
        setIsReady(true);
        setDarkMode(window.localStorage.getItem("noor-theme") === "dark");
      });
    return () => {
      active = false;
    };
  }, [refreshDashboard]);

  const navigate = useCallback((next: Section, target?: string) => {
    setSection(next);
    setMobileMenuOpen(false);
    if (next !== "quran") setQuranQuery("");
    setQuranReference(next === "quran" ? target ?? "" : "");
    setLibraryTarget(next === "library" ? target ?? "" : "");
    setLessonTarget(next === "learning" ? target ?? "" : "");
  }, []);

  const onAuthenticated = useCallback((newUser: AppUser, message?: string, link?: string) => {
    setUser(newUser);
    setAuthOpen(false);
    setDarkMode(newUser.profile.theme === "dark");
    setNotice(message ? { message, link } : { message: "You’re signed in. Welcome to Noor." });
    void refreshDashboard();
  }, [refreshDashboard]);

  const toggleTheme = useCallback(async () => {
    const next = !darkMode;
    setDarkMode(next);
    window.localStorage.setItem("noor-theme", next ? "dark" : "light");
    if (user) {
      try {
        const result = await apiFetch<{ user: AppUser }>("/api/auth/me", { method: "PATCH", body: JSON.stringify({ theme: next ? "dark" : "light" }) });
        setUser(result.user);
      } catch {
        setNotice({ message: "Theme changed on this device. Sign in again to sync preferences." });
      }
    }
  }, [darkMode, user]);

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ ok: boolean }>("/api/auth/logout", { method: "POST", body: JSON.stringify({}) });
    } finally {
      setUser(null);
      setDashboard(null);
      setSection("dashboard");
      setNotice({ message: "You have been signed out." });
    }
  }, []);

  const submitSearch = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = globalSearch.trim();
    if (!query) return;
    setQuranReference("");
    setQuranQuery(query);
    setSection("quran");
  };

  const activeTitle = SECTION_TITLES[section];
  const firstName = useMemo(() => user?.profile.fullName.trim().split(/\s+/)[0] ?? "friend", [user]);

  return (
    <div className={`noor-app ${darkMode ? "theme-dark" : ""}`}>
      <div className={`mobile-scrim ${mobileMenuOpen ? "is-visible" : ""}`} onClick={() => setMobileMenuOpen(false)} aria-hidden="true" />
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`} aria-label="Main navigation">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>ن</span><i /></div>
          <div className="brand-wordmark"><strong>noor<span>.</span></strong><small>A little light, every day</small></div>
          <button className="icon-button sidebar-close" aria-label="Close navigation" onClick={() => setMobileMenuOpen(false)}><X size={19} /></button>
        </div>
        <div className="sidebar-caption">YOUR SPACE</div>
        <nav className="side-nav">
          {NAV_ITEMS.map(({ id, label, icon: Icon }) => (
            <button key={id} className={`nav-link ${section === id ? "nav-link-active" : ""}`} onClick={() => navigate(id)} aria-current={section === id ? "page" : undefined}>
              <Icon size={19} strokeWidth={1.8} /><span>{label}</span>{id === "bookmarks" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-spacer" />
        <div className="sidebar-note">
          <div className="sidebar-note-icon"><Sparkles size={16} /></div>
          <p>Small steps, held with intention.</p>
          <button onClick={() => navigate("dhikr")}>Take a quiet moment <span>↗</span></button>
        </div>
        <div className="sidebar-bottom">
          <button className={`nav-link ${section === "profile" ? "nav-link-active" : ""}`} onClick={() => navigate("profile")}>
            <Settings2 size={19} strokeWidth={1.8} /><span>Profile & settings</span>
          </button>
          <div className="sidebar-account">
            <div className="avatar avatar-small">{user ? user.profile.fullName.slice(0, 1).toUpperCase() : <UserRound size={15} />}</div>
            <div className="sidebar-account-copy"><strong>{user ? user.profile.fullName : "Your Noor space"}</strong><span>{user ? user.email : "Guest experience"}</span></div>
            {user ? <button className="icon-button account-action" aria-label="Sign out" title="Sign out" onClick={() => void logout()}><LogOut size={16} /></button> : <button className="icon-button account-action" aria-label="Sign in" title="Sign in" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}><LogIn size={16} /></button>}
          </div>
        </div>
      </aside>

      <div className="app-main">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumb"><span>Noor</span><b>/</b><strong>{activeTitle}</strong></div>
          </div>
          <form className="top-search" onSubmit={submitSearch} role="search">
            <Search size={17} />
            <input value={globalSearch} onChange={(event) => setGlobalSearch(event.target.value)} placeholder="Search surahs, ayahs, notes…" aria-label="Search Noor" />
            <kbd>↵</kbd>
          </form>
          <div className="topbar-actions">
            <button className="icon-button theme-toggle" onClick={() => void toggleTheme()} aria-label={darkMode ? "Switch to light theme" : "Switch to dark theme"} title={darkMode ? "Light mode" : "Dark mode"}>{darkMode ? <Sun size={18} /> : <Moon size={18} />}</button>
            {user ? <button className="top-avatar" onClick={() => navigate("profile")} aria-label="Open profile">{user.profile.fullName.slice(0, 1).toUpperCase()}</button> : <button className="top-signin" onClick={() => { setAuthMode("login"); setAuthOpen(true); }}>Sign in <LogIn size={15} /></button>}
          </div>
        </header>

        <main className="page-content" key={section}>
          {section === "dashboard" && <DashboardView user={user} dashboard={dashboard} onNavigate={navigate} onSignIn={() => { setAuthMode("register"); setAuthOpen(true); }} onRefresh={refreshDashboard} />}
          {section === "dhikr" && <DhikrView user={user} onUserChange={setUser} onSignIn={() => { setAuthMode("register"); setAuthOpen(true); }} onProgressChange={refreshDashboard} />}
          {section === "quran" && <QuranView user={user} initialSearch={quranQuery} initialReference={quranReference} onUserChange={setUser} onSignIn={() => { setAuthMode("register"); setAuthOpen(true); }} />}
          {section === "learning" && <LearningView user={user} onSignIn={() => { setAuthMode("register"); setAuthOpen(true); }} onProgressChange={refreshDashboard} initialLessonId={lessonTarget} />}
          {section === "library" && <LibraryView user={user} onSignIn={() => { setAuthMode("register"); setAuthOpen(true); }} initialItemId={libraryTarget} />}
          {section === "bookmarks" && <BookmarksView user={user} onNavigate={navigate} onSignIn={() => { setAuthMode("register"); setAuthOpen(true); }} />}
          {section === "profile" && <ProfileView user={user} darkMode={darkMode} onUserChange={setUser} onThemeToggle={toggleTheme} onSignIn={() => { setAuthMode("register"); setAuthOpen(true); }} onSignedOut={logout} onNotice={(message) => setNotice({ message })} />}
        </main>
        <footer className="app-footer"><span>Made for a more mindful day</span><span>Sources matter. Read with care.</span></footer>
      </div>

      <nav className="mobile-dock" aria-label="Mobile navigation">
        {[NAV_ITEMS[0], NAV_ITEMS[1], NAV_ITEMS[2], NAV_ITEMS[3], { id: "profile" as Section, label: "You", icon: UserRound }].map(({ id, label, icon: Icon }) => (
          <button key={id} className={`dock-link ${section === id ? "dock-link-active" : ""}`} onClick={() => navigate(id)} aria-current={section === id ? "page" : undefined}>
            <Icon size={19} strokeWidth={section === id ? 2.2 : 1.7} /><span>{label}</span>
          </button>
        ))}
      </nav>

      {authOpen && <AuthDialog initialMode={authMode} resetToken={resetToken} onClose={() => { setAuthOpen(false); setResetToken(undefined); }} onAuthenticated={onAuthenticated} />}
      {notice && <div className="toast-message" role="status"><span>{notice.message}</span>{notice.link && <a href={notice.link}>Open link <span>↗</span></a>}<button onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={16} /></button></div>}
      {!isReady && <div className="boot-splash" aria-hidden="true"><div className="boot-mark">ن</div><span>noor</span></div>}
    </div>
  );
}
