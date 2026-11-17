"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpenText,
  Bookmark,
  BookmarkCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CirclePlay,
  History,
  ListFilter,
  LoaderCircle,
  Minus,
  Moon,
  Pause,
  Play,
  Plus,
  Search,
  Sun,
  Volume2,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/http";
import { LOCAL_KEYS } from "@/lib/client-data";
import type { AppBookmark, AppUser, QuranAyah, QuranData, QuranSearchResult, QuranSurah } from "@/lib/types";

type Props = { user: AppUser | null; initialSearch?: string; initialReference?: string; onSignIn: () => void; onUserChange: (user: AppUser) => void };
type ReaderProgress = { contentType: string; contentId: string; progress: number; position: number; updatedAt?: string };

function readLocalBookmarks(): AppBookmark[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(LOCAL_KEYS.bookmarks) ?? "[]") as AppBookmark[]; }
  catch { return []; }
}

export function QuranView({ user, initialSearch = "", initialReference = "", onSignIn, onUserChange }: Props) {
  const [surahs, setSurahs] = useState<QuranSurah[]>([]);
  const [selectedSurah, setSelectedSurah] = useState(1);
  const [data, setData] = useState<QuranData | null>(null);
  const [selectedAyah, setSelectedAyah] = useState(1);
  const [surahFilter, setSurahFilter] = useState("");
  const [query, setQuery] = useState(initialSearch);
  const [searchResults, setSearchResults] = useState<QuranSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingSurahs, setLoadingSurahs] = useState(true);
  const [loadingText, setLoadingText] = useState(false);
  const [error, setError] = useState("");
  const [language, setLanguage] = useState(user?.profile.preferredLanguage === "en" ? "en" : "id");
  const [showTranslation, setShowTranslation] = useState(user?.profile.showTranslation ?? true);
  const [fontSize, setFontSize] = useState(user?.profile.arabicFontSize ?? 34);
  const [readerDark, setReaderDark] = useState(false);
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [readingHistory, setReadingHistory] = useState<ReaderProgress[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [playingAyah, setPlayingAyah] = useState<number | null>(null);
  const [restored, setRestored] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const current = surahs.find((surah) => surah.number === selectedSurah);
  const filteredSurahs = useMemo(() => {
    const value = surahFilter.trim().toLowerCase();
    return value ? surahs.filter((surah) => `${surah.number} ${surah.name} ${surah.englishName} ${surah.englishNameTranslation}`.toLowerCase().includes(value)) : surahs;
  }, [surahFilter, surahs]);

  useEffect(() => {
    let active = true;
    apiFetch<{ surahs: QuranSurah[] }>("/api/quran/surahs")
      .then(({ surahs: items }) => { if (active) setSurahs(items); })
      .catch((caught) => { if (active) setError(caught instanceof Error ? caught.message : "The surah list could not be loaded."); })
      .finally(() => { if (active) setLoadingSurahs(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!surahs.length) return;
    let active = true;
    setLoadingText(true);
    setError("");
    apiFetch<QuranData>(`/api/quran/surah/${selectedSurah}?language=${language}`)
      .then((chapter) => { if (active) setData(chapter); })
      .catch((caught) => { if (active) { setData(null); setError(caught instanceof Error ? caught.message : "This surah could not be loaded."); } })
      .finally(() => { if (active) setLoadingText(false); });
    return () => { active = false; };
  }, [selectedSurah, language, surahs.length]);

  useEffect(() => {
    setLanguage(user?.profile.preferredLanguage === "en" ? "en" : "id");
    setShowTranslation(user?.profile.showTranslation ?? true);
    setFontSize(user?.profile.arabicFontSize ?? 34);
  }, [user]);

  useEffect(() => {
    let active = true;
    if (!user) {
      setBookmarks(new Set(readLocalBookmarks().filter((item) => item.type === "quran").map((item) => item.contentId)));
      try {
        const local = JSON.parse(window.localStorage.getItem("noor-local-reading-v1") ?? "{}") as Record<string, { progress: number; position: number }>;
        const history = Object.entries(local).filter(([key]) => key.startsWith("quran:")).map(([key, value]) => ({ contentType: "quran", contentId: key.slice(6), progress: value.progress, position: value.position }));
        setReadingHistory(history.reverse());
        const last = history[history.length - 1];
        if (last) {
          const number = Number(last.contentId);
          if (Number.isInteger(number) && number >= 1 && number <= 114) {
            setSelectedSurah(number);
            setSelectedAyah(Math.max(1, last.position));
          }
        }
      } catch {
        setReadingHistory([]);
      }
      setRestored(true);
      return () => { active = false; };
    }
    setRestored(false);
    Promise.all([
      apiFetch<{ bookmarks: AppBookmark[] }>("/api/bookmarks"),
      apiFetch<{ progress: ReaderProgress[] }>("/api/reading-progress"),
    ]).then(([saved, reading]) => {
      if (!active) return;
      setBookmarks(new Set(saved.bookmarks.filter((item) => item.type === "quran").map((item) => item.contentId)));
      const history = reading.progress.filter((item) => item.contentType === "quran");
      setReadingHistory(history);
      const last = history[0];
      if (last) {
        const number = Number(last.contentId);
        if (Number.isInteger(number) && number >= 1 && number <= 114) {
          setSelectedSurah(number);
          setSelectedAyah(Math.max(1, last.position));
        }
      }
    }).catch(() => {
      setBookmarks(new Set());
      setReadingHistory([]);
    }).finally(() => { if (active) setRestored(true); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    const match = initialReference.match(/^(\\d{1,3}):(\\d{1,3})$/);
    if (!match) return;
    const surahNumber = Number(match[1]);
    const ayahNumber = Number(match[2]);
    if (surahNumber >= 1 && surahNumber <= 114 && ayahNumber >= 1) {
      setSelectedSurah(surahNumber);
      setSelectedAyah(ayahNumber);
      setSearchResults([]);
    }
  }, [initialReference]);

  useEffect(() => {
    if (!initialSearch) return;
    setQuery(initialSearch);
    void performSearch(initialSearch);
    // Search only when the shell sends a new query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSearch]);

  useEffect(() => {
    if (!data || !restored) return;
    const progress = Math.min(100, Math.round((selectedAyah / Math.max(1, data.ayahCount)) * 100));
    if (user) {
      const timer = window.setTimeout(() => {
        void apiFetch("/api/reading-progress", {
          method: "POST",
          body: JSON.stringify({ contentType: "quran", contentId: String(data.number), progress, position: selectedAyah }),
        }).catch(() => undefined);
      }, 450);
      return () => window.clearTimeout(timer);
    }
    const stored = JSON.parse(window.localStorage.getItem("noor-local-reading-v1") ?? "{}") as Record<string, { progress: number; position: number }>;
    stored[`quran:${data.number}`] = { progress, position: selectedAyah };
    window.localStorage.setItem("noor-local-reading-v1", JSON.stringify(stored));
  }, [data, selectedAyah, user, restored]);

  useEffect(() => {
    if (!data) return;
    const target = document.getElementById(`ayah-${selectedAyah}`);
    if (target && selectedAyah > 1) target.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [data, selectedAyah]);

  const performSearch = async (value: string) => {
    const searchTerm = value.trim();
    if (searchTerm.length < 2) return;
    setSearching(true);
    setError("");
    try {
      const result = await apiFetch<{ results: QuranSearchResult[] }>(`/api/quran/search?q=${encodeURIComponent(searchTerm)}&language=${language}`);
      setSearchResults(result.results);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Search could not be completed.");
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const saveBookmark = async (ayah: QuranAyah) => {
    const contentId = `${selectedSurah}:${ayah.number}`;
    const alreadySaved = bookmarks.has(contentId);
    const next = new Set(bookmarks);
    if (alreadySaved) next.delete(contentId); else next.add(contentId);
    setBookmarks(next);
    try {
      if (user) {
        await apiFetch("/api/bookmarks", {
          method: alreadySaved ? "DELETE" : "POST",
          body: JSON.stringify({ type: "quran", contentId }),
        });
      } else {
        const stored = readLocalBookmarks().filter((item) => !(item.type === "quran" && item.contentId === contentId));
        if (!alreadySaved) stored.unshift({ type: "quran", contentId, title: `Qur'an · ${current?.englishName ?? `Surah ${selectedSurah}`} ${ayah.number}`, description: ayah.translation, createdAt: new Date().toISOString() });
        window.localStorage.setItem(LOCAL_KEYS.bookmarks, JSON.stringify(stored));
      }
    } catch {
      setBookmarks(bookmarks);
      setError("This bookmark could not be saved. Please sign in again and retry.");
    }
  };

  const selectSearchResult = (result: QuranSearchResult) => {
    setSelectedSurah(result.surah.number);
    setSelectedAyah(result.numberInSurah);
    setSearchResults([]);
    setQuery("");
    setSurahFilter("");
  };

  const playAudio = async (ayah: QuranAyah) => {
    if (!ayah.audio) {
      setError("Recitation audio is not available for this ayah from the selected source.");
      return;
    }
    if (playingAyah === ayah.number && audioRef.current) {
      audioRef.current.pause();
      setPlayingAyah(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(ayah.audio);
    audioRef.current = audio;
    setPlayingAyah(ayah.number);
    audio.onended = () => setPlayingAyah(null);
    audio.onerror = () => { setPlayingAyah(null); setError("Audio could not be played. Please try again."); };
    try { await audio.play(); } catch { setPlayingAyah(null); setError("Audio could not be played in this browser."); }
  };

  const changePreference = useCallback(async (patch: { showTranslation?: boolean; arabicFontSize?: number; preferredLanguage?: "id" | "en" }) => {
    try {
      const result = await apiFetch<{ user: AppUser }>("/api/auth/me", { method: "PATCH", body: JSON.stringify(patch) });
      onUserChange(result.user);
    } catch {
      window.localStorage.setItem("noor-quran-preferences", JSON.stringify({ language, showTranslation, fontSize, ...patch }));
    }
  }, [fontSize, language, onUserChange, showTranslation]);

  const prevSurah = () => { if (selectedSurah > 1) { setSelectedSurah((number) => number - 1); setSelectedAyah(1); } };
  const nextSurah = () => { if (selectedSurah < 114) { setSelectedSurah((number) => number + 1); setSelectedAyah(1); } };

  return (
    <div className="quran-page page-enter">
      <div className="page-heading quran-heading"><div><p className="eyebrow">AL-QUR'AN AL-KARIM</p><h1>A place to return<span className="heading-period">.</span></h1><p className="page-subtitle">Read the Arabic text with a clearly identified translation and source.</p></div><div className="quran-controls"><button className={`icon-button setting-toggle ${readerDark ? "setting-on" : ""}`} onClick={() => setReaderDark((value) => !value)} title={readerDark ? "Switch to light reading" : "Switch to dark reading"} aria-label={readerDark ? "Switch to light reading" : "Switch to dark reading"}>{readerDark ? <Sun size={18} /> : <Moon size={18} />}</button><button className={`button ${showTranslation ? "button-soft" : "button-outline"}`} onClick={() => { const next = !showTranslation; setShowTranslation(next); void changePreference({ showTranslation: next }); }}>{showTranslation ? "Translation on" : "Arabic only"}</button></div></div>
      <div className="quran-workspace">
        <aside className="surah-panel">
          <div className="surah-panel-header"><div><p className="eyebrow">THE CHAPTERS</p><h2>Surah index <span>{surahs.length || "—"}</span></h2></div><ListFilter size={17} /></div>
          <div className="surah-tabs"><button className={!historyOpen ? "surah-tab surah-tab-active" : "surah-tab"} onClick={() => setHistoryOpen(false)}>All chapters</button><button className={historyOpen ? "surah-tab surah-tab-active" : "surah-tab"} onClick={() => setHistoryOpen(true)}><History size={13} /> Recently read</button></div>
          {!historyOpen && <label className="surah-search"><Search size={16} /><input value={surahFilter} onChange={(event) => setSurahFilter(event.target.value)} placeholder="Find a surah" aria-label="Filter surahs" /><kbd>/</kbd></label>}
          <div className="surah-list" role="listbox" aria-label={historyOpen ? "Reading history" : "Select a surah"}>{loadingSurahs ? <div className="loading-inline"><LoaderCircle size={16} className="spin" /> Loading chapters…</div> : historyOpen ? readingHistory.length ? readingHistory.map((item) => { const chapter = surahs.find((surah) => surah.number === Number(item.contentId)); if (!chapter) return null; return <button key={item.contentId} role="option" aria-selected={chapter.number === selectedSurah} className={`surah-row ${chapter.number === selectedSurah ? "surah-row-active" : ""}`} onClick={() => { setSelectedSurah(chapter.number); setSelectedAyah(Math.max(1, item.position)); setHistoryOpen(false); }}><span className="surah-number">{chapter.number}</span><span className="surah-row-names"><strong>{chapter.englishName}</strong><small>Ayah {item.position} · {item.progress}% read</small></span><History size={14} className="history-row-icon" /></button>; }) : <div className="empty-inline">Your recently read chapters will appear here.</div> : filteredSurahs.map((surah) => <button key={surah.number} role="option" aria-selected={surah.number === selectedSurah} className={`surah-row ${surah.number === selectedSurah ? "surah-row-active" : ""}`} onClick={() => { setSelectedSurah(surah.number); setSelectedAyah(1); setSearchResults([]); }}><span className="surah-number">{surah.number}</span><span className="surah-row-names"><strong>{surah.englishName}</strong><small>{surah.englishNameTranslation}</small></span><span className="surah-arabic-name" lang="ar" dir="rtl">{surah.name}</span></button>)}{!loadingSurahs && !historyOpen && !filteredSurahs.length && <div className="empty-inline">No surah matches that search.</div>}</div>
          <div className="surah-panel-footer"><span className="quran-source-dot" /> Source: AlQuran.cloud</div>
        </aside>
        <section className={`reader-panel ${readerDark ? "reader-dark" : ""}`}>
          <div className="reader-search-row"><form className="reader-search" onSubmit={(event) => { event.preventDefault(); void performSearch(query); }}><Search size={17} /><input ref={searchInputRef} value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === "id" ? "Cari ayat atau kata kunci…" : "Search ayahs or a phrase…"} aria-label="Search Quran" /><button type="submit" disabled={searching} aria-label="Search">{searching ? <LoaderCircle size={17} className="spin" /> : <span>Search</span>}</button></form><label className="language-select"><span className="sr-only">Translation language</span><select value={language} onChange={(event) => { const next = event.target.value as "id" | "en"; setLanguage(next); void changePreference({ preferredLanguage: next }); }}><option value="id">ID</option><option value="en">EN</option></select><ChevronDown size={13} /></label></div>
          {searchResults.length > 0 && <div className="quran-search-results"><div className="search-results-heading"><div><span className="eyebrow">SEARCH RESULTS</span><strong>{searchResults.length} matching ayah{searchResults.length === 1 ? "" : "s"}</strong></div><button className="icon-button" onClick={() => setSearchResults([])} aria-label="Close results"><X size={16} /></button></div>{searchResults.slice(0, 12).map((result) => <button key={`${result.surah.number}:${result.numberInSurah}`} className="quran-search-result" onClick={() => selectSearchResult(result)}><span className="result-reference">{result.surah.englishName} · {result.surah.number}:{result.numberInSurah}</span><span>{result.text}</span><ChevronRight size={15} /></button>)}</div>}
          {error && <div className="inline-alert quran-error" role="alert">{error}<button className="icon-button" onClick={() => setError("")} aria-label="Dismiss"><X size={15} /></button></div>}
          {loadingText ? <div className="reader-loading"><LoaderCircle size={24} className="spin" /><span>Opening this chapter…</span></div> : data ? <div className="reader-scroll-area">
            <div className="surah-title-card"><div className="surah-title-card-top"><span className="surah-medallion">{String(data.number).padStart(3, "0")}</span><span className="surah-meta-pill">{data.revelationType === "Meccan" ? "MECCAN" : "MEDINAN"} <i /> {data.ayahCount} AYAH</span></div><div className="surah-title-names"><div><h2>{data.englishName}</h2><p>{data.englishNameTranslation}</p></div><span className="surah-title-arabic" lang="ar" dir="rtl">{data.name}</span></div><div className="surah-title-footer"><span>Chapter {data.number} of 114</span><span>Translation: {language === "id" ? "Indonesian" : "Saheeh International"}</span></div></div>
            <div className="reader-progress-row"><div className="reader-progress"><span style={{ width: `${Math.min(100, (selectedAyah / data.ayahCount) * 100)}%` }} /></div><span>Ayah {selectedAyah} of {data.ayahCount}</span></div>
            <div className="ayah-list">{data.ayahs.map((ayah) => <article key={ayah.number} id={`ayah-${ayah.number}`} className={`ayah-card ${selectedAyah === ayah.number ? "ayah-card-active" : ""}`} onClick={() => setSelectedAyah(ayah.number)}>
              <div className="ayah-card-top"><span className="ayah-number-badge"><span>{ayah.number}</span></span><div className="ayah-actions"><button className="ayah-action" onClick={(event) => { event.stopPropagation(); void saveBookmark(ayah); }} aria-label={bookmarks.has(`${selectedSurah}:${ayah.number}`) ? "Remove bookmark" : "Bookmark ayah"} title={bookmarks.has(`${selectedSurah}:${ayah.number}`) ? "Remove bookmark" : "Save ayah"}>{bookmarks.has(`${selectedSurah}:${ayah.number}`) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button>{ayah.audio && <button className={`ayah-action ${playingAyah === ayah.number ? "ayah-action-playing" : ""}`} onClick={(event) => { event.stopPropagation(); void playAudio(ayah); }} aria-label={playingAyah === ayah.number ? "Pause recitation" : "Play recitation"} title="Play recitation">{playingAyah === ayah.number ? <Pause size={17} /> : <Play size={17} />}</button>}</div></div>
              <p className="ayah-arabic" lang="ar" dir="rtl" style={{ fontSize: `${fontSize}px` }}>{ayah.arabic}</p>{showTranslation && <p className="ayah-translation">{ayah.translation}</p>}
            </article>)}</div>
            <div className="chapter-pager"><button className="button button-outline" onClick={prevSurah} disabled={selectedSurah <= 1}><ChevronLeft size={16} /> Previous</button><span>{data.englishName}</span><button className="button button-outline" onClick={nextSurah} disabled={selectedSurah >= 114}>Next <ChevronRight size={16} /></button></div>
            <div className="quran-attribution"><Volume2 size={15} /><p><strong>Text source:</strong> AlQuran.cloud, quran-uthmani. <strong>Translation source:</strong> {data.translationSource}. Translations are interpretations of meaning; they are not the Arabic Qur'an.</p></div>
          </div> : <div className="reader-empty"><span className="reader-empty-icon"><BookOpenText size={24} /></span><h2>{error ? "The reader is waiting" : "Choose a chapter"}</h2><p>{error || "Select a surah from the index to begin reading."}</p>{error && <button className="button button-soft" onClick={() => { setError(""); void performSearch(query); }}>Try again</button>}</div>}
          <div className="reader-toolbar" aria-label="Reading controls"><div className="reader-toolbar-label"><span>Arabic size</span><strong>{fontSize}px</strong></div><div className="font-controls"><button className="icon-button" onClick={() => { const next = Math.max(24, fontSize - 2); setFontSize(next); void changePreference({ arabicFontSize: next }); }} aria-label="Decrease Arabic text size"><Minus size={15} /></button><div className="font-size-track"><span style={{ width: `${((fontSize - 24) / 24) * 100}%` }} /></div><button className="icon-button" onClick={() => { const next = Math.min(48, fontSize + 2); setFontSize(next); void changePreference({ arabicFontSize: next }); }} aria-label="Increase Arabic text size"><Plus size={15} /></button></div><div className="reader-toolbar-note">A comfortable reading size for you.</div></div>
        </section>
      </div>
      {!user && <div className="guest-saved-note quran-guest-note"><Bookmark size={16} /><span>Bookmarks and reading position stay on this device in guest mode.</span><button onClick={onSignIn}>Sign in to sync <span>↗</span></button></div>}
    </div>
  );
}
