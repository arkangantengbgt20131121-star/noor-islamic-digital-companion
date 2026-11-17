"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  BookOpenText,
  Check,
  ChevronRight,
  Clock3,
  LibraryBig,
  Search,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/http";
import { LOCAL_KEYS } from "@/lib/client-data";
import { LIBRARY_CATEGORIES } from "@/lib/content";
import type { AppBookmark, AppUser, LibraryItem } from "@/lib/types";

const LOCAL_READ_KEY = "noor-local-reading-v1";
type Props = { user: AppUser | null; onSignIn: () => void; initialItemId?: string };
type SavedProgress = { contentType: string; contentId: string; progress: number; position: number };

function renderLibraryText(content: string) {
  return content.split("\n").map((line, index) => {
    if (line.startsWith("## ")) return <h2 key={index}>{line.slice(3)}</h2>;
    if (line.startsWith("### ")) return <h3 key={index}>{line.slice(4)}</h3>;
    if (line.startsWith("- ")) return <li key={index}>{line.slice(2)}</li>;
    const numbered = line.match(/^\d+\.\s(.+)/);
    if (numbered) return <li key={index}>{numbered[1]}</li>;
    if (line.trim()) return <p key={index}>{line}</p>;
    return null;
  });
}

function readBookmarks(): AppBookmark[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(LOCAL_KEYS.bookmarks) ?? "[]") as AppBookmark[]; }
  catch { return []; }
}

export function LibraryView({ user, onSignIn, initialItemId }: Props) {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [category, setCategory] = useState("All materials");
  const [searchInput, setSearchInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(initialItemId ?? null);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [readProgress, setReadProgress] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const readerRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<number | null>(null);
  const current = items.find((item) => item.id === selectedId) ?? null;

  useEffect(() => { if (initialItemId) setSelectedId(initialItemId); }, [initialItemId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<{ items: LibraryItem[] }>("/api/library")
      .then(({ items: data }) => { if (active) setItems(data); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "The library could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!user) {
      setBookmarks(new Set(readBookmarks().filter((item) => item.type === "library").map((item) => item.contentId)));
      try {
        const local = JSON.parse(window.localStorage.getItem(LOCAL_READ_KEY) ?? "{}") as Record<string, { progress: number }>;
        const next: Record<string, number> = {};
        Object.entries(local).forEach(([key, value]) => { if (key.startsWith("library:")) next[key.slice(8)] = value.progress; });
        setReadProgress(next);
      } catch { setReadProgress({}); }
      return;
    }
    Promise.all([apiFetch<{ bookmarks: AppBookmark[] }>("/api/bookmarks"), apiFetch<{ progress: SavedProgress[] }>("/api/reading-progress")])
      .then(([saved, reading]) => {
        setBookmarks(new Set(saved.bookmarks.filter((item) => item.type === "library").map((item) => item.contentId)));
        const next: Record<string, number> = {};
        reading.progress.filter((item) => item.contentType === "library").forEach((item) => { next[item.contentId] = item.progress; });
        setReadProgress(next);
      }).catch(() => { setBookmarks(new Set()); });
  }, [user]);

  const filtered = useMemo(() => items.filter((item) => (category === "All materials" || item.category === category) && (!query || `${item.title} ${item.description} ${item.category} ${item.content}`.toLowerCase().includes(query.toLowerCase()))), [category, items, query]);
  const toggleBookmark = async (item: LibraryItem) => {
    const exists = bookmarks.has(item.id);
    const next = new Set(bookmarks);
    if (exists) next.delete(item.id); else next.add(item.id);
    setBookmarks(next);
    try {
      if (user) await apiFetch("/api/bookmarks", { method: exists ? "DELETE" : "POST", body: JSON.stringify({ type: "library", contentId: item.id }) });
      else {
        const others = readBookmarks().filter((saved) => !(saved.type === "library" && saved.contentId === item.id));
        if (!exists) others.unshift({ type: "library", contentId: item.id, title: item.title, description: item.description, createdAt: new Date().toISOString() });
        window.localStorage.setItem(LOCAL_KEYS.bookmarks, JSON.stringify(others));
      }
    } catch { setBookmarks(bookmarks); setError("This item could not be saved."); }
  };

  const saveProgress = (nextProgress: number) => {
    if (!current) return;
    const bounded = Math.max(0, Math.min(100, Math.round(nextProgress)));
    setReadProgress((value) => ({ ...value, [current.id]: bounded }));
    if (user) {
      setSaving(true);
      void apiFetch("/api/reading-progress", { method: "POST", body: JSON.stringify({ contentType: "library", contentId: current.id, progress: bounded, position: bounded }) })
        .catch((caught) => setError(caught instanceof Error ? caught.message : "Reading progress could not be saved."))
        .finally(() => setSaving(false));
    } else {
      try {
        const stored = JSON.parse(window.localStorage.getItem(LOCAL_READ_KEY) ?? "{}") as Record<string, unknown>;
        stored[`library:${current.id}`] = { progress: bounded, position: bounded };
        window.localStorage.setItem(LOCAL_READ_KEY, JSON.stringify(stored));
      } catch { /* local saving is best-effort */ }
    }
  };

  const handleScroll = () => {
    const element = readerRef.current;
    if (!element) return;
    const scrollable = element.scrollHeight - element.clientHeight;
    if (scrollable <= 0) return;
    const progress = (element.scrollTop / scrollable) * 100;
    setReadProgress((value) => ({ ...value, [current?.id ?? ""]: Math.round(progress) }));
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => saveProgress(progress), 900);
  };

  return (
    <div className="library-page page-enter">
      {!current ? <>
        <div className="page-heading"><div><p className="eyebrow">A READING ROOM FOR REFLECTION</p><h1>The reading room<span className="heading-period">.</span></h1><p className="page-subtitle">Original study notes and learning guides, with sources clearly identified.</p></div><div className="library-total"><LibraryBig size={20} /><div><strong>{items.length}</strong><span>reading materials</span></div></div></div>
        {!user && <div className="guest-saved-note"><Sparkles size={16} /><span>Reading position and bookmarks are saved on this device.</span><button onClick={onSignIn}>Sign in to sync <span>↗</span></button></div>}
        <div className="library-feature"><div className="library-feature-icon"><BookOpenText size={21} /></div><div><span className="eyebrow">A NOTE ON THIS COLLECTION</span><h2>Made for thoughtful study.</h2><p>No copyrighted books are reproduced here. These are original Noor editorial notes and guides, each with a source or attribution.</p></div><span className="library-feature-sigil" aria-hidden="true">ن</span></div>
        {error && <div className="inline-alert" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
        <div className="library-tools"><div className="lesson-category-list">{LIBRARY_CATEGORIES.map((item) => <button key={item} className={`category-chip ${category === item ? "category-chip-active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div><form className="lesson-search" onSubmit={(event) => { event.preventDefault(); setQuery(searchInput.trim()); }}><Search size={16} /><input value={searchInput} onChange={(event) => { setSearchInput(event.target.value); if (!event.target.value) setQuery(""); }} placeholder="Search the library" aria-label="Search library" /><button type="submit">Search</button></form></div>
        <div className="library-results-heading"><div><p className="eyebrow">THE SHELF</p><h2>{category === "All materials" ? "Find something to read" : category}</h2></div><span>{filtered.length} item{filtered.length === 1 ? "" : "s"}</span></div>
        {loading ? <div className="content-loading"><span className="button-spinner" /> Filling the reading room…</div> : filtered.length ? <div className="library-grid">{filtered.map((item, index) => <article className={`library-card library-card-${index % 4}`} key={item.id}><div className="library-card-art"><span className="library-art-label">{item.itemType.toUpperCase()}</span><span className="library-art-orbit" /><span className="library-art-block block-one" /><span className="library-art-block block-two" /><span className="library-art-mark">ن</span></div><div className="library-card-content"><div className="library-card-meta"><span>{item.category}</span><button className="icon-button" onClick={() => void toggleBookmark(item)} aria-label={bookmarks.has(item.id) ? "Remove saved item" : "Save reading item"}>{bookmarks.has(item.id) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button></div><h3>{item.title}</h3><p>{item.description}</p>{readProgress[item.id] > 0 && <div className="library-progress-line"><span style={{ width: `${readProgress[item.id]}%` }} /></div>}<button className="library-read-link" onClick={() => setSelectedId(item.id)}>{readProgress[item.id] >= 100 ? "Read again" : readProgress[item.id] > 0 ? "Continue reading" : "Open material"}<ArrowRight size={15} /></button></div></article>)}</div> : <div className="empty-state"><Search size={23} /><h3>No reading materials found</h3><p>Try another topic or clear your search.</p><button className="button button-soft" onClick={() => { setQuery(""); setSearchInput(""); setCategory("All materials"); }}>Clear filters</button></div>}
        <div className="library-integrity-note"><span>✓</span><p>Every item is a short original Noor editorial note or guide. Religious references are listed for traceability; these materials are not fatwas or scholarly editions.</p></div>
      </> : <article className="library-reader page-enter"><div className="library-reader-toolbar"><button className="back-link" onClick={() => setSelectedId(null)}><ArrowLeft size={16} /> Back to shelf</button><div><button className="button button-outline" onClick={() => void toggleBookmark(current)}>{bookmarks.has(current.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{bookmarks.has(current.id) ? "Saved" : "Save"}</button><button className="button button-soft" onClick={() => { saveProgress(100); if (readerRef.current) readerRef.current.scrollTo({ top: readerRef.current.scrollHeight, behavior: "smooth" }); }}><Check size={15} /> Mark read</button></div></div><div className="library-reader-layout"><aside className="library-reader-aside"><div className="reader-item-icon"><BookOpenText size={23} /></div><span className="eyebrow">{current.itemType.toUpperCase()}</span><h2>{current.title}</h2><p>{current.description}</p><div className="library-reader-progress"><div><span>Reading progress</span><strong>{readProgress[current.id] ?? 0}%</strong></div><div className="micro-progress"><span style={{ width: `${readProgress[current.id] ?? 0}%` }} /></div></div><div className="library-reader-source"><span className="eyebrow">SOURCE</span><p>{current.source}</p></div><button className="text-button" onClick={() => void toggleBookmark(current)}>{bookmarks.has(current.id) ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}{bookmarks.has(current.id) ? "Remove bookmark" : "Save for later"}</button></aside><div className="library-reader-body" ref={readerRef} onScroll={handleScroll}><div className="library-reader-header"><span className="library-reader-category">{current.category} <i /> {current.itemType}</span><h1>{current.title}<span className="heading-period">.</span></h1><p>{current.description}</p><div className="library-reading-meta"><span><Clock3 size={14} /> 4 minute read</span><span>{saving ? "Saving…" : "Progress saves as you read"}</span></div></div><div className="library-text-content">{renderLibraryText(current.content)}</div><div className="library-endnote"><span className="endnote-mark">✳</span><p>You’ve reached the end of this Noor study note. Keep its references close and bring deeper questions to a qualified teacher.</p></div><button className="button button-primary library-finish" onClick={() => { saveProgress(100); setSelectedId(null); }}>Finish reading <Check size={16} /></button><div className="library-next"><span className="eyebrow">ON THE SHELF</span><h3>More to explore</h3><button onClick={() => { setSelectedId(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Browse all materials <ChevronRight size={15} /></button></div></div></div></article>}
    </div>
  );
}
