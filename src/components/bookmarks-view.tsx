"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BookOpenText, Bookmark, GraduationCap, LibraryBig, Search, Sparkles, Trash2 } from "lucide-react";
import { apiFetch } from "@/lib/http";
import { LOCAL_KEYS } from "@/lib/client-data";
import type { AppBookmark, AppUser } from "@/lib/types";
import type { Section } from "@/lib/ui-types";

type Props = { user: AppUser | null; onNavigate: (section: Section, target?: string) => void; onSignIn: () => void };
const FILTERS = ["All saved", "Qur'an", "Learning", "Library"];

function localBookmarks(): AppBookmark[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(LOCAL_KEYS.bookmarks) ?? "[]") as AppBookmark[]; }
  catch { return []; }
}

export function BookmarksView({ user, onNavigate, onSignIn }: Props) {
  const [items, setItems] = useState<AppBookmark[]>([]);
  const [filter, setFilter] = useState("All saved");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [removed, setRemoved] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    if (!user) {
      setItems(localBookmarks());
      setLoading(false);
      return;
    }
    apiFetch<{ bookmarks: AppBookmark[] }>("/api/bookmarks")
      .then(({ bookmarks }) => { if (active) setItems(bookmarks); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "Bookmarks could not be loaded."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  const visible = useMemo(() => items.filter((item) => (filter === "All saved" || (filter === "Qur'an" && item.type === "quran") || (filter === "Learning" && item.type === "lesson") || (filter === "Library" && item.type === "library")) && (!query || `${item.title} ${item.description} ${item.contentId}`.toLowerCase().includes(query.toLowerCase()))), [filter, items, query]);

  const remove = async (item: AppBookmark) => {
    const key = `${item.type}:${item.contentId}`;
    setRemoved(key);
    setItems((current) => current.filter((saved) => !(saved.type === item.type && saved.contentId === item.contentId)));
    try {
      if (user) await apiFetch("/api/bookmarks", { method: "DELETE", body: JSON.stringify({ type: item.type, contentId: item.contentId }) });
      else window.localStorage.setItem(LOCAL_KEYS.bookmarks, JSON.stringify(localBookmarks().filter((saved) => !(saved.type === item.type && saved.contentId === item.contentId))));
    } catch {
      setError("The bookmark could not be removed.");
      setItems((current) => [item, ...current]);
    } finally { setRemoved(null); }
  };

  const open = (item: AppBookmark) => {
    if (item.type === "quran") onNavigate("quran", item.contentId);
    else if (item.type === "lesson") onNavigate("learning", item.contentId);
    else onNavigate("library", item.contentId);
  };

  const icon = (type: AppBookmark["type"]) => type === "quran" ? <BookOpenText size={17} /> : type === "lesson" ? <GraduationCap size={17} /> : <LibraryBig size={17} />;

  return (
    <div className="bookmarks-page page-enter"><div className="page-heading"><div><p className="eyebrow">YOUR PERSONAL COLLECTION</p><h1>Saved for later<span className="heading-period">.</span></h1><p className="page-subtitle">Ayahs, learning notes, and reading materials you’ve kept close.</p></div><div className="bookmark-count-card"><Bookmark size={18} /><strong>{items.length}</strong><span>saved items</span></div></div>
      {!user && <div className="guest-saved-note"><Sparkles size={16} /><span>Guest bookmarks live in your browser on this device.</span><button onClick={onSignIn}>Create an account to sync <span>↗</span></button></div>}
      {error && <div className="inline-alert" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
      <div className="bookmark-tools"><div className="lesson-category-list">{FILTERS.map((item) => <button key={item} className={`category-chip ${filter === item ? "category-chip-active" : ""}`} onClick={() => setFilter(item)}>{item}</button>)}</div><label className="bookmark-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search saved items" aria-label="Search bookmarks" /></label></div>
      {loading ? <div className="content-loading"><span className="button-spinner" /> Gathering your saved items…</div> : visible.length ? <div className="bookmark-list">{visible.map((item) => <article className="bookmark-row" key={`${item.type}:${item.contentId}`}><span className={`bookmark-kind bookmark-kind-${item.type}`}>{icon(item.type)}</span><div className="bookmark-row-copy"><span className="eyebrow">{item.type === "quran" ? "QUR'AN AYAH" : item.type === "lesson" ? "LEARNING NOTE" : "LIBRARY"}</span><h2>{item.title}</h2><p>{item.description || item.contentId}</p><small>Saved {new Intl.DateTimeFormat("en", { day: "numeric", month: "short", year: "numeric" }).format(new Date(item.createdAt))}</small></div><div className="bookmark-row-actions"><button className="button button-soft" onClick={() => open(item)}>Open <ArrowRight size={15} /></button><button className="icon-button remove-bookmark" onClick={() => void remove(item)} disabled={removed === `${item.type}:${item.contentId}`} aria-label="Remove bookmark" title="Remove saved item"><Trash2 size={16} /></button></div></article>)}</div> : <div className="empty-state bookmarks-empty"><span className="empty-bookmark-icon"><Bookmark size={22} /></span><h3>{items.length ? "Nothing in this view" : "Your saved space is ready"}</h3><p>{items.length ? "Try a different filter or search term." : "When you bookmark an ayah, lesson, or reading note, it will be waiting here."}</p>{items.length ? <button className="button button-soft" onClick={() => { setFilter("All saved"); setQuery(""); }}>Show all saved</button> : <button className="button button-primary" onClick={() => onNavigate("quran")}>Explore the Qur'an <ArrowRight size={15} /></button>}</div>}
    </div>
  );
}
