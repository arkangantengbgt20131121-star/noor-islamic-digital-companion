"use client";

import { useEffect, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  BookOpenText,
  Bookmark,
  CircleDot,
  Compass,
  GraduationCap,
  LibraryBig,
  Sparkles,
} from "lucide-react";
import { LOCAL_KEYS } from "@/lib/client-data";
import { formatHijriDate, formatLongDate } from "@/lib/date";
import { LIBRARY_ITEMS } from "@/lib/content";
import type { Section } from "@/lib/ui-types";
import type { AppUser, DashboardSummary } from "@/lib/types";

type Props = {
  user: AppUser | null;
  dashboard: DashboardSummary | null;
  onNavigate: (section: Section, target?: string) => void;
  onSignIn: () => void;
  onRefresh: () => Promise<void>;
};
type LocalDhikr = Record<string, Record<string, { count: number; target: number }>>;
type GuestRecent = { contentId: string; title: string; progress: number; updatedAt: string };

function Ring({ value, total }: { value: number; total: number }) {
  const percent = Math.min(100, total > 0 ? (value / total) * 100 : 0);
  const circumference = 2 * Math.PI * 31;
  return <svg className="progress-ring" viewBox="0 0 76 76" aria-label={`${Math.round(percent)} percent complete`} role="img"><circle className="ring-track" cx="38" cy="38" r="31" /><circle className="ring-value" cx="38" cy="38" r="31" style={{ strokeDasharray: circumference, strokeDashoffset: circumference * (1 - percent / 100) }} /><text x="38" y="39" textAnchor="middle" dominantBaseline="middle">{Math.round(percent)}%</text></svg>;
}

export function DashboardView({ user, dashboard, onNavigate, onSignIn, onRefresh }: Props) {
  const [guestCount, setGuestCount] = useState(0);
  const [guestRecent, setGuestRecent] = useState<GuestRecent[]>([]);
  const language = user?.profile.preferredLanguage ?? "id";
  const locale = language === "en" ? "en-US" : "id-ID";
  const name = user?.profile.fullName.trim().split(/\s+/)[0];
  const longDate = formatLongDate(new Date(), locale);
  const hijriDate = formatHijriDate(new Date(), locale);
  const dhikrCount = user ? dashboard?.dhikrCount ?? 0 : guestCount;
  const dhikrGoal = user ? dashboard?.dhikrTarget ?? 100 : 100;
  const lessonDone = dashboard?.completedLessons ?? 0;
  const lessonTotal = 8;
  const recentLibrary = user ? dashboard?.recentLibrary ?? [] : guestRecent;

  useEffect(() => {
    if (user) return;
    try {
      const stored = window.localStorage.getItem(LOCAL_KEYS.dhikr);
      if (stored) {
        const data = JSON.parse(stored) as LocalDhikr;
        const date = new Date();
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        setGuestCount(Object.values(data[key] ?? {}).reduce((sum, item) => sum + item.count, 0));
      } else setGuestCount(0);
    } catch {
      setGuestCount(0);
    }
  }, [user, dashboard]);

  useEffect(() => {
    if (user) return;
    try {
      const stored = JSON.parse(window.localStorage.getItem("noor-local-reading-v1") ?? "{}") as Record<string, { progress?: number }>;
      const recent = Object.entries(stored).filter(([key]) => key.startsWith("library:")).slice(-3).reverse().map(([key, value]) => {
        const id = key.slice("library:".length);
        return { contentId: id, title: LIBRARY_ITEMS.find((item) => item.id === id)?.title ?? "Reading material", progress: value.progress ?? 0, updatedAt: "" };
      });
      setGuestRecent(recent);
    } catch {
      setGuestRecent([]);
    }
  }, [user]);

  return (
    <div className="dashboard-page page-enter">
      <div className="page-heading dashboard-heading">
        <div><p className="eyebrow">{longDate} <span className="date-separator">·</span> {hijriDate}</p><h1>Assalamu alaikum{name ? `, ${name}` : ""}<span className="heading-period">.</span></h1><p className="page-subtitle">A little space to reconnect with what matters today.</p></div>
        <button className="button button-soft heading-action" onClick={() => onNavigate("dhikr")}><CircleDot size={16} /> Begin with dhikr</button>
      </div>

      <section className="welcome-panel">
        <div className="welcome-copy"><span className="welcome-kicker"><Sparkles size={14} /> YOUR DAILY SPACE</span><h2>Let today unfold<br /><em>with intention.</em></h2><p>There is no rush here. Choose one small act of remembrance, reading, or learning and return to it at your own pace.</p><button className="welcome-button" onClick={() => onNavigate("learning")}>Explore a learning path <ArrowRight size={16} /></button></div>
        <div className="welcome-art" aria-hidden="true"><div className="art-arch art-arch-back" /><div className="art-arch art-arch-front"><div className="art-star">✳</div><div className="art-arch-inner" /></div><div className="art-line art-line-one" /><div className="art-line art-line-two" /><span className="art-caption">نُور</span></div>
        <div className="welcome-orb welcome-orb-one" /><div className="welcome-orb welcome-orb-two" />
      </section>

      <div className="section-row dashboard-section-row"><div><p className="eyebrow">A GENTLE OVERVIEW</p><h2 className="section-title">Your daily rhythm</h2></div><span className="soft-label"><span className="live-dot" /> {user ? "Synced to your account" : "This device only"}</span></div>
      <section className="overview-grid" aria-label="Daily progress">
        <article className="overview-card overview-card-primary"><div className="overview-card-top"><div><span className="card-icon icon-sage"><CircleDot size={18} /></span><p className="card-label">Daily dhikr</p></div><button className="round-arrow" aria-label="Open dhikr" onClick={() => onNavigate("dhikr")}><ArrowRight size={16} /></button></div><div className="overview-card-bottom"><div><strong className="metric-large">{dhikrCount.toLocaleString(locale)}</strong><span className="metric-context"> / {dhikrGoal} mindful moments</span><div className="micro-progress"><span style={{ width: `${Math.min(100, (dhikrCount / dhikrGoal) * 100)}%` }} /></div><p className="card-footnote">Every remembrance is a beginning.</p></div><Ring value={dhikrCount} total={dhikrGoal} /></div></article>
        <article className="overview-card"><div className="overview-card-top"><div><span className="card-icon icon-beige"><BookOpenText size={18} /></span><p className="card-label">Qur'an reading</p></div><button className="round-arrow" aria-label="Open Quran" onClick={() => onNavigate("quran")}><ArrowRight size={16} /></button></div><div className="reading-preview"><div className="reading-bookmark"><BookOpenText size={18} /></div><div><strong>{dashboard?.quran ? `Surah ${dashboard.quran.contentId}` : "Begin with Al-Fatihah"}</strong><span>{dashboard?.quran ? `Ayah ${Math.max(1, dashboard.quran.position)} · Continue where you left off` : "A quiet place to read and reflect"}</span></div></div><div className="card-inline-link" role="button" tabIndex={0} onClick={() => onNavigate("quran")} onKeyDown={(event) => { if (event.key === "Enter") onNavigate("quran"); }}>Continue reading <ArrowRight size={14} /></div></article>
        <article className="overview-card"><div className="overview-card-top"><div><span className="card-icon icon-terracotta"><GraduationCap size={18} /></span><p className="card-label">Learning journey</p></div><button className="round-arrow" aria-label="Open learning" onClick={() => onNavigate("learning")}><ArrowRight size={16} /></button></div><div className="lesson-metric"><strong>{lessonDone.toString().padStart(2, "0")}</strong><span> lessons completed</span></div><div className="micro-progress lesson-progress"><span style={{ width: `${Math.min(100, (lessonDone / lessonTotal) * 100)}%` }} /></div><p className="card-footnote">A thoughtful step is still a step.</p></article>
      </section>

      <section className="dashboard-lower-grid">
        <div className="dashboard-main-column">
          <div className="section-row"><div><p className="eyebrow">PICK UP ANYTIME</p><h2 className="section-title">A place to begin</h2></div><button className="text-button" onClick={() => onNavigate("library")}>View library <ArrowRight size={14} /></button></div>
          <div className="feature-grid">
            <button className="feature-card" onClick={() => onNavigate("quran")}><span className="feature-icon feature-icon-sage"><BookOpenText size={20} /></span><strong>The Holy Qur'an</strong><span>Read Arabic with a clearly sourced translation.</span><i><ArrowRight size={15} /></i></button>
            <button className="feature-card" onClick={() => onNavigate("learning")}><span className="feature-icon feature-icon-cream"><GraduationCap size={20} /></span><strong>Learn with care</strong><span>Explore lessons grounded in cited sources.</span><i><ArrowRight size={15} /></i></button>
            <button className="feature-card" onClick={() => onNavigate("library")}><span className="feature-icon feature-icon-rose"><LibraryBig size={20} /></span><strong>Reading room</strong><span>Original study notes, guides, and reflections.</span><i><ArrowRight size={15} /></i></button>
          </div>
          <section className="recently-opened"><div className="recently-opened-heading"><div><p className="eyebrow">YOUR READING TRAIL</p><h3>Recently opened</h3></div><button className="text-button" onClick={() => onNavigate("library")}>View shelf <ArrowRight size={13} /></button></div>{recentLibrary.length ? <div className="recently-opened-list">{recentLibrary.slice(0, 3).map((item) => <button className="recently-opened-row" key={item.contentId} onClick={() => onNavigate("library", item.contentId)}><span className="recent-book-icon"><LibraryBig size={16} /></span><span className="recent-book-copy"><strong>{item.title}</strong><small>{item.progress > 0 ? `${item.progress}% read` : "Opened recently"}</small></span><ArrowRight size={14} /></button>)}</div> : <div className="recent-empty"><span className="recent-book-icon"><LibraryBig size={16} /></span><p>Your recently opened reading materials will appear here.</p><button onClick={() => onNavigate("library")}>Explore the shelf <ArrowRight size={13} /></button></div>}</section>
          <div className="inspiration-card"><div className="inspiration-mark">“</div><div><p className="eyebrow">A NOTE FOR TODAY</p><p className="inspiration-quote">A calm rhythm is made one return at a time. Begin gently, and leave room to begin again.</p><span className="inspiration-source">A Noor editorial reflection · not a religious quotation</span></div><div className="inspiration-sprig" aria-hidden="true">✳</div></div>
        </div>
        <aside className="dashboard-side-column">
          <div className="side-panel"><div className="section-row compact"><div><p className="eyebrow">YOUR PERSONAL SPACE</p><h2 className="side-title">Keep it yours</h2></div><Bookmark size={17} className="side-panel-icon" /></div><p className="side-panel-copy">Save an ayah, lesson, or reading note and find it here whenever you return.</p><button className="side-panel-link" onClick={() => onNavigate("bookmarks")}>Open bookmarks <ArrowRight size={15} /></button></div>
          <div className="account-nudge"><div className="nudge-icon"><Compass size={19} /></div><p className="eyebrow">{user ? "YOUR ACCOUNT" : "MAKE IT PERSONAL"}</p><h3>{user ? "Your journey is saved." : "A space that remembers."}</h3><p>{user ? user.emailVerifiedAt ? "Your email is verified, and your private progress syncs to your account." : "Your progress syncs privately. Verify your email when delivery is configured." : "Create an account to keep your dhikr, reading, and learning progress across devices."}</p>{user ? <button className="text-button" onClick={() => onNavigate("profile")}>Account settings <ArrowRight size={14} /></button> : <button className="button button-primary nudge-button" onClick={onSignIn}>Create a free account <ArrowRight size={15} /></button>}</div>
        </aside>
      </section>
      {!user && <div className="guest-note"><ArrowDownRight size={15} /> Your private progress is stored only on this device until you sign in. <button onClick={() => { void onRefresh(); onSignIn(); }}>Create an account</button></div>}
    </div>
  );
}
