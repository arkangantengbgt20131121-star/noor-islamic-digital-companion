"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Bookmark,
  BookmarkCheck,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  GraduationCap,
  Search,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/http";
import { LOCAL_KEYS } from "@/lib/client-data";
import { LEARNING_CATEGORIES } from "@/lib/content";
import type { AppUser, Lesson, AppBookmark } from "@/lib/types";
import type { Section } from "@/lib/ui-types";

type Props = { user: AppUser | null; onSignIn: () => void; onProgressChange: () => Promise<void>; initialLessonId?: string };
type LessonProgress = { lessonId: string; completionStatus: string };
type ProgressState = Record<string, boolean>;

function renderStudyText(content: string) {
  return content.split("\n").map((line, index) => {
    if (line.startsWith("## ")) return <h3 key={index}>{line.slice(3)}</h3>;
    if (line.startsWith("### ")) return <h4 key={index}>{line.slice(4)}</h4>;
    if (line.startsWith("- ")) return <li key={index}>{line.slice(2)}</li>;
    const numbered = line.match(/^\d+\.\s(.+)/);
    if (numbered) return <li key={index}>{numbered[1]}</li>;
    if (line.trim()) return <p key={index}>{line}</p>;
    return null;
  });
}

function localBookmarks(): AppBookmark[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(window.localStorage.getItem(LOCAL_KEYS.bookmarks) ?? "[]") as AppBookmark[]; }
  catch { return []; }
}

export function LearningView({ user, onSignIn, onProgressChange, initialLessonId }: Props) {
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [progress, setProgress] = useState<ProgressState>({});
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [selectedId, setSelectedId] = useState<string | null>(initialLessonId ?? null);
  const [category, setCategory] = useState("All topics");
  const [query, setQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (initialLessonId) setSelectedId(initialLessonId);
  }, [initialLessonId]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    apiFetch<{ lessons: Lesson[]; progress: LessonProgress[] }>("/api/learning")
      .then((data) => {
        if (!active) return;
        setLessons(data.lessons);
        const current: ProgressState = {};
        data.progress.forEach((item) => { current[item.lessonId] = item.completionStatus === "completed"; });
        if (!user) {
          try { Object.assign(current, JSON.parse(window.localStorage.getItem(LOCAL_KEYS.lessonProgress) ?? "{}") as ProgressState); } catch { /* ignore corrupt local data */ }
        }
        setProgress(current);
        setLoaded(true);
      })
      .catch((caught) => { if (active) { setError(caught instanceof Error ? caught.message : "Learning could not be loaded."); setLoaded(true); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user]);

  useEffect(() => {
    if (!user) {
      setBookmarks(new Set(localBookmarks().filter((item) => item.type === "lesson").map((item) => item.contentId)));
      return;
    }
    apiFetch<{ bookmarks: AppBookmark[] }>("/api/bookmarks").then(({ bookmarks: items }) => setBookmarks(new Set(items.filter((item) => item.type === "lesson").map((item) => item.contentId)))).catch(() => setBookmarks(new Set()));
  }, [user]);

  const filtered = useMemo(() => lessons.filter((lesson) => (category === "All topics" || lesson.category === category) && (!query || `${lesson.title} ${lesson.category} ${lesson.description} ${lesson.content}`.toLowerCase().includes(query.toLowerCase()))), [category, lessons, query]);
  const selected = lessons.find((lesson) => lesson.id === selectedId) ?? null;
  const completedCount = Object.values(progress).filter(Boolean).length;
  const completionPercent = lessons.length ? Math.round((completedCount / lessons.length) * 100) : 0;

  const updateProgress = async (lessonId: string, completed: boolean) => {
    const next = { ...progress, [lessonId]: completed };
    setProgress(next);
    if (!user) {
      window.localStorage.setItem(LOCAL_KEYS.lessonProgress, JSON.stringify(next));
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/learning", { method: "POST", body: JSON.stringify({ lessonId, completed }) });
      await onProgressChange();
    } catch (caught) {
      setProgress(progress);
      setError(caught instanceof Error ? caught.message : "Progress could not be saved.");
    } finally { setSaving(false); }
  };

  const toggleBookmark = async (lesson: Lesson) => {
    const exists = bookmarks.has(lesson.id);
    const next = new Set(bookmarks);
    if (exists) next.delete(lesson.id); else next.add(lesson.id);
    setBookmarks(next);
    try {
      if (user) await apiFetch("/api/bookmarks", { method: exists ? "DELETE" : "POST", body: JSON.stringify({ type: "lesson", contentId: lesson.id }) });
      else {
        const others = localBookmarks().filter((item) => !(item.type === "lesson" && item.contentId === lesson.id));
        if (!exists) others.unshift({ type: "lesson", contentId: lesson.id, title: lesson.title, description: lesson.description, createdAt: new Date().toISOString() });
        window.localStorage.setItem(LOCAL_KEYS.bookmarks, JSON.stringify(others));
      }
    } catch { setBookmarks(bookmarks); setError("This lesson could not be saved."); }
  };

  const answerQuiz = (lessonId: string, index: number, answer: number) => setQuizAnswers((current) => ({ ...current, [`${lessonId}-${index}`]: answer }));

  return (
    <div className="learning-page page-enter">
      {!selected ? <>
        <div className="page-heading"><div><p className="eyebrow">LEARN WITH CARE</p><h1>A path of learning<span className="heading-period">.</span></h1><p className="page-subtitle">Thoughtful introductions, structured lessons, and sources you can follow.</p></div><div className="learning-progress-chip"><span className="learning-progress-icon"><GraduationCap size={18} /></span><div><small>YOUR PROGRESS</small><strong>{completedCount} of {lessons.length || 8} completed</strong></div></div></div>
        {!user && <div className="guest-saved-note"><Sparkles size={16} /><span>Lesson progress and saved lessons are stored on this device.</span><button onClick={onSignIn}>Create an account to sync <span>↗</span></button></div>}
        {error && <div className="inline-alert" role="alert">{error}<button onClick={() => setError("")}>Dismiss</button></div>}
        <section className="learning-path-card"><div className="learning-path-copy"><span className="eyebrow">A STEADY BEGINNING</span><h2>Learn a little.<br /><em>Understand a lot.</em></h2><p>Start with the questions you have. Every lesson includes references, objectives, and a short knowledge check.</p></div><div className="learning-path-progress"><div className="learning-path-progress-top"><span>Learning path</span><strong>{completionPercent}%</strong></div><div className="micro-progress"><span style={{ width: `${completionPercent}%` }} /></div><small>{completedCount ? `${completedCount} lesson${completedCount === 1 ? "" : "s"} completed` : "Your first lesson is waiting"}</small></div><div className="path-orbit" aria-hidden="true"><span /><span /><span /><Sparkles size={22} /></div></section>
        <div className="lesson-tools"><div className="lesson-category-list">{LEARNING_CATEGORIES.map((item) => <button key={item} className={`category-chip ${category === item ? "category-chip-active" : ""}`} onClick={() => setCategory(item)}>{item}</button>)}</div><form className="lesson-search" onSubmit={(event) => { event.preventDefault(); setQuery(searchInput.trim()); }}><Search size={16} /><input value={searchInput} onChange={(event) => { setSearchInput(event.target.value); if (!event.target.value) setQuery(""); }} placeholder="Search lessons" aria-label="Search lessons" /><button type="submit">Search</button></form></div>
        <div className="lesson-results-heading"><div><p className="eyebrow">THE STUDY SHELF</p><h2>{category === "All topics" ? "Explore a topic" : category}</h2></div><span>{filtered.length} lesson{filtered.length === 1 ? "" : "s"}</span></div>
        {loading ? <div className="content-loading"><span className="button-spinner" /> Loading learning materials…</div> : <div className="lesson-grid">{filtered.map((lesson, index) => <article className={`lesson-card lesson-card-${index % 4}`} key={lesson.id}><div className="lesson-card-top"><span className="lesson-category-tag">{lesson.category}</span><button className="icon-button lesson-bookmark" onClick={() => void toggleBookmark(lesson)} aria-label={bookmarks.has(lesson.id) ? "Remove saved lesson" : "Save lesson"}>{bookmarks.has(lesson.id) ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}</button></div><div className="lesson-card-illustration" aria-hidden="true"><span className="lesson-sun" /><span className="lesson-orbit" /><span className="lesson-lines" /></div><div className="lesson-card-body"><h3>{lesson.title}</h3><p>{lesson.description}</p><div className="lesson-card-meta"><span><Clock3 size={13} /> 5 min</span><span><CircleHelp size={13} /> Knowledge check</span></div><button className="lesson-card-link" onClick={() => setSelectedId(lesson.id)}>{progress[lesson.id] ? "Review lesson" : "Begin lesson"}<ArrowRight size={15} /></button></div>{progress[lesson.id] && <span className="lesson-complete-badge"><Check size={12} /> Complete</span>}</article>)}</div>}
        {!loading && !filtered.length && <div className="empty-state"><Search size={24} /><h3>No lessons found</h3><p>Try a different search or choose another learning category.</p><button className="button button-soft" onClick={() => { setQuery(""); setSearchInput(""); setCategory("All topics"); }}>Clear filters</button></div>}
        <div className="learning-integrity-note"><span>i</span><p>These materials are introductory study notes, not fatwas. Religious references are cited for further reading; consult qualified scholars for personal rulings.</p></div>
      </> : <article className="lesson-reading page-enter"><div className="lesson-reading-top"><button className="back-link" onClick={() => setSelectedId(null)}><ArrowLeft size={16} /> All lessons</button><div className="lesson-reading-actions"><button className="button button-outline" onClick={() => void toggleBookmark(selected)}>{bookmarks.has(selected.id) ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}{bookmarks.has(selected.id) ? "Saved" : "Save lesson"}</button><button className={`button ${progress[selected.id] ? "button-complete" : "button-primary"}`} disabled={saving} onClick={() => void updateProgress(selected.id, !progress[selected.id])}>{progress[selected.id] ? <><CheckCircle2 size={16} /> Completed</> : <><Check size={16} /> Mark complete</>}</button></div></div><div className="lesson-reading-header"><span className="lesson-category-tag">{selected.category}</span><p className="eyebrow">A NOOR STUDY NOTE</p><h1>{selected.title}<span className="heading-period">.</span></h1><p className="lesson-reading-description">{selected.description}</p><div className="lesson-reading-meta"><span><Clock3 size={14} /> 5 minute read</span><span><CircleHelp size={14} /> {selected.quiz.length} knowledge check</span></div></div><div className="lesson-reading-layout"><aside className="lesson-objectives"><div className="objectives-icon"><Sparkles size={17} /></div><h3>In this lesson</h3><ul>{selected.objectives.map((objective) => <li key={objective}><Check size={14} /> {objective}</li>)}</ul><div className="objectives-source"><span className="eyebrow">SOURCES</span><p>{selected.source}</p></div></aside><div className="lesson-reading-content"><div className="study-copy">{renderStudyText(selected.content)}</div><section className="knowledge-check"><div className="quiz-heading"><span><CircleHelp size={18} /></span><div><p className="eyebrow">TAKE A MOMENT</p><h2>Knowledge check</h2></div></div>{selected.quiz.map((question, index) => { const key = `${selected.id}-${index}`; const answer = quizAnswers[key]; const checked = answer !== undefined; const correct = checked && answer === question.answerIndex; return <div className="quiz-question" key={key}><h3>{question.question}</h3><div className="quiz-options">{question.options.map((option, optionIndex) => <button key={option} className={`quiz-option ${checked && optionIndex === question.answerIndex ? "quiz-option-correct" : ""} ${checked && answer === optionIndex && !correct ? "quiz-option-wrong" : ""}`} onClick={() => answerQuiz(selected.id, index, optionIndex)} disabled={checked}><span>{String.fromCharCode(65 + optionIndex)}</span>{option}{checked && optionIndex === question.answerIndex && <Check size={15} />}</button>)}</div>{checked && <p className={`quiz-feedback ${correct ? "quiz-feedback-correct" : ""}`}>{correct ? "That’s right. " : "Not quite. "}{question.explanation}</p>}</div>; })}</section><div className="lesson-source-footer"><span className="eyebrow">REFERENCES & SOURCE CARE</span><p>{selected.source}</p><p>Lesson content is an introductory Noor study note. Verify references in the named source and seek qualified instruction where appropriate.</p></div><button className={`button ${progress[selected.id] ? "button-complete" : "button-primary"} lesson-finish-button`} disabled={saving} onClick={() => void updateProgress(selected.id, !progress[selected.id])}>{progress[selected.id] ? <><CheckCircle2 size={16} /> Mark as in progress</> : <><Check size={16} /> Mark lesson complete</>}</button><div className="related-lessons"><p className="eyebrow">CONTINUE EXPLORING</p><h2>Related lessons</h2><div>{lessons.filter((item) => item.id !== selected.id && item.category === selected.category).slice(0, 3).map((lesson) => <button key={lesson.id} onClick={() => { setSelectedId(lesson.id); setQuizAnswers({}); }}><span>{lesson.title}</span><ChevronRight size={15} /></button>)}</div></div></div></div></article>}
    </div>
  );
}
