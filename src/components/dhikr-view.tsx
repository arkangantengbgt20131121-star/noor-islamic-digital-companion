"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  CircleDot,
  History,
  Minus,
  Plus,
  RotateCcw,
  Sparkles,
  Undo2,
  Volume2,
  VolumeX,
  Vibrate,
  X,
} from "lucide-react";
import { apiFetch } from "@/lib/http";
import { localDateKey } from "@/lib/date";
import { LOCAL_KEYS } from "@/lib/client-data";
import type { AppUser, DhikrItem, DhikrProgress } from "@/lib/types";

type Props = { user: AppUser | null; onSignIn: () => void; onProgressChange: () => Promise<void>; onUserChange: (user: AppUser) => void };
type ProgressMap = Record<string, { count: number; target: number }>;
type ApiResult = { items: DhikrItem[]; progress: DhikrProgress[]; history: DhikrProgress[]; signedIn: boolean };
type LocalDhikr = Record<string, ProgressMap>;

const CATEGORIES = ["All remembrances", "Dzikir pagi", "Dzikir petang", "Dzikir setelah shalat", "Istighfar", "Shalawat", "Tasbih, tahmid & takbir", "Custom dzikir"];
const LOCAL_CUSTOM_KEY = "noor-custom-dhikr-v1";

function readLocal(): LocalDhikr {
  try {
    return JSON.parse(window.localStorage.getItem(LOCAL_KEYS.dhikr) ?? "{}") as LocalDhikr;
  } catch {
    return {};
  }
}

function Ring({ percent }: { percent: number }) {
  const length = 2 * Math.PI * 78;
  return <svg className="dhikr-ring" viewBox="0 0 188 188" aria-hidden="true"><circle className="dhikr-ring-track" cx="94" cy="94" r="78" /><circle className="dhikr-ring-progress" cx="94" cy="94" r="78" style={{ strokeDasharray: length, strokeDashoffset: length * (1 - Math.min(percent, 100) / 100) }} /><circle className="dhikr-ring-glint" cx="94" cy="94" r="67" /></svg>;
}

export function DhikrView({ user, onSignIn, onProgressChange, onUserChange }: Props) {
  const [items, setItems] = useState<DhikrItem[]>([]);
  const [progress, setProgress] = useState<ProgressMap>({});
  const [history, setHistory] = useState<DhikrProgress[]>([]);
  const [selectedId, setSelectedId] = useState("subhanallah");
  const [category, setCategory] = useState("All remembrances");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [soundEnabled, setSoundEnabled] = useState(user?.profile.soundEnabled ?? false);
  const [vibrationEnabled, setVibrationEnabled] = useState(user?.profile.vibrationEnabled ?? false);
  const [showCustom, setShowCustom] = useState(false);
  const [customForm, setCustomForm] = useState({ title: "", arabicText: "", transliteration: "", translation: "" });
  const [savingCustom, setSavingCustom] = useState(false);
  const [customError, setCustomError] = useState("");
  const [loaded, setLoaded] = useState(false);
  const audioContext = useRef<AudioContext | null>(null);
  const localHistory = useMemo(() => {
    if (typeof window === "undefined") return [];
    const stored = readLocal();
    return Object.entries(stored).map(([date, entries]) => ({ progressDate: date, count: Object.values(entries).reduce((sum, item) => sum + item.count, 0) })).sort((a, b) => b.progressDate.localeCompare(a.progressDate)).slice(0, 7);
  }, [progress]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError("");
    apiFetch<ApiResult>(`/api/dhikr?date=${localDateKey()}`)
      .then((data) => {
        if (!active) return;
        setItems(data.items);
        const current: ProgressMap = {};
        data.progress.forEach((item) => { current[item.dhikrId] = { count: item.count, target: item.target }; });
        if (!user) {
          const local = readLocal()[localDateKey()] ?? {};
          Object.assign(current, local);
          try {
            const localCustom = JSON.parse(window.localStorage.getItem(LOCAL_CUSTOM_KEY) ?? "[]") as DhikrItem[];
            const customIds = new Set(data.items.map((item) => item.id));
            setItems([...data.items, ...localCustom.filter((item) => !customIds.has(item.id))]);
          } catch {
            // Keep the server-sourced catalogue if local custom data is malformed.
          }
        }
        setProgress(current);
        setHistory(data.history);
        if (data.items.length && !data.items.some((item) => item.id === selectedId)) setSelectedId(data.items[0].id);
        setSoundEnabled(user?.profile.soundEnabled ?? false);
        setVibrationEnabled(user?.profile.vibrationEnabled ?? false);
        setLoaded(true);
      })
      .catch((error) => {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : "Dhikr could not be loaded.");
        setLoaded(true);
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user, selectedId]);

  const selected = items.find((item) => item.id === selectedId) ?? items[0];
  const selectedProgress = selected ? progress[selected.id] ?? { count: 0, target: selected.defaultTarget || 33 } : { count: 0, target: 33 };
  const count = selectedProgress.count;
  const target = selectedProgress.target;
  const percent = Math.min(100, (count / Math.max(1, target)) * 100);
  const filteredItems = category === "All remembrances" ? items : items.filter((item) => item.category === category);
  const dailyTotal = Object.values(progress).reduce((sum, item) => sum + item.count, 0);
  const todaysProgress = user ? history.filter((item) => item.progressDate === localDateKey()) : [];
  const chartHistory = user ? history : localHistory;
  const byDay = chartHistory.reduce<Record<string, number>>((map, row) => {
    map[row.progressDate] = (map[row.progressDate] ?? 0) + row.count;
    return map;
  }, {});
  const maxHistory = Math.max(1, ...Object.values(byDay));

  useEffect(() => {
    if (!loaded || !selected || !user) {
      if (loaded && selected && !user) {
        const all = readLocal();
        all[localDateKey()] = { ...all[localDateKey()], ...progress };
        window.localStorage.setItem(LOCAL_KEYS.dhikr, JSON.stringify(all));
      }
      return;
    }
    const current = progress[selected.id] ?? { count: 0, target: selected.defaultTarget || 33 };
    const timeout = window.setTimeout(() => {
      void apiFetch("/api/dhikr", {
        method: "POST",
        body: JSON.stringify({ action: "progress", dhikrId: selected.id, count: current.count, target: current.target, date: localDateKey() }),
      }).then(() => { void onProgressChange(); }).catch((error) => {
        setLoadError(error instanceof Error ? error.message : "The count could not be synced.");
      });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [loaded, onProgressChange, progress, selected, user]);

  const update = (nextCount: number, nextTarget = target) => {
    if (!selected) return;
    setProgress((current) => ({ ...current, [selected.id]: { count: Math.max(0, Math.min(100000, nextCount)), target: Math.max(1, Math.min(100000, nextTarget)) } }));
  };

  const tapSound = () => {
    if (soundEnabled) {
      try {
        const AudioContextConstructor = window.AudioContext;
        audioContext.current ??= new AudioContextConstructor();
        const oscillator = audioContext.current.createOscillator();
        const gain = audioContext.current.createGain();
        oscillator.frequency.value = 680;
        oscillator.type = "sine";
        gain.gain.setValueAtTime(0.035, audioContext.current.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audioContext.current.currentTime + 0.08);
        oscillator.connect(gain);
        gain.connect(audioContext.current.destination);
        oscillator.start();
        oscillator.stop(audioContext.current.currentTime + 0.08);
      } catch {
        // Audio is optional and may be unavailable in a restricted browser.
      }
    }
    if (vibrationEnabled && "vibrate" in navigator) navigator.vibrate(12);
  };

  const changePreference = async (kind: "soundEnabled" | "vibrationEnabled", next: boolean) => {
    if (kind === "soundEnabled") setSoundEnabled(next);
    else setVibrationEnabled(next);
    const saved = JSON.parse(window.localStorage.getItem("noor-dhikr-preferences") ?? "{}") as Record<string, boolean>;
    saved[kind] = next;
    window.localStorage.setItem("noor-dhikr-preferences", JSON.stringify(saved));
    if (user) {
      try {
        const result = await apiFetch<{ user: AppUser }>("/api/auth/me", { method: "PATCH", body: JSON.stringify({ [kind]: next }) });
        onUserChange(result.user);
      } catch { setLoadError("This preference changed on your device but could not sync."); }
    }
  };

  const addCustom = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCustomError("");
    setSavingCustom(true);
    const item: DhikrItem = {
      id: `local_${Date.now()}`,
      title: customForm.title.trim(),
      category: "Custom dzikir",
      arabicText: customForm.arabicText.trim(),
      transliteration: customForm.transliteration.trim(),
      translation: customForm.translation.trim(),
      explanation: "Personal entry added by you.",
      reference: "Personal entry — source not supplied by Noor.",
      defaultTarget: 33,
    };
    try {
      if (user) {
        const result = await apiFetch<{ item: DhikrItem }>("/api/dhikr", { method: "POST", body: JSON.stringify({ action: "custom", ...customForm }) });
        setItems((current) => [result.item, ...current]);
        setSelectedId(result.item.id);
      } else {
        const saved = JSON.parse(window.localStorage.getItem(LOCAL_CUSTOM_KEY) ?? "[]") as DhikrItem[];
        const next = [item, ...saved];
        window.localStorage.setItem(LOCAL_CUSTOM_KEY, JSON.stringify(next));
        setItems((current) => [item, ...current]);
        setSelectedId(item.id);
      }
      setCustomForm({ title: "", arabicText: "", transliteration: "", translation: "" });
      setShowCustom(false);
    } catch (error) {
      setCustomError(error instanceof Error ? error.message : "The custom dhikr could not be saved.");
    } finally {
      setSavingCustom(false);
    }
  };

  const selectItem = (item: DhikrItem) => {
    setSelectedId(item.id);
    setCategory(item.category);
  };

  return (
    <div className="dhikr-page page-enter">
      <div className="page-heading"><div><p className="eyebrow">A MOMENT FOR THE HEART</p><h1>Dhikr, at your pace<span className="heading-period">.</span></h1><p className="page-subtitle">A quiet counter for your own remembrance. Choose a dhikr, set an intention, and begin.</p></div><div className="dhikr-heading-actions"><button className={`icon-button setting-toggle ${soundEnabled ? "setting-on" : ""}`} title={soundEnabled ? "Turn sound off" : "Turn sound on"} aria-label={soundEnabled ? "Turn sound off" : "Turn sound on"} onClick={() => void changePreference("soundEnabled", !soundEnabled)}>{soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className={`icon-button setting-toggle ${vibrationEnabled ? "setting-on" : ""}`} title={vibrationEnabled ? "Turn vibration off" : "Turn vibration on"} aria-label={vibrationEnabled ? "Turn vibration off" : "Turn vibration on"} onClick={() => void changePreference("vibrationEnabled", !vibrationEnabled)}><Vibrate size={18} /></button><button className="button button-soft" onClick={() => setShowCustom(true)}><Plus size={16} /> Add custom</button></div></div>
      {!user && <div className="guest-saved-note"><Sparkles size={16} /><span>Guest mode saves counts on this device only.</span><button onClick={onSignIn}>Create an account to sync <span>↗</span></button></div>}
      {loadError && <div className="inline-alert" role="status">{loadError}<button onClick={() => setLoadError("")} aria-label="Dismiss"><X size={14} /></button></div>}
      <div className="dhikr-layout">
        <aside className="dhikr-library-panel">
          <div className="panel-heading"><div><p className="eyebrow">YOUR COLLECTION</p><h2>Remembrances</h2></div><span className="count-pill">{items.length}</span></div>
          <div className="category-scroll" aria-label="Dhikr categories">{CATEGORIES.map((item) => <button key={item} className={`category-chip ${category === item ? "category-chip-active" : ""}`} onClick={() => setCategory(item)}>{item === "All remembrances" ? "All" : item}</button>)}</div>
          <div className="dhikr-list">{loading ? <div className="loading-inline"><span className="button-spinner" /> Loading your collection…</div> : loadError && !items.length ? <div className="empty-inline">{loadError}<button className="text-button" onClick={() => window.location.reload()}>Try again</button></div> : filteredItems.length ? filteredItems.map((item) => {
            const itemProgress = progress[item.id] ?? { count: 0, target: item.defaultTarget };
            return <button key={item.id} className={`dhikr-list-item ${item.id === selected?.id ? "dhikr-list-item-active" : ""}`} onClick={() => selectItem(item)}><span className="list-item-arabic" lang="ar" dir="rtl">{item.arabicText || "—"}</span><span className="list-item-copy"><strong>{item.title}</strong><small>{item.category}</small></span><span className="list-item-count">{itemProgress.count}<small>/{itemProgress.target}</small></span></button>;
          }) : <div className="empty-category"><CircleDot size={22} /><strong>No sourced preset in this category yet</strong><p>Add a personal remembrance or choose one with a cited reference.</p><button onClick={() => setShowCustom(true)}>Add a personal entry <Plus size={14} /></button></div>}</div>
          <div className="sourced-note"><span className="source-bullet" /><p>Preset entries include a reference. Personal entries are labeled separately and are not verified by Noor.</p></div>
        </aside>

        <section className="tasbih-panel" aria-label="Digital dhikr counter">
          <div className="tasbih-topline"><span className="soft-label"><span className="live-dot" /> {localDateKey()}</span><span className="today-total"><Sparkles size={14} /> {dailyTotal} today</span></div>
          {loading && !selected ? <div className="counter-loading"><span className="button-spinner" /> Setting up your counter…</div> : selected ? <>
            <div className="tasbih-name"><span className="eyebrow">{selected.category.toUpperCase()}</span><h2>{selected.title}</h2></div>
            <div className="tasbih-arabic" lang="ar" dir="rtl">{selected.arabicText || <span className="arabic-empty">Add Arabic text to your personal entry</span>}</div>
            {selected.transliteration && <p className="tasbih-transliteration">{selected.transliteration}</p>}
            <p className="tasbih-translation">{selected.translation}</p>
            <button className="counter-circle" onClick={() => { update(count + 1); tapSound(); }} aria-label={`Count one ${selected.title}. Current count ${count}.`}>
              <Ring percent={percent} /><span className="counter-circle-content"><strong>{count}</strong><small>{count >= target ? "Goal reached" : `${Math.max(target - count, 0)} to your goal`}</small></span>
            </button>
            <div className="target-control"><span>Today's intention</span><div className="target-stepper"><button onClick={() => update(count, Math.max(1, target - 1))} aria-label="Decrease target"><Minus size={14} /></button><label><input aria-label="Dhikr target" type="number" min={1} max={100000} value={target} onChange={(event) => update(count, Number(event.target.value) || 1)} /><span>repetitions</span></label><button onClick={() => update(count, Math.min(100000, target + 1))} aria-label="Increase target"><Plus size={14} /></button></div></div>
            <div className="counter-controls"><button className="counter-control-button" disabled={count === 0} onClick={() => update(Math.max(0, count - 1))}><Undo2 size={16} /> Undo</button><button className="counter-reset-button" onClick={() => update(0)}><RotateCcw size={15} /> Reset</button><button className="counter-control-button counter-plus" onClick={() => { update(count + 1); tapSound(); }} aria-label="Add one"><Plus size={18} /></button></div>
            <div className="completion-message" aria-live="polite">{count >= target ? <><Check size={15} /> Intention complete. You can continue or begin again.</> : <span>Tap the circle or + to count with care.</span>}</div>
            <div className="dhikr-detail"><p className="eyebrow">MEANING & SOURCE</p><p>{selected.explanation}</p><small>{selected.reference}</small></div>
          </> : <div className="empty-category counter-empty"><Sparkles size={26} /><h2>Choose a remembrance</h2><p>Select an item from your collection or add a personal entry.</p></div>}
        </section>

        <aside className="dhikr-history-panel">
          <div className="panel-heading"><div><p className="eyebrow">YOUR PRACTICE</p><h2>Recent days</h2></div><History size={18} className="history-heading-icon" /></div>
          {chartHistory.length ? <div className="history-bars">{Object.entries(byDay).slice(0, 7).reverse().map(([date, value]) => <div className="history-bar-column" key={date}><div className="history-bar-wrap"><span className="history-bar-value">{value}</span><span className={`history-bar ${date === localDateKey() ? "history-bar-today" : ""}`} style={{ height: `${Math.max(6, (value / maxHistory) * 100)}%` }} /></div><small>{new Intl.DateTimeFormat(user?.profile.preferredLanguage === "en" ? "en-US" : "id-ID", { day: "numeric", month: "short" }).format(new Date(`${date}T12:00:00`))}</small></div>)}</div> : <div className="history-empty"><span className="history-empty-icon"><History size={19} /></span><strong>Your rhythm will appear here</strong><p>Your daily count stays private. Come back tomorrow to see your history grow.</p></div>}
          <div className="history-total"><span>Total today</span><strong>{dailyTotal.toLocaleString()}</strong><small>{todaysProgress.length || Object.keys(progress).filter((key) => progress[key]?.count).length} remembrance{(todaysProgress.length || Object.keys(progress).filter((key) => progress[key]?.count).length) === 1 ? "" : "s"}</small></div>
          <div className="reminder-note"><span className="reminder-spark">✳</span><p>Keep your own pace. This counter is a personal aid, not a measure of faith.</p></div>
        </aside>
      </div>
      {showCustom && <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowCustom(false); }}><section className="custom-dhikr-modal" role="dialog" aria-modal="true" aria-labelledby="custom-dhikr-title"><button className="icon-button modal-close" onClick={() => setShowCustom(false)} aria-label="Close"><X size={19} /></button><span className="auth-mark custom-mark"><CircleDot size={20} /></span><p className="eyebrow">YOUR PERSONAL COLLECTION</p><h2 id="custom-dhikr-title">Add a remembrance</h2><p className="page-subtitle">Add text and a meaning for your own use. Noor does not verify personal entries.</p><form className="auth-form" onSubmit={addCustom}><label className="field-label">Name<input required minLength={2} maxLength={120} value={customForm.title} onChange={(event) => setCustomForm({ ...customForm, title: event.target.value })} placeholder="A name for this dhikr" /></label><label className="field-label">Arabic text <span className="field-optional">optional</span><input dir="rtl" lang="ar" value={customForm.arabicText} onChange={(event) => setCustomForm({ ...customForm, arabicText: event.target.value })} placeholder="النص العربي" /></label><label className="field-label">Transliteration <span className="field-optional">optional</span><input value={customForm.transliteration} onChange={(event) => setCustomForm({ ...customForm, transliteration: event.target.value })} placeholder="Transliteration" /></label><label className="field-label">Meaning / translation<textarea required rows={2} maxLength={500} value={customForm.translation} onChange={(event) => setCustomForm({ ...customForm, translation: event.target.value })} placeholder="What this means to you" /></label>{customError && <p className="form-alert form-alert-error">{customError}</p>}<div className="form-actions"><button type="button" className="button button-quiet" onClick={() => setShowCustom(false)}>Cancel</button><button type="submit" className="button button-primary" disabled={savingCustom}>{savingCustom ? "Saving…" : "Save remembrance"}</button></div></form></section></div>}
    </div>
  );
}
